-- Sanjeevani — Migration: Supabase Auth Email Verification & User Registration Trigger
-- Migration timestamp: 20260813000001

-- ========== TRIGGER FUNCTION FOR NEW USER REGISTRATION ==========

create or replace function public.handle_new_user_registration()
returns trigger as $$
declare
  user_role_val public.user_role;
  user_full_name text;
  user_phone text;
begin
  -- Extract metadata or fallback to defaults
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  user_phone := new.raw_user_meta_data->>'phone';
  
  case lower(coalesce(new.raw_user_meta_data->>'role', 'patient'))
    when 'doctor' then user_role_val := 'doctor'::public.user_role;
    when 'receptionist' then user_role_val := 'receptionist'::public.user_role;
    when 'pharmacist' then user_role_val := 'pharmacist'::public.user_role;
    when 'lab_tech' then user_role_val := 'lab_tech'::public.user_role;
    when 'admin' then user_role_val := 'admin'::public.user_role;
    else user_role_val := 'patient'::public.user_role;
  end case;

  -- 1. Insert into app_users mirroring auth.users
  insert into public.app_users (id, role, full_name, phone)
  values (new.id, user_role_val, user_full_name, user_phone)
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      phone = excluded.phone;

  -- 2. If role is patient, ensure a row exists in patients table
  if user_role_val = 'patient'::public.user_role then
    insert into public.patients (hospital_id, full_name, phone, portal_user_id)
    values (
      coalesce((select hospital_id from public.app_users where id = new.id), '00000000-0000-0000-0000-000000000001'::uuid),
      user_full_name,
      user_phone,
      new.id
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_registration();
