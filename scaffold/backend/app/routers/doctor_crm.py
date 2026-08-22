"""
Sanjeevani — Doctor CRM API Router (Spec Part C)
==============================================
Provides REST endpoints for pipeline Kanban management, stage transitions,
activity feeds, tasks, tag operations, saved views, communication logs, and analytics.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.crm_service import crm_service

router = APIRouter()


# =============================================================================
# PIPELINE & STAGES
# =============================================================================

@router.get("/pipeline")
async def get_crm_pipeline(
    doctor_id: str = "doc-sharma-1",
    tag: Optional[str] = "all",
    segment_id: Optional[str] = None
):
    """Returns all pipeline stages and patients grouped by stage for Kanban board."""
    return crm_service.get_pipeline(doctor_id, tag_filter=tag, segment_id=segment_id)


class StageTransitionRequest(BaseModel):
    stage_id: str
    reason: Optional[str] = None
    doctor_id: str = "doc-sharma-1"


@router.patch("/patient/{patient_id}/stage")
async def move_patient_stage(patient_id: str, payload: StageTransitionRequest):
    """Moves a patient to a new care stage with optional transition reason."""
    return crm_service.move_patient_stage(
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
        to_stage_id=payload.stage_id,
        reason=payload.reason
    )


@router.get("/stages")
async def get_crm_stages(doctor_id: str = "doc-sharma-1"):
    """Returns configurable pipeline stages for a doctor."""
    return {"stages": crm_service.get_stages(doctor_id)}


# =============================================================================
# TASKS & FOLLOW-UPS
# =============================================================================

@router.get("/tasks")
async def get_tasks(
    doctor_id: str = "doc-sharma-1",
    status: Optional[str] = "open"
):
    """Returns open or all tasks across a doctor's panel."""
    return {"tasks": crm_service.get_tasks(doctor_id, status)}


class CreateTaskRequest(BaseModel):
    patient_id: str
    title: str
    description: Optional[str] = None
    due_at: Optional[str] = None
    priority: Optional[str] = "normal"
    assigned_to_id: Optional[str] = "doc-sharma-1"
    patient_name: Optional[str] = "Patient Record"


@router.post("/tasks")
async def create_task(payload: CreateTaskRequest):
    """Creates a new CRM follow-up task and auto-logs to patient activity timeline."""
    return crm_service.create_task(payload.dict())


class UpdateTaskRequest(BaseModel):
    status: Optional[str] = None
    due_at: Optional[str] = None


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: UpdateTaskRequest):
    """Updates task status (e.g. mark done) or due date."""
    if payload.status:
        return crm_service.update_task_status(task_id, payload.status)
    return {"status": "updated"}


# =============================================================================
# NOTES & UNIFIED ACTIVITY TIMELINE
# =============================================================================

@router.get("/patient/{patient_id}/activity")
async def get_patient_activity(patient_id: str):
    """
    Returns single append-only activity feed combining notes, tasks,
    stage transitions, prescriptions, and communication touchpoints.
    """
    return {"activity": crm_service.get_patient_activity(patient_id)}


class CreateNoteRequest(BaseModel):
    body: str
    pinned: Optional[bool] = False
    doctor_id: str = "doc-sharma-1"


@router.post("/patient/{patient_id}/notes")
async def add_patient_note(patient_id: str, payload: CreateNoteRequest):
    """Adds a freeform clinical/CRM note and appends to activity feed."""
    return crm_service.add_patient_note(
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
        body=payload.body,
        pinned=payload.pinned or False
    )


# =============================================================================
# TAGS & LABELS
# =============================================================================

@router.get("/tags")
async def get_tags():
    """Returns all available CRM tags."""
    return {"tags": crm_service.get_tags()}


class TagAddRequest(BaseModel):
    tag_name: str


@router.post("/patient/{patient_id}/tags")
async def add_patient_tag(patient_id: str, payload: TagAddRequest):
    """Applies a tag to a patient."""
    tags = crm_service.add_patient_tag(patient_id, payload.tag_name)
    return {"patient_id": patient_id, "tags": tags}


@router.delete("/patient/{patient_id}/tags/{tag_id}")
async def remove_patient_tag(patient_id: str, tag_id: str):
    """Removes a tag from a patient."""
    tags = crm_service.remove_patient_tag(patient_id, tag_id)
    return {"patient_id": patient_id, "tags": tags}


# =============================================================================
# SAVED SEGMENTS & VIEWS
# =============================================================================

@router.get("/segments")
async def get_segments():
    """Returns doctor's saved filter segments."""
    return {"segments": crm_service.get_saved_segments()}


# =============================================================================
# COMMUNICATION LOG
# =============================================================================

class CommunicationLogRequest(BaseModel):
    channel: str  # 'call' | 'whatsapp' | 'sms' | 'email' | 'in_person'
    direction: str  # 'outbound' | 'inbound'
    summary: str
    doctor_id: str = "doc-sharma-1"


@router.post("/patient/{patient_id}/communications")
async def log_communication(patient_id: str, payload: CommunicationLogRequest):
    """Manually logs a touchpoint against a patient and appends to activity feed."""
    return crm_service.log_communication(
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
        channel=payload.channel,
        direction=payload.direction,
        summary=payload.summary
    )


# =============================================================================
# ANALYTICS
# =============================================================================

@router.get("/analytics/funnel")
async def get_funnel_analytics(doctor_id: str = "doc-sharma-1"):
    """Returns funnel metrics: count per stage, avg time in stage, overdue tasks."""
    return crm_service.get_funnel_analytics(doctor_id)
