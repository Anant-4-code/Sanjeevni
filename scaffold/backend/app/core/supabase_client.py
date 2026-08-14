"""
Server-side Supabase client. Uses the SERVICE ROLE key so the FastAPI backend
can bypass Row Level Security when needed (e.g. writing verification_logs),
while RLS policies still protect direct frontend access via the anon key.
"""
from functools import lru_cache

from supabase import create_client, Client

from app.core.config import settings


@lru_cache
def get_supabase() -> Client | None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception:
        return None
