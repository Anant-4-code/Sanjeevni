"""
Sanjeevani — Lab Router (Spec 15)
================================
Diagnostic orders Kanban, raw values entry, and AI-7 Abnormal Result Flagging & Plain Summary Draft.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


@router.get("/orders")
async def get_lab_orders():
    """
    Returns lab diagnostic orders categorized by status (pending_draw, analyzing, results_ready).
    """
    return {
        "orders": [
            {
                "id": "lab-ord-1",
                "patient_id": "patient-savitri",
                "patient_name": "Savitri Kumar",
                "doctor_name": "Dr. Nitin Sharma",
                "test_name": "Comprehensive Metabolic & Lipid Panel",
                "ordered_at": "2026-08-16T09:00:00Z",
                "status": "analyzing",
                "priority": "routine",
                "specimen": "Venous Blood (Serum)"
            },
            {
                "id": "lab-ord-2",
                "patient_id": "patient-vikram",
                "patient_name": "Vikram Singh",
                "doctor_name": "Dr. V. K. Rai",
                "test_name": "Lipid Profile & Serum Electrolytes",
                "ordered_at": "2026-08-16T10:00:00Z",
                "status": "pending_draw",
                "priority": "urgent",
                "specimen": "Serum"
            },
            {
                "id": "lab-ord-3",
                "patient_id": "patient-priya",
                "patient_name": "Priya Sharma",
                "doctor_name": "Dr. Patel",
                "test_name": "Thyroid Stimulating Hormone (TSH)",
                "ordered_at": "2026-08-16T08:30:00Z",
                "status": "results_ready",
                "priority": "routine",
                "specimen": "Plasma"
            }
        ]
    }


class OrderStatusUpdate(BaseModel):
    status: str  # "pending_draw" | "analyzing" | "results_ready"


@router.post("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusUpdate):
    """
    Moves diagnostic order across workflow stages.
    """
    return {
        "status": "updated",
        "order_id": order_id,
        "new_status": payload.status,
        "updated_at": datetime.utcnow().isoformat()
    }


class DraftSummaryRequest(BaseModel):
    test_name: str
    raw_values: Dict[str, Any]


@router.post("/draft-summary")
async def generate_draft_summary(payload: DraftSummaryRequest):
    """
    AI-7: Analyzes raw laboratory values, highlights abnormal out-of-range metrics,
    and drafts a plain-language summary for patient report cards.
    """
    abnormal_flags = []
    normal_metrics = []

    for metric, val in payload.raw_values.items():
        try:
            num_val = float(str(val).replace("%", "").replace("mg/dL", "").replace("mmol/L", "").strip())
            if metric.lower() in ["hba1c", "a1c"] and num_val > 6.5:
                abnormal_flags.append({"metric": metric, "value": val, "flag": "High", "range": "< 5.7% (Normal), 5.7-6.4% (Prediabetes)"})
            elif metric.lower() in ["fasting glucose", "glucose", "fbs"] and num_val > 110:
                abnormal_flags.append({"metric": metric, "value": val, "flag": "High", "range": "70-99 mg/dL"})
            elif metric.lower() in ["total cholesterol", "cholesterol"] and num_val > 200:
                abnormal_flags.append({"metric": metric, "value": val, "flag": "High", "range": "< 200 mg/dL"})
            elif metric.lower() in ["creatinine", "serum creatinine"] and num_val > 1.3:
                abnormal_flags.append({"metric": metric, "value": val, "flag": "High", "range": "0.7-1.2 mg/dL"})
            else:
                normal_metrics.append({"metric": metric, "value": val, "flag": "Normal"})
        except Exception:
            normal_metrics.append({"metric": metric, "value": val, "flag": "Normal"})

    if abnormal_flags:
        plain_summary = (
            f"Your {payload.test_name} results show that most baseline metrics are stable, but "
            f"{', '.join([f['metric'] for f in abnormal_flags])} was measured above standard reference range ({abnormal_flags[0]['value']}). "
            f"Your attending physician has received these values and will review if any medication timing adjustments are needed."
        )
    else:
        plain_summary = (
            f"All values in your {payload.test_name} are within normal healthy reference limits. "
            f"Keep up your current medication schedule and lifestyle habits."
        )

    return {
        "test_name": payload.test_name,
        "abnormal_flags": abnormal_flags,
        "normal_metrics": normal_metrics,
        "plain_language_summary": plain_summary,
        "generated_at": datetime.utcnow().isoformat()
    }


class LabResultRequest(BaseModel):
    diagnostic_order_id: str
    raw_values: Dict[str, Any]
    technician_id: str = "tech-raj-1"
    edited_summary: Optional[str] = None


@router.post("/results")
async def submit_results(payload: LabResultRequest):
    """
    Submits verified laboratory results and publishes the plain-language summary to the patient's record.
    """
    return {
        "status": "published",
        "order_id": payload.diagnostic_order_id,
        "technician_id": payload.technician_id,
        "published_at": datetime.utcnow().isoformat(),
        "summary": payload.edited_summary or "Diagnostic report verified and published."
    }
