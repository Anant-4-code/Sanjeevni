"""
Sanjeevani — Reception Router
=============================
Patient lookup, registration, AI severity suggestion, queue management,
appointment scheduling, and daily activity summary.
"""

from typing import Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.supabase_client import get_supabase

router = APIRouter()

# ─── Severity Classification (AI-4: NLP Triage) ───

CRITICAL_KEYWORDS = [
    "chest pain", "shortness of breath", "severe bleeding", "unconscious",
    "chest pressure", "heart attack", "stroke", "seizure", "anaphylaxis",
    "not breathing", "cardiac arrest",
]
URGENT_KEYWORDS = [
    "fever", "high fever", "vomiting", "fracture", "severe pain", "dizziness",
    "asthma attack", "persistent cough", "blood in stool", "head injury",
    "dehydration", "high blood pressure", "difficulty breathing",
]


def classify_severity(text: str) -> dict:
    """AI-4: NLP-based severity suggestion from complaint text."""
    lowered = text.lower().strip()
    if not lowered:
        return {"severity_level": 1, "label": "ROUTINE", "reason": "No complaint text provided"}
    if any(k in lowered for k in CRITICAL_KEYWORDS):
        return {
            "severity_level": 3,
            "label": "CRITICAL",
            "reason": "Acute symptoms detected requiring immediate attention",
        }
    if any(k in lowered for k in URGENT_KEYWORDS):
        return {
            "severity_level": 2,
            "label": "URGENT",
            "reason": "Symptoms suggest elevated clinical priority",
        }
    return {
        "severity_level": 1,
        "label": "ROUTINE",
        "reason": "No acute symptoms detected; scheduled follow-up type",
    }


# ─── Mock Doctors (fallback when Supabase unavailable) ───

MOCK_DOCTORS = [
    {
        "id": "doc-sharma-1",
        "full_name": "Dr. Nitin Sharma",
        "specialty": "Internal Medicine & Endocrinology",
        "queue_length": 3,
        "available": True,
    },
    {
        "id": "doc-rai-1",
        "full_name": "Dr. V. K. Rai",
        "specialty": "Cardiology & General Medicine",
        "queue_length": 5,
        "available": True,
    },
    {
        "id": "doc-patel-1",
        "full_name": "Dr. Patel",
        "specialty": "Endocrinology & Diabetology",
        "queue_length": 2,
        "available": True,
    },
]


# ═══════════════════════════════════════════════════════════════
# 1. Patient Lookup by Phone (RC-1, RC-9)
# ═══════════════════════════════════════════════════════════════

@router.get("/patients/lookup")
async def lookup_patient_by_phone(phone: str = Query(..., min_length=3)):
    """Look up a patient by phone number, returns known details + allergies + last visit."""
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("patients").select("*").ilike("phone", f"%{phone}%").limit(1).execute()
            if res.data and len(res.data) > 0:
                patient = res.data[0]
                # Fetch allergies
                allergies = []
                try:
                    allergy_res = (
                        sb.table("patient_allergies")
                        .select("*")
                        .eq("patient_id", patient["id"])
                        .execute()
                    )
                    allergies = allergy_res.data or []
                except Exception:
                    pass

                # Fetch last visit
                last_visit = None
                try:
                    queue_res = (
                        sb.table("doctor_queues")
                        .select("queued_at, doctor_id")
                        .eq("patient_id", patient["id"])
                        .order("queued_at", desc=True)
                        .limit(1)
                        .execute()
                    )
                    if queue_res.data:
                        last_visit = queue_res.data[0]
                except Exception:
                    pass

                return {
                    "found": True,
                    "patient": patient,
                    "allergies": allergies,
                    "last_visit": last_visit,
                }
            return {"found": False, "patient": None, "allergies": [], "last_visit": None}
        except Exception as e:
            print(f"Lookup error: {e}")

    # Fallback mock
    if "98765" in phone:
        return {
            "found": True,
            "patient": {
                "id": "patient-savitri",
                "full_name": "Savitri Kumar",
                "age": 58,
                "gender": "Female",
                "phone": "+91-98765-43210",
                "emergency_contact_name": "Ramesh Kumar (son)",
                "emergency_contact_phone": "+91-99999-11111",
            },
            "allergies": [
                {"allergen": "Penicillin", "severity": "severe", "reaction": "Anaphylaxis"},
            ],
            "last_visit": {
                "queued_at": "2026-08-12T10:30:00Z",
                "doctor_name": "Dr. V. K. Rai",
            },
        }
    return {"found": False, "patient": None, "allergies": [], "last_visit": None}


# ═══════════════════════════════════════════════════════════════
# 2. Patient Registration + Token Generation (RC-1, RC-2, RC-3, RC-4)
# ═══════════════════════════════════════════════════════════════

class RegisterPatientRequest(BaseModel):
    full_name: str
    age: int
    gender: str
    phone: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    chief_complaint: str
    doctor_id: str
    severity_override: Optional[int] = None  # if receptionist overrides AI suggestion
    existing_patient_id: Optional[str] = None  # for returning patients


@router.post("/patients/register")
async def register_patient(payload: RegisterPatientRequest):
    """Register new patient (or use existing) + create complaint + queue entry + token."""
    ai_severity = classify_severity(payload.chief_complaint)
    final_severity = payload.severity_override or ai_severity["severity_level"]
    overridden = payload.severity_override is not None and payload.severity_override != ai_severity["severity_level"]

    sb = get_supabase()
    if sb:
        try:
            # Create or reuse patient
            if payload.existing_patient_id:
                patient_id = payload.existing_patient_id
            else:
                patient_res = sb.table("patients").insert({
                    "full_name": payload.full_name,
                    "age": payload.age,
                    "gender": payload.gender,
                    "phone": payload.phone,
                    "emergency_contact_name": payload.emergency_contact_name,
                    "emergency_contact_phone": payload.emergency_contact_phone,
                    "hospital_id": "00000000-0000-0000-0000-000000000001",
                }).execute()
                patient_id = patient_res.data[0]["id"]

            # Create chief complaint
            complaint_res = sb.table("chief_complaints").insert({
                "patient_id": patient_id,
                "text": payload.chief_complaint,
                "severity_level": final_severity,
                "ai_suggested_severity": ai_severity["severity_level"],
                "severity_overridden_by_staff": overridden,
            }).execute()
            complaint_id = complaint_res.data[0]["id"]

            # Generate token: count today's queue entries for this doctor
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0).isoformat()
            token_res = (
                sb.table("doctor_queues")
                .select("id", count="exact")
                .eq("doctor_id", payload.doctor_id)
                .gte("queued_at", today_start)
                .execute()
            )
            token_number = (token_res.count or 0) + 1

            # Add to queue
            sb.table("doctor_queues").insert({
                "patient_id": patient_id,
                "doctor_id": payload.doctor_id,
                "chief_complaint_id": complaint_id,
                "token_number": token_number,
                "status": "waiting",
            }).execute()

            # Estimate wait (3 min per patient ahead)
            waiting_count = (
                sb.table("doctor_queues")
                .select("id", count="exact")
                .eq("doctor_id", payload.doctor_id)
                .eq("status", "waiting")
                .execute()
            ).count or 0

            return {
                "patient_id": patient_id,
                "token_number": token_number,
                "triage": {
                    "severity_level": final_severity,
                    "label": ["", "ROUTINE", "URGENT", "CRITICAL"][final_severity],
                    "ai_suggested": ai_severity,
                    "overridden": overridden,
                },
                "queue_position": waiting_count,
                "estimated_wait_minutes": waiting_count * 8,
            }
        except Exception as e:
            print(f"Registration error: {e}")

    # Fallback mock
    import random
    token = random.randint(10, 25)
    return {
        "patient_id": payload.existing_patient_id or f"patient-{payload.full_name.lower().replace(' ', '-')}",
        "token_number": token,
        "triage": {
            "severity_level": final_severity,
            "label": ["", "ROUTINE", "URGENT", "CRITICAL"][final_severity],
            "ai_suggested": ai_severity,
            "overridden": overridden,
        },
        "queue_position": token - 1,
        "estimated_wait_minutes": (token - 1) * 8,
    }


# ═══════════════════════════════════════════════════════════════
# 3. AI Severity Suggestion (RC-AI-1 / AI-4)
# ═══════════════════════════════════════════════════════════════

class SeverityRequest(BaseModel):
    complaint_text: str


@router.post("/complaints/suggest-severity")
async def suggest_severity(payload: SeverityRequest):
    """AI-4: Real-time severity suggestion from complaint text."""
    return classify_severity(payload.complaint_text)


# ═══════════════════════════════════════════════════════════════
# 4. Queue Board (RC-6)
# ═══════════════════════════════════════════════════════════════

@router.get("/queue/board")
async def get_queue_board():
    """Returns all doctors' live queues with patient details and wait times."""
    sb = get_supabase()
    if sb:
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0).isoformat()
            queue_res = (
                sb.table("doctor_queues")
                .select("*, patients(full_name, age, gender), chief_complaints(text, severity_level)")
                .gte("queued_at", today_start)
                .order("token_number")
                .execute()
            )
            rows = queue_res.data or []

            # Group by doctor
            doctors_map: dict = {}
            for row in rows:
                did = row.get("doctor_id", "unknown")
                if did not in doctors_map:
                    doctors_map[did] = {"doctor_id": did, "doctor_name": did, "patients": []}
                patient_data = row.get("patients") or {}
                complaint_data = row.get("chief_complaints") or {}
                wait_mins = 0
                if row.get("queued_at"):
                    try:
                        queued = datetime.fromisoformat(row["queued_at"].replace("Z", "+00:00"))
                        wait_mins = int((datetime.now(queued.tzinfo) - queued).total_seconds() / 60)
                    except Exception:
                        pass

                doctors_map[did]["patients"].append({
                    "queue_id": row["id"],
                    "patient_id": row["patient_id"],
                    "patient_name": patient_data.get("full_name", "Unknown"),
                    "token_number": row.get("token_number"),
                    "status": row.get("status", "waiting"),
                    "severity_level": complaint_data.get("severity_level", 1),
                    "complaint": complaint_data.get("text", ""),
                    "waiting_minutes": max(wait_mins, 0),
                })

            total_waiting = sum(
                1 for d in doctors_map.values() for p in d["patients"] if p["status"] == "waiting"
            )
            all_waits = [
                p["waiting_minutes"]
                for d in doctors_map.values()
                for p in d["patients"]
                if p["status"] == "waiting"
            ]
            avg_wait = round(sum(all_waits) / len(all_waits)) if all_waits else 0

            return {
                "doctors": list(doctors_map.values()),
                "total_waiting": total_waiting,
                "avg_wait_minutes": avg_wait,
            }
        except Exception as e:
            print(f"Queue board error: {e}")

    # Fallback mock
    return {
        "doctors": [
            {
                "doctor_id": "doc-rai-1",
                "doctor_name": "Dr. V. K. Rai (Cardiology)",
                "patients": [
                    {"queue_id": "q1", "patient_id": "p1", "patient_name": "Ramesh Kumar", "token_number": 14, "status": "waiting", "severity_level": 1, "complaint": "Follow-up diabetes", "waiting_minutes": 12},
                    {"queue_id": "q2", "patient_id": "p2", "patient_name": "Sita Devi", "token_number": 15, "status": "waiting", "severity_level": 2, "complaint": "Chest discomfort", "waiting_minutes": 4},
                ],
            },
            {
                "doctor_id": "doc-patel-1",
                "doctor_name": "Dr. Patel (Endocrinology)",
                "patients": [
                    {"queue_id": "q3", "patient_id": "p3", "patient_name": "Anil Patel", "token_number": 9, "status": "waiting", "severity_level": 1, "complaint": "Routine HbA1c check", "waiting_minutes": 3},
                    {"queue_id": "q4", "patient_id": "p4", "patient_name": "Priya Sharma", "token_number": 10, "status": "waiting", "severity_level": 1, "complaint": "Thyroid follow-up", "waiting_minutes": 1},
                ],
            },
            {
                "doctor_id": "doc-sharma-1",
                "doctor_name": "Dr. Nitin Sharma (Internal Medicine)",
                "patients": [
                    {"queue_id": "q5", "patient_id": "p5", "patient_name": "Savitri Kumar", "token_number": 7, "status": "in_consult", "severity_level": 1, "complaint": "Diabetes management", "waiting_minutes": 0},
                    {"queue_id": "q6", "patient_id": "p6", "patient_name": "Vikram Singh", "token_number": 8, "status": "waiting", "severity_level": 1, "complaint": "Blood pressure review", "waiting_minutes": 8},
                ],
            },
        ],
        "total_waiting": 5,
        "avg_wait_minutes": 6,
    }


# ═══════════════════════════════════════════════════════════════
# 5. Doctors List with Queue Length (RC-3, RC-AI-2)
# ═══════════════════════════════════════════════════════════════

@router.get("/doctors")
async def get_available_doctors():
    """Returns doctors with their specialty and current queue length for assignment."""
    sb = get_supabase()
    if sb:
        try:
            docs_res = (
                sb.table("app_users")
                .select("id, full_name, role")
                .eq("role", "doctor")
                .eq("is_active", True)
                .execute()
            )
            doctors = []
            for doc in (docs_res.data or []):
                # Get queue length
                q_count = (
                    sb.table("doctor_queues")
                    .select("id", count="exact")
                    .eq("doctor_id", doc["id"])
                    .eq("status", "waiting")
                    .execute()
                ).count or 0

                # Get specialty from doctor_credentials
                specialty = "General Medicine"
                try:
                    cred_res = (
                        sb.table("doctor_credentials")
                        .select("specialty")
                        .eq("doctor_id", doc["id"])
                        .limit(1)
                        .execute()
                    )
                    if cred_res.data:
                        specialty = cred_res.data[0].get("specialty", specialty)
                except Exception:
                    pass

                doctors.append({
                    "id": doc["id"],
                    "full_name": doc["full_name"],
                    "specialty": specialty,
                    "queue_length": q_count,
                    "available": True,
                })
            if doctors:
                return {"doctors": doctors}
        except Exception as e:
            print(f"Doctors list error: {e}")

    return {"doctors": MOCK_DOCTORS}


# ═══════════════════════════════════════════════════════════════
# 6. Appointment Scheduling (RC-7)
# ═══════════════════════════════════════════════════════════════

class AppointmentRequest(BaseModel):
    patient_id: str
    doctor_id: str
    scheduled_at: str  # ISO datetime
    reason: Optional[str] = None
    created_by: Optional[str] = None


@router.post("/appointments")
async def create_appointment(payload: AppointmentRequest):
    """Schedule a future appointment."""
    sb = get_supabase()
    if sb:
        try:
            res = sb.table("appointments").insert({
                "patient_id": payload.patient_id,
                "doctor_id": payload.doctor_id,
                "scheduled_at": payload.scheduled_at,
                "reason": payload.reason,
                "created_by": payload.created_by,
            }).execute()
            return {"appointment": res.data[0], "status": "scheduled"}
        except Exception as e:
            print(f"Appointment creation error: {e}")

    return {
        "appointment": {
            "id": "appt-mock-1",
            "patient_id": payload.patient_id,
            "doctor_id": payload.doctor_id,
            "scheduled_at": payload.scheduled_at,
            "reason": payload.reason,
            "status": "scheduled",
        },
        "status": "scheduled",
    }


@router.get("/appointments")
async def get_appointments(
    date: Optional[str] = None,
    doctor_id: Optional[str] = None,
):
    """Get appointments for a given date and/or doctor."""
    sb = get_supabase()
    if sb:
        try:
            query = sb.table("appointments").select("*, patients(full_name, phone)")
            if date:
                day_start = f"{date}T00:00:00Z"
                day_end = f"{date}T23:59:59Z"
                query = query.gte("scheduled_at", day_start).lte("scheduled_at", day_end)
            if doctor_id:
                query = query.eq("doctor_id", doctor_id)
            res = query.order("scheduled_at").execute()
            return {"appointments": res.data or []}
        except Exception as e:
            print(f"Appointments fetch error: {e}")

    # Fallback mock
    return {
        "appointments": [
            {
                "id": "appt-1",
                "patient_id": "patient-savitri",
                "doctor_id": "doc-sharma-1",
                "scheduled_at": "2026-09-05T10:30:00Z",
                "reason": "Follow-up: HbA1c re-check discussion",
                "status": "scheduled",
                "patients": {"full_name": "Savitri Kumar", "phone": "+91-98765-43210"},
            },
            {
                "id": "appt-2",
                "patient_id": "patient-vikram",
                "doctor_id": "doc-rai-1",
                "scheduled_at": "2026-09-05T11:00:00Z",
                "reason": "Blood pressure medication review",
                "status": "scheduled",
                "patients": {"full_name": "Vikram Singh", "phone": "+91-87654-32100"},
            },
        ]
    }


# ═══════════════════════════════════════════════════════════════
# 7. Refill Requests Status (RC-8, read-only)
# ═══════════════════════════════════════════════════════════════

@router.get("/refill-requests/status")
async def get_refill_request_status():
    """Read-only view of refill request status for reception coordination."""
    sb = get_supabase()
    if sb:
        try:
            res = (
                sb.table("refill_requests")
                .select("*, patients(full_name, phone)")
                .order("requested_at", desc=True)
                .limit(20)
                .execute()
            )
            return {"refill_requests": res.data or []}
        except Exception as e:
            print(f"Refill status error: {e}")

    return {
        "refill_requests": [
            {
                "id": "refill-1",
                "patient_id": "patient-savitri",
                "status": "approved",
                "requested_at": "2026-09-01T09:00:00Z",
                "patients": {"full_name": "Savitri Kumar", "phone": "+91-98765-43210"},
            },
        ]
    }


# ═══════════════════════════════════════════════════════════════
# 8. Daily Reception Summary (RC-10)
# ═══════════════════════════════════════════════════════════════

@router.get("/daily-summary")
async def daily_summary():
    """Daily reception activity summary."""
    sb = get_supabase()
    if sb:
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0).isoformat()

            patients_today = (
                sb.table("patients")
                .select("id", count="exact")
                .gte("created_at", today_start)
                .execute()
            ).count or 0

            queue_today = (
                sb.table("doctor_queues")
                .select("id", count="exact")
                .gte("queued_at", today_start)
                .execute()
            ).count or 0

            completed = (
                sb.table("doctor_queues")
                .select("id", count="exact")
                .eq("status", "completed")
                .gte("queued_at", today_start)
                .execute()
            ).count or 0

            return {
                "date": datetime.utcnow().date().isoformat(),
                "patients_registered": patients_today,
                "tokens_issued": queue_today,
                "consultations_completed": completed,
                "waiting_now": queue_today - completed,
            }
        except Exception as e:
            print(f"Daily summary error: {e}")

    return {
        "date": datetime.utcnow().date().isoformat(),
        "patients_registered": 14,
        "tokens_issued": 18,
        "consultations_completed": 11,
        "waiting_now": 5,
    }
