from fastapi import APIRouter
from pydantic import BaseModel

from app.core.supabase_client import get_supabase

router = APIRouter()

CRITICAL_KEYWORDS = ["chest pain", "shortness of breath", "severe bleeding", "unconscious", "chest pressure"]


def classify_triage(text: str) -> dict:
    lowered = text.lower()
    if any(k in lowered for k in CRITICAL_KEYWORDS):
        return {"severity_level": 3, "label": "CRITICAL"}
    if "pain" in lowered or "fever" in lowered:
        return {"severity_level": 2, "label": "URGENT"}
    return {"severity_level": 1, "label": "ROUTINE"}


class NewPatientRequest(BaseModel):
    full_name: str
    age: int
    gender: str
    phone: str
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    chief_complaint: str
    registered_by: str | None = None
    doctor_id: str | None = None


@router.post("/new")
async def create_patient(payload: NewPatientRequest):
    sb = get_supabase()

    patient_res = sb.table("patients").insert({
        "full_name": payload.full_name,
        "age": payload.age,
        "gender": payload.gender,
        "phone": payload.phone,
        "emergency_contact_name": payload.emergency_contact_name,
        "emergency_contact_phone": payload.emergency_contact_phone,
        "registered_by": payload.registered_by,
    }).execute()
    patient = patient_res.data[0]

    triage = classify_triage(payload.chief_complaint)
    complaint_res = sb.table("chief_complaints").insert({
        "patient_id": patient["id"],
        "text": payload.chief_complaint,
        "severity_level": triage["severity_level"],
    }).execute()
    complaint = complaint_res.data[0]

    token_count = sb.table("doctor_queues").select("id", count="exact").execute().count or 0
    sb.table("doctor_queues").insert({
        "patient_id": patient["id"],
        "doctor_id": payload.doctor_id,
        "chief_complaint_id": complaint["id"],
        "token_number": token_count + 1,
        "status": "waiting",
    }).execute()

    return {"patient_id": patient["id"], "triage": triage, "token_number": token_count + 1}


@router.get("/search")
async def search_patients(q: str):
    sb = get_supabase()
    res = (
        sb.table("patients")
        .select("id, full_name, phone")
        .or_(f"full_name.ilike.%{q}%,phone.ilike.%{q}%")
        .limit(10)
        .execute()
    )
    return {"results": res.data}
