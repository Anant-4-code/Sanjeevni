from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

@router.post("/orders/{order_id}/status")
async def update_order_status(order_id: str):
    return {"status": "updated"}

class LabResultRequest(BaseModel):
    diagnostic_order_id: str
    raw_values: dict

@router.post("/results")
async def submit_results(payload: LabResultRequest):
    # TODO: call LLM to generate plain-language patient_summary_text
    return {"patient_summary": "Stub summary — connect LLM translation step."}
