import hashlib
import json

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

from app.core.supabase_client import get_supabase
from app.ai.xray.inference import analyze_xray

router = APIRouter()


@router.get("/queue")
async def get_queue(doctor_id: str):
    sb = get_supabase()
    res = (
        sb.table("doctor_queues")
        .select("*, patients(*), chief_complaints(*)")
        .eq("doctor_id", doctor_id)
        .eq("status", "waiting")
        .order("queued_at")
        .execute()
    )
    queue = sorted(
        res.data,
        key=lambda row: (-row["chief_complaints"]["severity_level"], row["queued_at"]),
    )
    return {"queue": queue}


@router.get("/patients/{patient_id}/xray/{scan_id}")
async def get_xray_analysis(patient_id: str, scan_id: str):
    sb = get_supabase()
    res = sb.table("scans").select("*").eq("id", scan_id).single().execute()
    scan = res.data
    return {"file_url": scan["file_url"], "detections": scan.get("xray_analysis_json") or []}


@router.post("/xray/analyze")
async def analyze_xray_upload(scan_id: str, image_file: UploadFile = File(...)):
    """Runs the YOLOv7-p6 bone-fracture ONNX model on an uploaded X-ray and persists the result."""
    image_bytes = await image_file.read()
    detections = analyze_xray(image_bytes)

    sb = get_supabase()
    sb.table("scans").update({
        "xray_analysis_json": detections,
        "ocr_status": "done",
    }).eq("id", scan_id).execute()

    return {"scan_id": scan_id, "detections": detections}


class GuardrailRequest(BaseModel):
    patient_id: str
    draft_prescription_id: str | None = None
    medication_items: list[dict]  # [{"medication_id": "...", "dosage": "..."}]


@router.post("/guardrail-check")
async def guardrail_check(payload: GuardrailRequest):
    sb = get_supabase()

    existing = (
        sb.table("prescription_items")
        .select("*, medications(*), prescriptions!inner(patient_id, status, id)")
        .eq("prescriptions.patient_id", payload.patient_id)
        .in_("prescriptions.status", ["verified", "dispensed"])
        .execute()
    )

    new_med_ids = {item["medication_id"] for item in payload.medication_items}
    flags = []
    for row in existing.data:
        if row["prescriptions"]["id"] == payload.draft_prescription_id:
            continue
        existing_med = row["medications"]
        existing_tags = set(existing_med.get("interaction_tags") or [])
        for new_id in new_med_ids:
            new_med = sb.table("medications").select("*").eq("id", new_id).single().execute().data
            new_tags = set(new_med.get("interaction_tags") or [])
            if existing_tags & new_tags:
                flags.append({
                    "medication_id": new_id,
                    "conflicting_with": existing_med["name"],
                    "severity": "severe",
                    "message": f"Potential interaction between {new_med['name']} and {existing_med['name']}.",
                })

    return {"safe": len(flags) == 0, "flags": flags}


class VerifyRequest(BaseModel):
    prescription_id: str
    doctor_id: str
    final_state: dict


@router.post("/verify")
async def verify_prescription(payload: VerifyRequest):
    protocol_hash = "sha256:" + hashlib.sha256(
        json.dumps(payload.final_state, sort_keys=True).encode()
    ).hexdigest()

    from app.services.patient_service import patient_service
    patient_service.verify_prescription(payload.prescription_id, payload.doctor_id)

    return {"status": "verified", "protocol_hash": protocol_hash}


@router.post("/dictation")
async def dictation():
    # TODO: run Whisper transcription then LLM SOAP-note structuring (see app/ai/llm/)
    return {"transcript": "", "soap_note": {}}
