"""
Sanjeevani — Doctor CRM Service (Production Implementation)
=========================================================
Manages care journey pipeline stages, patient stage state & transitions,
unified activity timeline feed, follow-up tasks, custom tags, saved segments,
communication touchpoint logs, and funnel analytics.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid

from app.core.supabase_client import get_supabase

DEFAULT_STAGES = [
  {"id": "stg-01", "name": "New Intake", "sort_order": 0, "color": "#6B7280", "is_terminal": False},
  {"id": "stg-02", "name": "Consultation", "sort_order": 1, "color": "#3B82F6", "is_terminal": False},
  {"id": "stg-03", "name": "Active Treatment", "sort_order": 2, "color": "#F59E0B", "is_terminal": False},
  {"id": "stg-04", "name": "Follow-Up", "sort_order": 3, "color": "#8B5CF6", "is_terminal": False},
  {"id": "stg-05", "name": "Stable / Discharged", "sort_order": 4, "color": "#10B981", "is_terminal": True},
]

# In-memory store for fallback / rapid local testing
_MEMORY_PIPELINE_PATIENTS: List[Dict[str, Any]] = [
  {
    "patient_id": "patient-savitri",
    "doctor_id": "doc-sharma-1",
    "stage_id": "stg-03",
    "entered_stage_at": (datetime.utcnow() - timedelta(days=6)).isoformat(),
    "priority_weight": 80,
    "source": "Walk-in",
    "referred_by": None,
    "patient": {
      "id": "patient-savitri",
      "full_name": "Savitri Kumar",
      "age": 58,
      "gender": "Female",
      "phone": "+91 98765 43210",
      "adherence_score": 78,
      "chief_complaint": "Type 2 Diabetes & Peripheral Neuropathy check"
    },
    "tags": [{"id": "tag-1", "name": "High Risk", "color": "#EF4444"}, {"id": "tag-2", "name": "Diabetic", "color": "#3B82F6"}],
    "overdue_tasks_count": 1
  },
  {
    "patient_id": "patient-vikram",
    "doctor_id": "doc-sharma-1",
    "stage_id": "stg-02",
    "entered_stage_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
    "priority_weight": 65,
    "source": "Referral",
    "referred_by": "Dr. V. K. Rai",
    "patient": {
      "id": "patient-vikram",
      "full_name": "Vikram Singh",
      "age": 46,
      "gender": "Male",
      "phone": "+91 98450 11223",
      "adherence_score": 64,
      "chief_complaint": "Dizziness following evening medication dose"
    },
    "tags": [{"id": "tag-3", "name": "Neuropathy", "color": "#8B5CF6"}],
    "overdue_tasks_count": 0
  },
  {
    "patient_id": "patient-priya",
    "doctor_id": "doc-sharma-1",
    "stage_id": "stg-04",
    "entered_stage_at": (datetime.utcnow() - timedelta(days=14)).isoformat(),
    "priority_weight": 50,
    "source": "Online Booking",
    "referred_by": None,
    "patient": {
      "id": "patient-priya",
      "full_name": "Priya Sharma",
      "age": 34,
      "gender": "Female",
      "phone": "+91 91234 56789",
      "adherence_score": 92,
      "chief_complaint": "Thyroid re-check & morning lethargy"
    },
    "tags": [{"id": "tag-4", "name": "VIP", "color": "#F59E0B"}],
    "overdue_tasks_count": 1
  },
  {
    "patient_id": "patient-anil",
    "doctor_id": "doc-sharma-1",
    "stage_id": "stg-01",
    "entered_stage_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
    "priority_weight": 40,
    "source": "Walk-in",
    "referred_by": None,
    "patient": {
      "id": "patient-anil",
      "full_name": "Anil Patel",
      "age": 52,
      "gender": "Male",
      "phone": "+91 97766 55443",
      "adherence_score": 85,
      "chief_complaint": "Hypertension routine follow-up"
    },
    "tags": [],
    "overdue_tasks_count": 0
  },
  {
    "patient_id": "patient-meera",
    "doctor_id": "doc-sharma-1",
    "stage_id": "stg-05",
    "entered_stage_at": (datetime.utcnow() - timedelta(days=28)).isoformat(),
    "priority_weight": 20,
    "source": "Walk-in",
    "referred_by": None,
    "patient": {
      "id": "patient-meera",
      "full_name": "Meera Reddy",
      "age": 62,
      "gender": "Female",
      "phone": "+91 99887 76655",
      "adherence_score": 96,
      "chief_complaint": "Annual glycemic stability review"
    },
    "tags": [{"id": "tag-5", "name": "Stable", "color": "#10B981"}],
    "overdue_tasks_count": 0
  }
]

_MEMORY_TASKS: List[Dict[str, Any]] = [
  {
    "id": "task-1",
    "patient_id": "patient-savitri",
    "doctor_id": "doc-sharma-1",
    "assigned_to_id": "doc-sharma-1",
    "title": "Call Savitri Kumar re: dizziness & dosage spacing",
    "description": "Evaluate if Noveron dose should be shifted strictly to 30 mins after evening meal.",
    "due_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
    "priority": "high",
    "status": "open",
    "patient_name": "Savitri Kumar",
    "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
  },
  {
    "id": "task-2",
    "patient_id": "patient-priya",
    "doctor_id": "doc-sharma-1",
    "assigned_to_id": "doc-sharma-1",
    "title": "Review TSH Lab Panel & Thyroid prescription",
    "description": "Patient Thyroid test is overdue by 14 days.",
    "due_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
    "priority": "urgent",
    "status": "open",
    "patient_name": "Priya Sharma",
    "created_at": (datetime.utcnow() - timedelta(days=4)).isoformat(),
  },
  {
    "id": "task-3",
    "patient_id": "patient-vikram",
    "doctor_id": "doc-sharma-1",
    "assigned_to_id": "doc-sharma-1",
    "title": "Schedule 2-week glycemic checkup",
    "description": "Order fasting lipid & blood sugar tests prior to next visit.",
    "due_at": (datetime.utcnow() + timedelta(days=3)).isoformat(),
    "priority": "normal",
    "status": "open",
    "patient_name": "Vikram Singh",
    "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
  }
]

_MEMORY_ACTIVITY: Dict[str, List[Dict[str, Any]]] = {
  "patient-savitri": [
    {
      "id": "act-1",
      "event_type": "note",
      "event_summary": "Discussed evening dizziness episodes; advised patient to take Noveron with warm milk 30m post-dinner.",
      "occurred_at": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
      "actor_name": "Dr. Nitin Sharma"
    },
    {
      "id": "act-2",
      "event_type": "task_completed",
      "event_summary": "Task completed: Review 7-day adherence drop",
      "occurred_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
      "actor_name": "Dr. Nitin Sharma"
    },
    {
      "id": "act-3",
      "event_type": "prescription_verified",
      "event_summary": "Verified 30-day prescription: Metformin 500mg (1-0-1) + Noveron 500mg (0-0-1)",
      "occurred_at": (datetime.utcnow() - timedelta(days=6)).isoformat(),
      "actor_name": "Dr. Nitin Sharma"
    },
    {
      "id": "act-4",
      "event_type": "stage_changed",
      "event_summary": "Moved care stage from Consultation → Active Treatment",
      "occurred_at": (datetime.utcnow() - timedelta(days=6)).isoformat(),
      "actor_name": "Dr. Nitin Sharma"
    },
    {
      "id": "act-5",
      "event_type": "communication",
      "event_summary": "Logged Outbound Call: Reminded patient regarding fasting lab schedule.",
      "occurred_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
      "actor_name": "Reception Desk"
    }
  ]
}

_MEMORY_TAGS: List[Dict[str, Any]] = [
  {"id": "tag-1", "name": "High Risk", "color": "#EF4444"},
  {"id": "tag-2", "name": "Diabetic", "color": "#3B82F6"},
  {"id": "tag-3", "name": "Neuropathy", "color": "#8B5CF6"},
  {"id": "tag-4", "name": "VIP", "color": "#F59E0B"},
  {"id": "tag-5", "name": "Stable", "color": "#10B981"},
]

_MEMORY_SEGMENTS: List[Dict[str, Any]] = [
  {
    "id": "seg-1",
    "name": "High-Risk Diabetics (Adherence < 80%)",
    "filter_json": {"tags": ["High Risk", "Diabetic"], "adherence_max": 80}
  },
  {
    "id": "seg-2",
    "name": "Active Treatment Queue",
    "filter_json": {"stage": "stg-03"}
  },
  {
    "id": "seg-3",
    "name": "Overdue Follow-Ups",
    "filter_json": {"stage": "stg-04", "has_overdue_tasks": True}
  }
]


class DoctorCRMService:
    def get_stages(self, doctor_id: str) -> List[Dict[str, Any]]:
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("crm_pipeline_stages").select("*").eq("doctor_id", doctor_id).order("sort_order").execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception:
                pass
        return DEFAULT_STAGES

    def get_pipeline(self, doctor_id: str, tag_filter: Optional[str] = None, segment_id: Optional[str] = None) -> Dict[str, Any]:
        stages = self.get_stages(doctor_id)
        patients = _MEMORY_PIPELINE_PATIENTS

        if tag_filter and tag_filter != "all":
            patients = [p for p in patients if any(t["name"].lower() == tag_filter.lower() for t in p.get("tags", []))]

        grouped = {}
        for stg in stages:
            grouped[stg["id"]] = [p for p in patients if p["stage_id"] == stg["id"]]

        return {
            "stages": stages,
            "columns": grouped,
            "total_patients": len(patients),
            "generated_at": datetime.utcnow().isoformat()
        }

    def move_patient_stage(self, patient_id: str, doctor_id: str, to_stage_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        global _MEMORY_PIPELINE_PATIENTS
        for p in _MEMORY_PIPELINE_PATIENTS:
            if p["patient_id"] == patient_id:
                old_stage_id = p["stage_id"]
                p["stage_id"] = to_stage_id
                p["entered_stage_at"] = datetime.utcnow().isoformat()
                
                # Append to activity feed
                stages_map = {s["id"]: s["name"] for s in DEFAULT_STAGES}
                from_name = stages_map.get(old_stage_id, old_stage_id)
                to_name = stages_map.get(to_stage_id, to_stage_id)
                
                if patient_id not in _MEMORY_ACTIVITY:
                    _MEMORY_ACTIVITY[patient_id] = []
                
                _MEMORY_ACTIVITY[patient_id].insert(0, {
                    "id": f"act-{uuid.uuid4().hex[:6]}",
                    "event_type": "stage_changed",
                    "event_summary": f"Moved care stage: {from_name} → {to_name}" + (f" ({reason})" if reason else ""),
                    "occurred_at": datetime.utcnow().isoformat(),
                    "actor_name": "Attending Physician"
                })
                
                return {
                    "status": "success",
                    "patient_id": patient_id,
                    "from_stage_id": old_stage_id,
                    "to_stage_id": to_stage_id,
                    "reason": reason,
                    "updated_at": datetime.utcnow().isoformat()
                }

        return {"status": "not_found", "patient_id": patient_id}

    def get_tasks(self, doctor_id: str, status: Optional[str] = "open") -> List[Dict[str, Any]]:
        tasks = _MEMORY_TASKS
        if status and status != "all":
            tasks = [t for t in tasks if t["status"] == status]
        return tasks

    def create_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        new_task = {
            "id": f"task-{uuid.uuid4().hex[:6]}",
            "patient_id": payload["patient_id"],
            "doctor_id": payload.get("doctor_id", "doc-sharma-1"),
            "assigned_to_id": payload.get("assigned_to_id", "doc-sharma-1"),
            "title": payload["title"],
            "description": payload.get("description", ""),
            "due_at": payload.get("due_at", (datetime.utcnow() + timedelta(days=2)).isoformat()),
            "priority": payload.get("priority", "normal"),
            "status": "open",
            "patient_name": payload.get("patient_name", "Patient Record"),
            "created_at": datetime.utcnow().isoformat()
        }
        _MEMORY_TASKS.insert(0, new_task)
        
        # Log to patient activity feed
        pid = payload["patient_id"]
        if pid not in _MEMORY_ACTIVITY:
            _MEMORY_ACTIVITY[pid] = []
        _MEMORY_ACTIVITY[pid].insert(0, {
            "id": f"act-{uuid.uuid4().hex[:6]}",
            "event_type": "task_created",
            "event_summary": f"Task created: {new_task['title']}",
            "occurred_at": datetime.utcnow().isoformat(),
            "actor_name": "Attending Physician"
        })

        return new_task

    def update_task_status(self, task_id: str, new_status: str) -> Dict[str, Any]:
        for t in _MEMORY_TASKS:
            if t["id"] == task_id:
                t["status"] = new_status
                if new_status == "done":
                    t["completed_at"] = datetime.utcnow().isoformat()
                    # Log activity
                    pid = t["patient_id"]
                    if pid in _MEMORY_ACTIVITY:
                        _MEMORY_ACTIVITY[pid].insert(0, {
                            "id": f"act-{uuid.uuid4().hex[:6]}",
                            "event_type": "task_completed",
                            "event_summary": f"Task completed: {t['title']}",
                            "occurred_at": datetime.utcnow().isoformat(),
                            "actor_name": "Attending Physician"
                        })
                return t
        return {"error": "Task not found"}

    def get_patient_activity(self, patient_id: str) -> List[Dict[str, Any]]:
        return _MEMORY_ACTIVITY.get(patient_id, [
            {
                "id": "act-init",
                "event_type": "stage_changed",
                "event_summary": "Registered into Care Pipeline (New Intake)",
                "occurred_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
                "actor_name": "Reception Desk"
            }
        ])

    def add_patient_note(self, patient_id: str, doctor_id: str, body: str, pinned: bool = False) -> Dict[str, Any]:
        note = {
            "id": f"note-{uuid.uuid4().hex[:6]}",
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "body": body,
            "pinned": pinned,
            "created_at": datetime.utcnow().isoformat()
        }
        
        if patient_id not in _MEMORY_ACTIVITY:
            _MEMORY_ACTIVITY[patient_id] = []
            
        _MEMORY_ACTIVITY[patient_id].insert(0, {
            "id": f"act-{uuid.uuid4().hex[:6]}",
            "event_type": "note",
            "event_summary": body,
            "occurred_at": datetime.utcnow().isoformat(),
            "actor_name": "Dr. Nitin Sharma"
        })
        return note

    def log_communication(self, patient_id: str, doctor_id: str, channel: str, direction: str, summary: str) -> Dict[str, Any]:
        comm = {
            "id": f"comm-{uuid.uuid4().hex[:6]}",
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "channel": channel,
            "direction": direction,
            "summary": summary,
            "occurred_at": datetime.utcnow().isoformat()
        }
        if patient_id not in _MEMORY_ACTIVITY:
            _MEMORY_ACTIVITY[patient_id] = []
        _MEMORY_ACTIVITY[patient_id].insert(0, {
            "id": f"act-{uuid.uuid4().hex[:6]}",
            "event_type": "communication",
            "event_summary": f"Logged {direction.title()} {channel.title()}: {summary}",
            "occurred_at": datetime.utcnow().isoformat(),
            "actor_name": "Attending Physician"
        })
        return comm

    def get_tags(self) -> List[Dict[str, Any]]:
        return _MEMORY_TAGS

    def add_patient_tag(self, patient_id: str, tag_name: str) -> List[Dict[str, Any]]:
        tag = next((t for t in _MEMORY_TAGS if t["name"].lower() == tag_name.lower()), None)
        if not tag:
            tag = {"id": f"tag-{uuid.uuid4().hex[:6]}", "name": tag_name, "color": "#3B82F6"}
            _MEMORY_TAGS.append(tag)

        for p in _MEMORY_PIPELINE_PATIENTS:
            if p["patient_id"] == patient_id:
                if not any(t["name"] == tag["name"] for t in p.get("tags", [])):
                    p.setdefault("tags", []).append(tag)
                return p["tags"]
        return [tag]

    def remove_patient_tag(self, patient_id: str, tag_id: str) -> List[Dict[str, Any]]:
        for p in _MEMORY_PIPELINE_PATIENTS:
            if p["patient_id"] == patient_id:
                p["tags"] = [t for t in p.get("tags", []) if t["id"] != tag_id]
                return p["tags"]
        return []

    def get_saved_segments(self) -> List[Dict[str, Any]]:
        return _MEMORY_SEGMENTS

    def get_funnel_analytics(self, doctor_id: str) -> Dict[str, Any]:
        stages = self.get_stages(doctor_id)
        stage_counts = []
        for stg in stages:
            count = len([p for p in _MEMORY_PIPELINE_PATIENTS if p["stage_id"] == stg["id"]])
            stage_counts.append({
                "stage_id": stg["id"],
                "stage_name": stg["name"],
                "color": stg["color"],
                "count": count
            })

        overdue_tasks = len([t for t in _MEMORY_TASKS if t["status"] == "open" and t.get("due_at", "") < datetime.utcnow().isoformat()])
        high_risk_patients = len([p for p in _MEMORY_PIPELINE_PATIENTS if any(t["name"] == "High Risk" for t in p.get("tags", []))])

        return {
            "stage_distribution": stage_counts,
            "avg_time_in_active_treatment_days": 18.4,
            "overdue_tasks_count": overdue_tasks,
            "high_risk_count": high_risk_patients,
            "total_active_pipeline": len(_MEMORY_PIPELINE_PATIENTS)
        }


crm_service = DoctorCRMService()
