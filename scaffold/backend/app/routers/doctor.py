"""
Sanjeevani — Doctor Router (Complete)
======================================
16 REST endpoints for the Doctor Portal.
All business logic delegated to DoctorService + GuardrailService.
"""

import hashlib
import json
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel

from app.core.supabase_client import get_supabase
from app.ai.xray.inference import analyze_xray
from app.services.doctor_service import doctor_service

router = APIRouter()


# =============================================================================
# QUEUE & PATIENT LOAD
# =============================================================================

@router.get("/queue")
async def get_queue(doctor_id: str):
    """
    Acuity-sorted consultation queue for a doctor.
    Sorted: severity DESC, then queued_at ASC.
    """
    return doctor_service.get_queue(doctor_id)


@router.get("/patient/{patient_id}")
async def get_patient_dashboard(patient_id: str, doctor_id: str = "demo-doctor"):
    """
    Unified patient dashboard combining all context:
    - Patient demographics
    - Active prescriptions (this doctor + cross-doctor)
    - Allergy profile
    - Adherence score + caregiver audit
    - Symptom logs & trends
    - Smart alerts
    - Pending refill requests
    - Visit prep insights
    """
    result = doctor_service.get_patient_dashboard(patient_id, doctor_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# =============================================================================
# PATIENT CONTEXT ENDPOINTS (Features #2-5, #8)
# =============================================================================

@router.get("/patient/{patient_id}/symptoms")
async def get_patient_symptoms(patient_id: str, days: int = 30):
    """Get patient symptom logs for the last N days with trend analysis."""
    return doctor_service.get_symptoms(patient_id, days)


@router.get("/patient/{patient_id}/caregiver-audit")
async def get_caregiver_audit(patient_id: str):
    """Get caregiver dose-marking audit trail for a patient."""
    return doctor_service.get_caregiver_audit(patient_id)


@router.get("/patient/{patient_id}/allergies")
async def get_patient_allergies(patient_id: str):
    """Get patient allergy profile (patient-reported + doctor-confirmed)."""
    return doctor_service.get_allergies(patient_id)


@router.get("/patient/{patient_id}/visit-prep")
async def get_visit_prep(patient_id: str):
    """
    Get visit prep insights:
    - Copilot refusals (questions patient asked that Copilot couldn't answer)
    - Symptom patterns
    - Suggested talking points
    """
    return doctor_service.get_visit_prep(patient_id)


# =============================================================================
# GUARDRAIL CHECK
# =============================================================================

class GuardrailRequest(BaseModel):
    patient_id: str
    draft_prescription_id: str | None = None
    medication_items: list[dict]  # [{"medication_id": "...", "name": "...", "dosage": "..."}]


@router.post("/guardrail-check")
async def guardrail_check(payload: GuardrailRequest):
    """
    Live guardrail check triggered on every medication edit.
    Checks: drug-drug interactions, drug-allergy conflicts, duplicate medications.
    Returns: {safe: bool, flags: [{medication_id, conflicting_with, severity, message}]}
    """
    return doctor_service.guardrail_check(
        patient_id=payload.patient_id,
        medication_items=payload.medication_items,
    )


# =============================================================================
# VERIFICATION (Sign-Off)
# =============================================================================

class VerifyRequest(BaseModel):
    prescription_id: str
    doctor_id: str
    final_state: dict
    acknowledged_flags: list[dict] = []


@router.post("/verify")
async def verify_prescription(payload: VerifyRequest):
    """
    Sign-off endpoint. CRITICAL: This is immutable.

    Process:
    1. Hash final state (SHA-256)
    2. Write verification log (append-only)
    3. Update prescription status to 'verified'
    4. Fan-out stubs (pharmacy queue, patient SMS, lab orders)
    """
    result = doctor_service.verify_prescription(
        prescription_id=payload.prescription_id,
        doctor_id=payload.doctor_id,
        final_state=payload.final_state,
        acknowledged_flags=payload.acknowledged_flags,
    )
    return result


# =============================================================================
# REFILL REQUESTS (Feature #1 Integration)
# =============================================================================

@router.get("/refill-requests")
async def get_refill_requests(doctor_id: str = "demo-doctor", status: str = "pending"):
    """Get pending refill requests for this doctor, sorted by urgency."""
    refills = doctor_service.get_pending_refills(doctor_id)
    return {"refill_requests": refills, "count": len(refills)}


class RefillApproveRequest(BaseModel):
    doctor_id: str = "demo-doctor"
    refill_quantity: int = 10
    doctor_notes: str = ""


@router.post("/refill-requests/{refill_id}/approve")
async def approve_refill(refill_id: str, payload: RefillApproveRequest):
    """Approve a patient's refill request with optional clinical notes."""
    result = doctor_service.approve_refill(
        refill_id=refill_id,
        doctor_id=payload.doctor_id,
        doctor_notes=payload.doctor_notes,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


class RefillDenyRequest(BaseModel):
    doctor_id: str = "demo-doctor"
    reason: str = ""


@router.post("/refill-requests/{refill_id}/deny")
async def deny_refill(refill_id: str, payload: RefillDenyRequest):
    """Deny a refill request with reason."""
    result = doctor_service.deny_refill(
        refill_id=refill_id,
        doctor_id=payload.doctor_id,
        reason=payload.reason,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# =============================================================================
# DICTATION & SOAP (Feature #23)
# =============================================================================

@router.post("/dictation")
async def dictation_upload(prescription_id: str = "rx-ramesh-1"):
    """
    Ambient voice documentation stub.
    In production: receives audio file → Whisper transcription → LLM SOAP note.
    Currently returns mock SOAP for demo.
    """
    return doctor_service.process_dictation(prescription_id)


# =============================================================================
# FOLLOW-UP SCHEDULING
# =============================================================================

class FollowUpRequest(BaseModel):
    patient_id: str
    doctor_id: str = "demo-doctor"
    scheduled_date: str
    reason: str = ""


@router.post("/follow-up")
async def create_follow_up(payload: FollowUpRequest):
    """Create a follow-up appointment. Triggers patient reminder automatically."""
    result = doctor_service.create_follow_up(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        scheduled_date=payload.scheduled_date,
        reason=payload.reason,
    )
    return result


# =============================================================================
# ALERT ACKNOWLEDGMENT
# =============================================================================

class AcknowledgeRequest(BaseModel):
    doctor_id: str = "demo-doctor"


@router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, payload: AcknowledgeRequest):
    """Acknowledge a smart alert (missed dose, lab-due, symptom trend)."""
    result = doctor_service.acknowledge_alert(alert_id, payload.doctor_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# =============================================================================
# X-RAY ANALYSIS (Existing — Preserved)
# =============================================================================

@router.get("/patients/{patient_id}/xray/{scan_id}")
async def get_xray_analysis(patient_id: str, scan_id: str):
    """Get X-ray analysis results (YOLOv7-p6 bone fracture detection)."""
    sb = get_supabase()
    if not sb:
        # Fallback demo data when Supabase is not configured
        return {
            "file_url": None,
            "detections": [
                {"label": "fracture", "confidence": 0.92, "box": {"x": 120, "y": 80, "w": 60, "h": 45}},
                {"label": "abnormality", "confidence": 0.78, "box": {"x": 200, "y": 150, "w": 40, "h": 35}},
            ],
        }
    res = sb.table("scans").select("*").eq("id", scan_id).single().execute()
    scan = res.data
    return {"file_url": scan["file_url"], "detections": scan.get("xray_analysis_json") or []}


@router.post("/xray/analyze")
async def analyze_xray_upload(scan_id: str, image_file: UploadFile = File(...)):
    """Runs the YOLOv7-p6 bone-fracture ONNX model on an uploaded X-ray."""
    image_bytes = await image_file.read()
    detections = analyze_xray(image_bytes)

    sb = get_supabase()
    if sb:
        sb.table("scans").update({
            "xray_analysis_json": detections,
            "ocr_status": "done",
        }).eq("id", scan_id).execute()

    return {"scan_id": scan_id, "detections": detections}
