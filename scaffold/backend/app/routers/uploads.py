import uuid
from fastapi import APIRouter, UploadFile, File, Form
from app.services.patient_service import patient_service

router = APIRouter()

@router.post("/scan")
async def upload_scan(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    category: str = Form(...),
    doctor_name: str = Form(default="Attending Physician")
):
    scan_id = f"scan-{uuid.uuid4().hex[:8]}"
    vault_doc = patient_service.add_scan_to_vault(
        patient_id=patient_id,
        filename=file.filename or "prescription_scan.jpg",
        doctor_name=doctor_name
    )

    return {
        "scan_id": scan_id,
        "ocr_status": "done",
        "verification_status": "unverified",
        "badge": "UNVERIFIED — NEEDS DOCTOR SIGN-OFF",
        "vault_document": vault_doc,
    }
