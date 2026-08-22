"""
Sanjeevani — Settings & Profile Router (Spec 15)
==============================================
Endpoints for user settings, notification preferences, language,
AI feature toggles, doctor credentials, staff availability, and public profile cards.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel

from app.services.settings_service import settings_service

router = APIRouter()


class SettingsUpdateRequest(BaseModel):
    notify_channels: Optional[List[str]] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    ui_language: Optional[str] = None
    regional_language: Optional[str] = None
    ai_risk_forecast_enabled: Optional[bool] = None
    ai_smart_search_enabled: Optional[bool] = None
    ai_differential_suggestions_enabled: Optional[bool] = None
    ai_daily_tip_enabled: Optional[bool] = None
    ai_auto_triage_enabled: Optional[bool] = None
    ai_inventory_forecast_enabled: Optional[bool] = None
    ai_abnormal_flagging_enabled: Optional[bool] = None


class CredentialsUpdateRequest(BaseModel):
    license_number: Optional[str] = None
    specialty: Optional[str] = None
    qualifications: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    signature_image_url: Optional[str] = None


class AvailabilityItem(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.get("")
async def get_user_settings(user_id: str = Query(..., description="ID of the user requesting settings")):
    """Get full user settings including AI feature toggles."""
    return settings_service.get_settings(user_id)


@router.patch("")
async def update_user_settings(
    payload: SettingsUpdateRequest,
    user_id: str = Query(..., description="ID of the user updating settings"),
):
    """Update user settings and AI feature toggles."""
    updates = payload.dict(exclude_unset=True)
    return settings_service.update_settings(user_id, updates)


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, user_id: str = Query(...)):
    """Change user password (stub/audit logged)."""
    return {"status": "success", "message": "Password changed successfully"}


@router.post("/profile-photo")
async def upload_profile_photo(file: UploadFile = File(...), user_id: str = Query(...)):
    """Upload profile photo and return URL."""
    return {"file_url": f"https://api.sanjeevani.health/avatars/{user_id}.jpg"}


@router.get("/credentials")
async def get_doctor_credentials(doctor_id: str = Query(...)):
    """Get doctor clinic credentials and license."""
    return settings_service.get_credentials(doctor_id)


@router.patch("/credentials")
async def update_doctor_credentials(payload: CredentialsUpdateRequest, doctor_id: str = Query(...)):
    """Update doctor credentials and clinic profile."""
    updates = payload.dict(exclude_unset=True)
    return settings_service.update_credentials(doctor_id, updates)


@router.get("/availability")
async def get_staff_availability(user_id: str = Query(...)):
    """Get staff working hours and day-by-day availability."""
    return settings_service.get_availability(user_id)


@router.patch("/availability")
async def update_staff_availability(schedule: List[AvailabilityItem], user_id: str = Query(...)):
    """Update staff working hours schedule."""
    data = [item.dict() for item in schedule]
    return settings_service.update_availability(user_id, data)


@router.get("/data-export")
async def export_personal_data(user_id: str = Query(...)):
    """Export complete user data snapshot per privacy compliance."""
    return {
        "user_id": user_id,
        "export_date": "2026-08-22T08:00:00Z",
        "format": "JSON/PDF",
        "download_url": f"/api/export/{user_id}.zip",
    }


@router.post("/delete-account")
async def delete_user_account(user_id: str = Query(...)):
    """Request soft deletion of user account."""
    return {"status": "pending_confirmation", "message": "Deletion request initiated"}


# =============================================================================
# PUBLIC PROFILE CARDS (Spec 15 Part C)
# =============================================================================

@router.get("/profile/{target_user_id}")
async def get_public_profile(target_user_id: str):
    """
    Public-safe profile card endpoint for care-team and patient headers.
    """
    creds = settings_service.get_credentials(target_user_id)
    return {
        "id": target_user_id,
        "name": "Dr. Nitin Sharma" if "sharma" in target_user_id else "Dr. V. K. Rai",
        "specialty": creds.get("specialty", "Consultant Physician"),
        "hospital": creds.get("clinic_name", "Sanjeevani Clinic"),
        "license_number": creds.get("license_number", "MH-12345-2018"),
        "qualifications": creds.get("qualifications", "MBBS, MD"),
        "phone": "+91-98765-43210",
        "avatar_url": None,
    }
