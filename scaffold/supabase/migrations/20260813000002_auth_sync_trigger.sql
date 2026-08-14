-- Sanjeevani — Migration: Supabase Auth Sync Trigger to public.users
-- Migration timestamp: 20260813000002

-- 1. Ensure the user_role enum exists (if not created previously)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('receptionist', 'doctor', 'pharmacist', 'lab_tech', 'patient', 'admin');
  end if;
end
$$;

-- 2. Create public.users table as specified by user requirements
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  hospital_id uuid, -- FK to hospitals, nullable initially
  role public.user_role not null default 'patient',
  phone varchar(50),
  email varchar(255) not null,
  full_name varchar(255),
  created_at timestamptz default now()
);

-- 3. Enable RLS on public.users
alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (id = auth.uid());

create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 4. Auth sync trigger function
create or replace function public.sync_auth_user_to_public_users()
returns trigger as $$
declare
  user_role_val public.user_role;
  raw_role_text text;
begin
  raw_role_text := lower(coalesce(new.raw_user_meta_data->>'role', 'patient'));
  
  case raw_role_text
    when 'doctor' then user_role_val := 'doctor'::public.user_role;
    when 'receptionist' then user_role_val := 'receptionist'::public.user_role;
    when 'pharmacist' then user_role_val := 'pharmacist'::public.user_role;
    when 'lab_tech' then user_role_val := 'lab_tech'::public.user_role;
    when 'admin' then user_role_val := 'admin'::public.user_role;
    else user_role_val := 'patient'::public.user_role;
  end case;

  insert into public.users (id, role, phone, email, full_name)
  values (
    new.id,
    user_role_val,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set phone = excluded.phone,
      email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  return new;
end;
$$ language plpgsql security definer;

-- 5. Attach trigger
drop trigger if exists trg_sync_auth_user_to_public_users on auth.users;
create trigger trg_sync_auth_user_to_public_users
  after insert on auth.users
  for each row execute function public.sync_auth_user_to_public_users();
