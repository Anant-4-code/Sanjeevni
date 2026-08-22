"""
Sanjeevani — Settings Service (Spec 15)
=====================================
Manages user preferences, notification settings, language prefs,
AI feature toggles, doctor credentials, and staff availability.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from app.core.supabase_client import get_supabase

# In-memory store for default fallback when Supabase is disconnected
_MEMORY_SETTINGS: Dict[str, Dict[str, Any]] = {}
_MEMORY_CREDENTIALS: Dict[str, Dict[str, Any]] = {
    "doc-sharma-1": {
        "doctor_id": "doc-sharma-1",
        "license_number": "MH-12345-2018",
        "specialty": "Internal Medicine & Endocrinology",
        "qualifications": "MBBS, MD (Endocrinology)",
        "clinic_name": "Sanjeevani Multispeciality Clinic",
        "clinic_address": "Apollo Health Arcade, 4th Floor, Jubilee Hills, Hyderabad",
        "signature_image_url": None,
    },
    "doc-rai-1": {
        "doctor_id": "doc-rai-1",
        "license_number": "TS-98765-2015",
        "specialty": "Cardiology",
        "qualifications": "MBBS, MD, DM (Cardiology)",
        "clinic_name": "Manikanta Heart & Neuro Institute",
        "clinic_address": "Road No. 12, Banjara Hills, Hyderabad",
        "signature_image_url": None,
    },
    "doc-patel-1": {
        "doctor_id": "doc-patel-1",
        "license_number": "KA-55443-2019",
        "specialty": "Endocrinology & Diabetology",
        "qualifications": "MBBS, DNB (Endo)",
        "clinic_name": "Metro Diabetes & Endocrine Centre",
        "clinic_address": "Koramangala 5th Block, Bengaluru",
        "signature_image_url": None,
    }
}

_MEMORY_AVAILABILITY: Dict[str, List[Dict[str, Any]]] = {
    "doc-sharma-1": [
        {"day_of_week": 1, "start_time": "09:00", "end_time": "17:00", "is_available": True},
        {"day_of_week": 2, "start_time": "09:00", "end_time": "17:00", "is_available": True},
        {"day_of_week": 3, "start_time": "09:00", "end_time": "17:00", "is_available": True},
        {"day_of_week": 4, "start_time": "09:00", "end_time": "17:00", "is_available": True},
        {"day_of_week": 5, "start_time": "09:00", "end_time": "15:00", "is_available": True},
        {"day_of_week": 6, "start_time": "10:00", "end_time": "13:00", "is_available": False},
        {"day_of_week": 0, "start_time": "00:00", "end_time": "00:00", "is_available": False},
    ]
}


class SettingsService:
    def get_default_settings(self, user_id: str) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "notify_channels": ["in_app", "whatsapp"],
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
            "ui_language": "en",
            "regional_language": "en",
            "ai_risk_forecast_enabled": True,
            "ai_smart_search_enabled": True,
            "ai_differential_suggestions_enabled": True,
            "ai_daily_tip_enabled": True,
            "ai_auto_triage_enabled": True,
            "ai_inventory_forecast_enabled": True,
            "ai_abnormal_flagging_enabled": True,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_settings(self, user_id: str) -> Dict[str, Any]:
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("user_settings").select("*").eq("user_id", user_id).single().execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        if user_id not in _MEMORY_SETTINGS:
            _MEMORY_SETTINGS[user_id] = self.get_default_settings(user_id)
        return _MEMORY_SETTINGS[user_id]

    def update_settings(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        sb = get_supabase()
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        if sb:
            try:
                sb.table("user_settings").upsert({"user_id": user_id, **updates}).execute()
            except Exception:
                pass

        current = self.get_settings(user_id)
        current.update(updates)
        _MEMORY_SETTINGS[user_id] = current
        return current

    def get_credentials(self, doctor_id: str) -> Dict[str, Any]:
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("doctor_credentials").select("*").eq("doctor_id", doctor_id).single().execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        return _MEMORY_CREDENTIALS.get(doctor_id, {
            "doctor_id": doctor_id,
            "license_number": "MH-12345-2018",
            "specialty": "General Medicine",
            "qualifications": "MBBS, MD",
            "clinic_name": "Sanjeevani Clinic",
            "clinic_address": "City Medical Enclave",
            "signature_image_url": None,
        })

    def update_credentials(self, doctor_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        sb = get_supabase()
        if sb:
            try:
                sb.table("doctor_credentials").upsert({"doctor_id": doctor_id, **updates}).execute()
            except Exception:
                pass

        current = self.get_credentials(doctor_id)
        current.update(updates)
        _MEMORY_CREDENTIALS[doctor_id] = current
        return current

    def get_availability(self, user_id: str) -> List[Dict[str, Any]]:
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("staff_availability").select("*").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception:
                pass

        return _MEMORY_AVAILABILITY.get(user_id, [
            {"day_of_week": i, "start_time": "09:00", "end_time": "17:00", "is_available": i < 6}
            for i in range(7)
        ])

    def update_availability(self, user_id: str, schedule: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        sb = get_supabase()
        if sb:
            try:
                sb.table("staff_availability").delete().eq("user_id", user_id).execute()
                sb.table("staff_availability").insert([{"user_id": user_id, **item} for item in schedule]).execute()
            except Exception:
                pass

        _MEMORY_AVAILABILITY[user_id] = schedule
        return schedule


settings_service = SettingsService()
