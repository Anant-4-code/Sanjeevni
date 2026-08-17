"""
Sanjeevani — Doctor Service (In-Memory Demo Data)
===================================================
Provides all doctor-facing business logic with seeded demo data.
Mirrors the PatientService pattern for consistency.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import uuid

from app.services.guardrail_service import run_guardrail_check


# ---------------------------------------------------------------------------
# Demo data seed
# ---------------------------------------------------------------------------

def _today() -> str:
    return datetime.date.today().isoformat()


def _now_iso() -> str:
    return datetime.datetime.utcnow().isoformat() + "Z"


def _days_ago(n: int) -> str:
    return (datetime.date.today() - datetime.timedelta(days=n)).isoformat()


class DoctorService:
    def __init__(self):
        # ── Demo patients ──────────────────────────────────────────────
        self.patients = {
            "patient-ramesh": {
                "id": "patient-ramesh",
                "full_name": "Ramesh Kumar",
                "age": 58,
                "gender": "Male",
                "phone": "+91-9876543210",
                "registered_at": "2026-08-10T09:00:00Z",
            },
            "patient-sita": {
                "id": "patient-sita",
                "full_name": "Sita Devi",
                "age": 45,
                "gender": "Female",
                "phone": "+91-9123456780",
                "registered_at": "2026-08-12T10:30:00Z",
            },
            "patient-anil": {
                "id": "patient-anil",
                "full_name": "Anil Patel",
                "age": 32,
                "gender": "Male",
                "phone": "+91-9988776655",
                "registered_at": "2026-08-14T11:00:00Z",
            },
            "patient-priya": {
                "id": "patient-priya",
                "full_name": "Priya Sharma",
                "age": 28,
                "gender": "Female",
                "phone": "+91-9871234560",
                "registered_at": "2026-08-15T08:15:00Z",
            },
            "patient-vikram": {
                "id": "patient-vikram",
                "full_name": "Vikram Singh",
                "age": 65,
                "gender": "Male",
                "phone": "+91-9876123450",
                "registered_at": "2026-08-16T07:45:00Z",
            },
        }

        # ── Doctor queue (acuity-sorted) ────────────────────────────────
        self.queue = [
            {
                "id": "q-1",
                "patient_id": "patient-vikram",
                "doctor_id": "demo-doctor",
                "token_number": 14,
                "status": "waiting",
                "queued_at": "2026-08-16T08:45:00Z",
                "patients": self.patients["patient-vikram"],
                "chief_complaints": {
                    "id": "cc-1",
                    "text": "Severe chest pain radiating to left arm, shortness of breath",
                    "severity_level": 3,
                    "severity_source": "nlp_model",
                },
            },
            {
                "id": "q-2",
                "patient_id": "patient-sita",
                "doctor_id": "demo-doctor",
                "token_number": 12,
                "status": "waiting",
                "queued_at": "2026-08-16T09:15:00Z",
                "patients": self.patients["patient-sita"],
                "chief_complaints": {
                    "id": "cc-2",
                    "text": "High fever (102°F) for 3 days, persistent cough with yellow sputum",
                    "severity_level": 2,
                    "severity_source": "nlp_model",
                },
            },
            {
                "id": "q-3",
                "patient_id": "patient-ramesh",
                "doctor_id": "demo-doctor",
                "token_number": 9,
                "status": "waiting",
                "queued_at": "2026-08-16T09:30:00Z",
                "patients": self.patients["patient-ramesh"],
                "chief_complaints": {
                    "id": "cc-3",
                    "text": "Follow-up for diabetes management, reports occasional dizziness",
                    "severity_level": 2,
                    "severity_source": "nlp_model",
                },
            },
            {
                "id": "q-4",
                "patient_id": "patient-priya",
                "doctor_id": "demo-doctor",
                "token_number": 16,
                "status": "waiting",
                "queued_at": "2026-08-16T10:00:00Z",
                "patients": self.patients["patient-priya"],
                "chief_complaints": {
                    "id": "cc-4",
                    "text": "Recurring headaches for past 2 weeks, mild nausea",
                    "severity_level": 1,
                    "severity_source": "nlp_model",
                },
            },
            {
                "id": "q-5",
                "patient_id": "patient-anil",
                "doctor_id": "demo-doctor",
                "token_number": 18,
                "status": "waiting",
                "queued_at": "2026-08-16T10:30:00Z",
                "patients": self.patients["patient-anil"],
                "chief_complaints": {
                    "id": "cc-5",
                    "text": "Annual health checkup, no active complaints",
                    "severity_level": 1,
                    "severity_source": "manual",
                },
            },
        ]

        # ── Active prescriptions (this doctor) ──────────────────────────
        self.my_prescriptions = {
            "patient-ramesh": [
                {
                    "id": "rx-ramesh-1",
                    "medication_name": "Metformin 500mg",
                    "dosage": "500mg",
                    "frequency": "2-0-2",
                    "duration_days": 30,
                    "condition_tag": "DIABETES",
                    "status": "verified",
                    "days_remaining": 20,
                    "prescribed_at": _days_ago(10),
                },
                {
                    "id": "rx-ramesh-2",
                    "medication_name": "Noveron 500mg",
                    "dosage": "500mg",
                    "frequency": "1-0-1",
                    "duration_days": 10,
                    "condition_tag": "HEART CARE",
                    "status": "verified",
                    "days_remaining": 3,
                    "prescribed_at": _days_ago(7),
                },
            ],
            "patient-sita": [
                {
                    "id": "rx-sita-1",
                    "medication_name": "Paracetamol 500mg",
                    "dosage": "500mg",
                    "frequency": "1-1-1",
                    "duration_days": 5,
                    "condition_tag": "FEVER",
                    "status": "verified",
                    "days_remaining": 3,
                    "prescribed_at": _days_ago(2),
                },
            ],
        }

        # ── Active prescriptions (other doctors → cross-doctor view) ─────
        self.other_prescriptions = {
            "patient-ramesh": [
                {
                    "id": "rx-other-1",
                    "medication_name": "Warfarin 5mg",
                    "medication_id": "warfarin",
                    "dosage": "5mg",
                    "frequency": "1-0-0",
                    "duration_days": 30,
                    "condition_tag": "ANTICOAGULATION",
                    "doctor_name": "Dr. Rai (Cardiology)",
                    "status": "verified",
                },
                {
                    "id": "rx-other-2",
                    "medication_name": "Aspirin 100mg",
                    "medication_id": "aspirin",
                    "dosage": "100mg",
                    "frequency": "1-0-0",
                    "duration_days": 30,
                    "condition_tag": "ANTIPLATELET",
                    "doctor_name": "Dr. Rai (Cardiology)",
                    "status": "verified",
                },
                {
                    "id": "rx-other-3",
                    "medication_name": "Insulin Detemir (NovoLog)",
                    "medication_id": "insulin",
                    "dosage": "varies",
                    "frequency": "as directed",
                    "duration_days": 90,
                    "condition_tag": "DIABETES",
                    "doctor_name": "Dr. Patel (Endocrinology)",
                    "status": "verified",
                },
            ],
            "patient-vikram": [
                {
                    "id": "rx-other-4",
                    "medication_name": "Atenolol 50mg",
                    "medication_id": "atenolol",
                    "dosage": "50mg",
                    "frequency": "1-0-0",
                    "duration_days": 30,
                    "condition_tag": "HYPERTENSION",
                    "doctor_name": "Dr. Mehta (Cardiology)",
                    "status": "verified",
                },
            ],
        }

        # ── Allergy profiles ──────────────────────────────────────────────
        self.allergies = {
            "patient-ramesh": [
                {
                    "id": "allergy-1",
                    "allergen_name": "Penicillin",
                    "reaction_type": "rash",
                    "severity": "moderate",
                    "reported_by_patient": True,
                    "confirmed_by_doctor": True,
                    "confirmed_by_doctor_name": "Dr. Rai",
                    "notes": "Developed rash after Amoxicillin course in 2019",
                },
                {
                    "id": "allergy-2",
                    "allergen_name": "Shellfish",
                    "reaction_type": "nausea",
                    "severity": "mild",
                    "reported_by_patient": True,
                    "confirmed_by_doctor": False,
                    "notes": "Self-reported, not yet verified",
                },
            ],
            "patient-sita": [
                {
                    "id": "allergy-3",
                    "allergen_name": "Sulfa",
                    "reaction_type": "rash",
                    "severity": "severe",
                    "reported_by_patient": True,
                    "confirmed_by_doctor": True,
                    "confirmed_by_doctor_name": "Dr. Gupta",
                    "notes": "Severe reaction to Bactrim — anaphylactic risk",
                },
            ],
        }

        # ── Symptom logs (30-day window) ──────────────────────────────────
        self.symptom_logs = {
            "patient-ramesh": [
                {"date": _days_ago(1), "feeling_score": 3, "energy": 2, "mood": 3, "sleep": 4,
                 "notes": "Slight dizziness after evening Noveron dose", "symptoms": ["dizziness", "fatigue"]},
                {"date": _days_ago(2), "feeling_score": 3, "energy": 3, "mood": 3, "sleep": 3,
                 "notes": "Felt tired in the afternoon", "symptoms": ["fatigue"]},
                {"date": _days_ago(3), "feeling_score": 4, "energy": 3, "mood": 4, "sleep": 4,
                 "notes": "Better day overall", "symptoms": []},
                {"date": _days_ago(5), "feeling_score": 2, "energy": 2, "mood": 2, "sleep": 2,
                 "notes": "Low energy all day, dizziness after meals", "symptoms": ["dizziness", "low_energy", "nausea"]},
                {"date": _days_ago(7), "feeling_score": 3, "energy": 3, "mood": 3, "sleep": 3,
                 "notes": "Average day", "symptoms": ["mild_headache"]},
                {"date": _days_ago(10), "feeling_score": 2, "energy": 2, "mood": 3, "sleep": 3,
                 "notes": "Dizzy in the morning", "symptoms": ["dizziness"]},
                {"date": _days_ago(14), "feeling_score": 3, "energy": 3, "mood": 3, "sleep": 4,
                 "notes": "", "symptoms": []},
                {"date": _days_ago(20), "feeling_score": 2, "energy": 2, "mood": 2, "sleep": 2,
                 "notes": "Bad day, nausea and tiredness", "symptoms": ["nausea", "fatigue"]},
            ],
            "patient-sita": [
                {"date": _days_ago(0), "feeling_score": 2, "energy": 1, "mood": 2, "sleep": 2,
                 "notes": "High fever persisting, body aches", "symptoms": ["fever", "body_ache", "cough"]},
                {"date": _days_ago(1), "feeling_score": 2, "energy": 2, "mood": 2, "sleep": 2,
                 "notes": "Fever not coming down", "symptoms": ["fever", "cough"]},
                {"date": _days_ago(2), "feeling_score": 3, "energy": 3, "mood": 3, "sleep": 3,
                 "notes": "Started feeling unwell", "symptoms": ["mild_fever"]},
            ],
        }

        # ── Smart alerts ──────────────────────────────────────────────────
        self.smart_alerts = {
            "patient-ramesh": [
                {
                    "id": "alert-1",
                    "type": "missed_dose_escalation",
                    "severity": "warning",
                    "title": "Missed Dose Escalation — Metformin",
                    "message": "Patient missed Metformin evening dose on Aug 13 (2 hrs past due). Caregiver Priya was notified; son called patient → dose eventually taken.",
                    "created_at": _days_ago(3),
                    "acknowledged": False,
                },
                {
                    "id": "alert-2",
                    "type": "lab_due",
                    "severity": "info",
                    "title": "Lab Re-Check Due — HbA1c",
                    "message": "Last HbA1c test was 3 months ago (Aug 10). Patient hasn't scheduled re-check yet. Consider reminding during this visit.",
                    "created_at": _days_ago(0),
                    "acknowledged": False,
                },
                {
                    "id": "alert-3",
                    "type": "symptom_streak",
                    "severity": "warning",
                    "title": "Low Energy Streak — 6 of 30 Days",
                    "message": "Patient reported low energy (≤2) on 6 of the last 30 days, mostly after Noveron evening dose. Consider dosage adjustment.",
                    "created_at": _days_ago(1),
                    "acknowledged": False,
                },
            ],
            "patient-sita": [
                {
                    "id": "alert-4",
                    "type": "symptom_streak",
                    "severity": "critical",
                    "title": "Persistent Fever — 3 Consecutive Days",
                    "message": "Patient has reported feeling score ≤2 for 3 consecutive days with persistent fever. Requires clinical evaluation.",
                    "created_at": _days_ago(0),
                    "acknowledged": False,
                },
            ],
        }

        # ── Caregiver audit (who marked doses) ───────────────────────────
        self.caregiver_audit = {
            "patient-ramesh": {
                "caregivers": [
                    {"name": "Priya Kumar (Daughter)", "role": "parent_child", "status": "active"},
                ],
                "dose_audit_7d": [
                    {"date": _days_ago(0), "time": "08:00 AM", "medicine": "Metformin", "marked_by": "patient", "marked_by_name": "Ramesh Kumar"},
                    {"date": _days_ago(0), "time": "01:00 PM", "medicine": "Noveron", "marked_by": "caregiver", "marked_by_name": "Priya Kumar"},
                    {"date": _days_ago(1), "time": "08:00 AM", "medicine": "Metformin", "marked_by": "caregiver", "marked_by_name": "Priya Kumar"},
                    {"date": _days_ago(1), "time": "01:00 PM", "medicine": "Noveron", "marked_by": "patient", "marked_by_name": "Ramesh Kumar"},
                    {"date": _days_ago(1), "time": "08:30 PM", "medicine": "Metformin", "marked_by": "patient", "marked_by_name": "Ramesh Kumar"},
                    {"date": _days_ago(2), "time": "08:00 AM", "medicine": "Metformin", "marked_by": "caregiver", "marked_by_name": "Priya Kumar"},
                    {"date": _days_ago(2), "time": "08:30 PM", "medicine": "Metformin", "marked_by": "patient", "marked_by_name": "Ramesh Kumar"},
                ],
                "summary": {
                    "total_doses_7d": 14,
                    "taken_7d": 11,
                    "marked_by_patient": 8,
                    "marked_by_caregiver": 3,
                },
            },
        }

        # ── Refill requests (pending for this doctor) ─────────────────────
        self.refill_requests = [
            {
                "id": "refill-1",
                "patient_id": "patient-ramesh",
                "patient_name": "Ramesh Kumar",
                "prescription_id": "rx-ramesh-2",
                "medicine_name": "Noveron 500mg",
                "dosage": "500mg",
                "frequency": "1-0-1",
                "remaining_days": 3,
                "refill_quantity": 10,
                "refills_available": 2,
                "max_refills": 3,
                "request_notes": "Running low, going on trip next week — need sooner",
                "requested_at": _days_ago(1),
                "requested_by_role": "patient",
                "status": "pending",
                "urgency": "urgent",
            },
            {
                "id": "refill-2",
                "patient_id": "patient-ramesh",
                "patient_name": "Ramesh Kumar",
                "prescription_id": "rx-ramesh-1",
                "medicine_name": "Metformin 500mg",
                "dosage": "500mg",
                "frequency": "2-0-2",
                "remaining_days": 20,
                "refill_quantity": 30,
                "refills_available": 3,
                "max_refills": 3,
                "request_notes": "",
                "requested_at": _days_ago(5),
                "requested_by_role": "patient",
                "status": "pending",
                "urgency": "normal",
            },
        ]

        # ── Visit prep insights (copilot refusals + patterns) ─────────────
        self.visit_prep = {
            "patient-ramesh": {
                "copilot_refusals": [
                    {"question": "Is my dizziness serious?", "answer_type": "guarded", "suggestion": "Copilot redirected to doctor. Proactively address dizziness concerns."},
                    {"question": "Can I stop taking Metformin if I feel better?", "answer_type": "guarded", "suggestion": "Patient considering stopping medication. Reinforce importance of continued treatment."},
                ],
                "copilot_answered": [
                    {"question": "Can I drink milk with Noveron?", "answer": "Yes, but separate by 30 minutes for optimal absorption."},
                ],
                "symptom_patterns": [
                    {"pattern": "Dizziness after Noveron evening dose", "frequency": "4 of last 14 days", "suggestion": "Consider dosage timing adjustment or alternative."},
                    {"pattern": "Low energy correlated with skipped morning doses", "frequency": "3 of 7 skip days had low energy", "suggestion": "Adherence improvement may reduce fatigue."},
                ],
                "suggested_topics": [
                    "Address dizziness — patient asked Copilot about seriousness",
                    "Reinforce Metformin adherence — patient asked about stopping",
                    "Schedule HbA1c re-check (3 months overdue)",
                    "Discuss Noveron refill timing (3 days remaining)",
                ],
            },
        }

        # ── Verification log (append-only) ────────────────────────────────
        self.verification_logs = []

        # ── Follow-up appointments ────────────────────────────────────────
        self.follow_ups = []

        # ── Draft prescriptions ───────────────────────────────────────────
        self.draft_prescriptions = {}

    # =====================================================================
    # QUEUE
    # =====================================================================

    def get_queue(self, doctor_id: str) -> dict:
        """Return acuity-sorted queue for a doctor."""
        doc_queue = [q for q in self.queue if q["doctor_id"] == doctor_id and q["status"] == "waiting"]
        # Sort by severity DESC, then queued_at ASC
        doc_queue.sort(key=lambda q: (
            -(q.get("chief_complaints", {}).get("severity_level", 1)),
            q.get("queued_at", ""),
        ))
        return {"queue": doc_queue, "count": len(doc_queue)}

    # =====================================================================
    # PATIENT DASHBOARD (unified view)
    # =====================================================================

    def get_patient_dashboard(self, patient_id: str, doctor_id: str) -> dict:
        """Full patient context for the doctor's workspace."""
        patient = self.patients.get(patient_id)
        if not patient:
            return {"error": f"Patient {patient_id} not found"}

        my_rx = self.my_prescriptions.get(patient_id, [])
        other_rx = self.other_prescriptions.get(patient_id, [])
        allergy_list = self.allergies.get(patient_id, [])
        symptoms = self.symptom_logs.get(patient_id, [])
        alerts = self.smart_alerts.get(patient_id, [])
        caregiver = self.caregiver_audit.get(patient_id, {})
        visit = self.visit_prep.get(patient_id, {})
        refills = [r for r in self.refill_requests if r["patient_id"] == patient_id and r["status"] == "pending"]

        # Calculate adherence score
        if caregiver.get("summary"):
            total = caregiver["summary"]["total_doses_7d"]
            taken = caregiver["summary"]["taken_7d"]
            adherence_score = round((taken / total * 100) if total > 0 else 0, 1)
        else:
            adherence_score = 0

        # Calculate symptom summary
        if symptoms:
            avg_feeling = round(sum(s["feeling_score"] for s in symptoms) / len(symptoms), 2)
            trending_symptoms = {}
            for s in symptoms:
                for sym in s.get("symptoms", []):
                    trending_symptoms[sym] = trending_symptoms.get(sym, 0) + 1
            top_symptoms = sorted(trending_symptoms.items(), key=lambda x: -x[1])[:5]
        else:
            avg_feeling = 3.0
            top_symptoms = []

        return {
            "patient": patient,
            "active_prescriptions_mine": my_rx,
            "active_prescriptions_others": other_rx,
            "allergy_profile": allergy_list,
            "adherence_score": adherence_score,
            "caregiver_audit": caregiver,
            "symptom_summary": {
                "avg_feeling": avg_feeling,
                "logs_this_month": len(symptoms),
                "trending_symptoms": [{"symptom": s[0], "count": s[1]} for s in top_symptoms],
                "alert_count": len([a for a in alerts if not a.get("acknowledged")]),
            },
            "smart_alerts": alerts,
            "pending_refills": refills,
            "visit_prep": visit,
            "scans": self.get_scans(patient_id),
            "diagnostic_orders": self.get_diagnostic_orders(patient_id),
        }

    # =====================================================================
    # GUARDRAIL CHECK
    # =====================================================================

    def guardrail_check(self, patient_id: str, medication_items: list[dict]) -> dict:
        """Run pharmacological guardrail check for a patient."""
        # Get existing medications from other doctors
        existing = self.other_prescriptions.get(patient_id, [])
        existing_meds = [
            {
                "medication_id": rx.get("medication_id", rx.get("id", "")),
                "name": rx.get("medication_name", ""),
                "doctor_name": rx.get("doctor_name", "Another doctor"),
            }
            for rx in existing
        ]

        # Get patient allergies
        patient_allergies = self.allergies.get(patient_id, [])

        result = run_guardrail_check(
            medication_items=medication_items,
            existing_medications=existing_meds,
            patient_allergies=patient_allergies,
        )

        return {"safe": result.safe, "flags": result.flags}

    # =====================================================================
    # VERIFICATION (sign-off)
    # =====================================================================

    def verify_prescription(
        self,
        prescription_id: str,
        doctor_id: str,
        final_state: dict,
        acknowledged_flags: list[dict] | None = None,
    ) -> dict:
        """Immutable sign-off: hash + verification log + status update."""
        protocol_hash = "sha256:" + hashlib.sha256(
            json.dumps(final_state, sort_keys=True).encode()
        ).hexdigest()

        log_entry = {
            "id": str(uuid.uuid4()),
            "prescription_id": prescription_id,
            "doctor_id": doctor_id,
            "protocol_hash": protocol_hash,
            "signed_at": _now_iso(),
            "acknowledged_flags": acknowledged_flags or [],
        }
        self.verification_logs.append(log_entry)

        return {
            "status": "verified",
            "protocol_hash": protocol_hash,
            "verified_at": log_entry["signed_at"],
        }

    # =====================================================================
    # REFILL REQUESTS
    # =====================================================================

    def get_pending_refills(self, doctor_id: str) -> list[dict]:
        """Get all pending refill requests for this doctor."""
        return sorted(
            [r for r in self.refill_requests if r["status"] == "pending"],
            key=lambda r: r.get("remaining_days", 999),
        )

    def approve_refill(self, refill_id: str, doctor_id: str, doctor_notes: str = "") -> dict:
        """Approve a refill request."""
        for r in self.refill_requests:
            if r["id"] == refill_id:
                r["status"] = "approved"
                r["approved_at"] = _now_iso()
                r["approved_by"] = doctor_id
                r["doctor_response_notes"] = doctor_notes
                return {"status": "approved", "approved_at": r["approved_at"]}
        return {"error": f"Refill {refill_id} not found"}

    def deny_refill(self, refill_id: str, doctor_id: str, reason: str = "") -> dict:
        """Deny a refill request."""
        for r in self.refill_requests:
            if r["id"] == refill_id:
                r["status"] = "denied"
                r["denied_at"] = _now_iso()
                r["denied_by"] = doctor_id
                r["doctor_response_notes"] = reason
                return {"status": "denied", "denied_at": r["denied_at"]}
        return {"error": f"Refill {refill_id} not found"}

    # =====================================================================
    # PATIENT CONTEXT — Symptoms, Caregivers, Allergies, Visit Prep
    # =====================================================================

    def get_symptoms(self, patient_id: str, days: int = 30) -> dict:
        """Get patient symptom logs for the last N days."""
        logs = self.symptom_logs.get(patient_id, [])
        cutoff = _days_ago(days)
        filtered = [l for l in logs if l["date"] >= cutoff]

        if filtered:
            avg_score = round(sum(l["feeling_score"] for l in filtered) / len(filtered), 2)
        else:
            avg_score = 0

        alerts = [a for a in self.smart_alerts.get(patient_id, [])
                  if a["type"] == "symptom_streak"]

        return {
            "logs": filtered,
            "avg_score": avg_score,
            "alert_count": len(alerts),
            "alerts": alerts,
        }

    def get_caregiver_audit(self, patient_id: str) -> dict:
        """Get caregiver dose-marking audit for a patient."""
        # ── Scans & X-Ray Analysis (Side-by-Side OCR & X-ray Canvas) ──────
        self.scans = {
            "patient-ramesh": {
                "prescription_scan": {
                    "scan_id": "scan-rx-ramesh-101",
                    "uploaded_at": _days_ago(1),
                    "image_url": "/api/placeholder/scan/rx-ramesh.jpg",
                    "ocr_fields": [
                        {
                            "medication_id": "med-metformin",
                            "name": "Metformin",
                            "dosage": "500mg",
                            "frequency": "2-0-2",
                            "duration_days": 30,
                            "confidence": 0.94,
                            "condition_tag": "DIABETES",
                            "doctor_edited": False,
                        },
                        {
                            "medication_id": "med-noveron",
                            "name": "Noveron",
                            "dosage": "500mg",
                            "frequency": "1-0-1",
                            "duration_days": 10,
                            "confidence": 0.88,
                            "condition_tag": "HEART CARE",
                            "doctor_edited": False,
                        },
                    ],
                },
                "xray_scan": {
                    "scan_id": "scan-xray-ramesh-201",
                    "uploaded_at": _days_ago(2),
                    "anatomical_region": "Left Wrist / Forearm AP & Lateral",
                    "image_url": "/api/placeholder/scan/xray-wrist.jpg",
                    "detections": [
                        {
                            "label": "fracture",
                            "confidence": 0.92,
                            "box": {"x": 140, "y": 95, "w": 75, "h": 50},
                            "anatomical_site": "Left distal radius fracture (non-displaced)",
                        },
                        {
                            "label": "boneanomaly",
                            "confidence": 0.78,
                            "box": {"x": 210, "y": 160, "w": 45, "h": 40},
                            "anatomical_site": "Mild localized osteopenia",
                        },
                    ],
                },
            },
            "patient-vikram": {
                "prescription_scan": {
                    "scan_id": "scan-rx-vikram-102",
                    "uploaded_at": _days_ago(0),
                    "image_url": "/api/placeholder/scan/rx-vikram.jpg",
                    "ocr_fields": [
                        {
                            "medication_id": "med-atenolol",
                            "name": "Atenolol",
                            "dosage": "50mg",
                            "frequency": "1-0-0",
                            "duration_days": 30,
                            "confidence": 0.96,
                            "condition_tag": "HYPERTENSION",
                            "doctor_edited": False,
                        },
                    ],
                },
                "xray_scan": {
                    "scan_id": "scan-xray-vikram-202",
                    "uploaded_at": _days_ago(0),
                    "anatomical_region": "Chest PA View",
                    "image_url": "/api/placeholder/scan/xray-chest.jpg",
                    "detections": [
                        {
                            "label": "cardiomegaly",
                            "confidence": 0.89,
                            "box": {"x": 110, "y": 120, "w": 180, "h": 140},
                            "anatomical_site": "Enlarged cardiac silhouette (CTR > 0.55)",
                        },
                    ],
                },
            },
            "patient-sita": {
                "prescription_scan": {
                    "scan_id": "scan-rx-sita-103",
                    "uploaded_at": _days_ago(2),
                    "image_url": "/api/placeholder/scan/rx-sita.jpg",
                    "ocr_fields": [
                        {
                            "medication_id": "med-pcm",
                            "name": "Paracetamol",
                            "dosage": "500mg",
                            "frequency": "1-1-1",
                            "duration_days": 5,
                            "confidence": 0.92,
                            "condition_tag": "FEVER",
                            "doctor_edited": False,
                        },
                    ],
                },
                "xray_scan": {
                    "scan_id": "scan-xray-sita-203",
                    "uploaded_at": _days_ago(1),
                    "anatomical_region": "Chest PA View",
                    "image_url": "/api/placeholder/scan/xray-chest-sita.jpg",
                    "detections": [
                        {
                            "label": "consolidation",
                            "confidence": 0.84,
                            "box": {"x": 160, "y": 140, "w": 90, "h": 80},
                            "anatomical_site": "Right middle lobe patchy consolidation (consistent with pneumonia)",
                        },
                    ],
                },
            },
        }

        # ── Diagnostic Orders (Lab Tests) ──────────────────────────────────
        self.diagnostic_orders = {
            "patient-ramesh": [
                {
                    "id": "order-lab-1",
                    "test_name": "Complete Blood Count (CBC)",
                    "category": "Hematology",
                    "status": "results_ready",
                    "ordered_at": _days_ago(3),
                    "ordered_by": "Dr. Nitin Sharma",
                    "doctor_summary": "Hb 13.8 g/dL (Normal), WBC 7,200 /mcL (Normal), Platelets 240,000 /mcL",
                    "patient_summary": "Your blood counts and infection markers are completely within normal healthy range.",
                },
                {
                    "id": "order-lab-2",
                    "test_name": "HbA1c (Glycated Hemoglobin)",
                    "category": "Diabetic Profile",
                    "status": "pending_draw",
                    "ordered_at": _days_ago(0),
                    "ordered_by": "Dr. Nitin Sharma",
                    "notes": "Fast for 8 hours prior to morning sample draw.",
                },
                {
                    "id": "order-lab-3",
                    "test_name": "Fasting Lipid Profile",
                    "category": "Biochemistry",
                    "status": "analyzing",
                    "ordered_at": _days_ago(1),
                    "ordered_by": "Dr. Nitin Sharma",
                    "notes": "Lipid panel sent to pathology lab.",
                },
            ],
            "patient-vikram": [
                {
                    "id": "order-lab-4",
                    "test_name": "Serum Troponin I & CK-MB",
                    "category": "Cardiac Biomarkers",
                    "status": "results_ready",
                    "ordered_at": _days_ago(0),
                    "ordered_by": "Dr. Nitin Sharma",
                    "doctor_summary": "Troponin I: 0.08 ng/mL (Borderline Elevated), CK-MB: 24 U/L",
                    "patient_summary": "Slightly elevated cardiac enzyme markers. Doctor is monitoring cardiac stability.",
                },
            ],
        }

        # ── Follow-ups & Verification Logs ─────────────────────────────────
        self.follow_ups = []
        self.verification_logs = []

    def get_caregiver_audit(self, patient_id: str) -> dict:
        """Get caregiver dose-marking audit for a patient."""
        return self.caregiver_audit.get(patient_id, {
            "caregivers": [],
            "dose_audit_7d": [],
            "summary": {"total_doses_7d": 0, "taken_7d": 0, "marked_by_patient": 0, "marked_by_caregiver": 0},
        })

    def get_allergies(self, patient_id: str) -> list[dict]:
        """Get patient allergy profile."""
        return self.allergies.get(patient_id, [])

    def get_visit_prep(self, patient_id: str) -> dict:
        """Get visit prep insights for a patient."""
        return self.visit_prep.get(patient_id, {
            "copilot_refusals": [],
            "copilot_answered": [],
            "symptom_patterns": [],
            "suggested_topics": [],
        })

    def get_scans(self, patient_id: str) -> dict:
        """Get raw prescription scan and X-ray analysis for a patient."""
        return self.scans.get(patient_id, {
            "prescription_scan": None,
            "xray_scan": None,
        })

    def get_diagnostic_orders(self, patient_id: str) -> list[dict]:
        """Get diagnostic lab orders for a patient."""
        return self.diagnostic_orders.get(patient_id, [])

    def order_lab_test(
        self,
        patient_id: str,
        doctor_id: str,
        test_name: str,
        category: str = "General Diagnostics",
        clinical_notes: str = "",
    ) -> dict:
        """Place a new diagnostic lab order."""
        new_order = {
            "id": f"order-lab-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "test_name": test_name,
            "category": category,
            "status": "pending_draw",
            "ordered_at": _now_iso(),
            "ordered_by": "Dr. Nitin Sharma",
            "notes": clinical_notes,
        }
        if patient_id not in self.diagnostic_orders:
            self.diagnostic_orders[patient_id] = []
        self.diagnostic_orders[patient_id].insert(0, new_order)
        return {"status": "created", "order": new_order}

    # =====================================================================
    # DICTATION (mock SOAP)
    # =====================================================================

    def process_dictation(self, prescription_id: str) -> dict:
        """Mock SOAP note generation from dictation."""
        return {
            "status": "completed",
            "prescription_id": prescription_id,
            "transcript": (
                "Patient Ramesh Kumar, 58 year old male presenting for diabetes follow-up. "
                "Reports occasional dizziness especially after evening Noveron dose. "
                "Blood sugar levels have been stable around 140-160 fasting. "
                "Currently on Metformin 500mg twice daily and Noveron 500mg twice daily. "
                "Physical exam unremarkable, BP 130/85, pulse 78 regular. "
                "Plan to continue current regimen, consider reducing Noveron evening dose "
                "if dizziness persists. Schedule HbA1c recheck."
            ),
            "soap_note": {
                "S": "58M presenting for diabetes follow-up. C/O occasional dizziness, especially after evening Noveron dose. Blood sugars stable 140-160mg/dL fasting. No chest pain, no SOB, no polyuria.",
                "O": "BP 130/85 mmHg, HR 78 bpm regular, RR 16, SpO2 98% RA. General appearance: well-nourished, no acute distress. CVS: S1S2 normal, no murmur. Lungs: clear bilateral. Abdomen: soft, non-tender.",
                "A": "1. Type 2 Diabetes Mellitus — controlled on current regimen\n2. Dizziness — possibly medication-related (Noveron evening dose)\n3. Cardiovascular risk — on anticoagulation via cardiology",
                "P": "1. Continue Metformin 500mg 2-0-2\n2. Consider reducing Noveron to 500mg 1-0-0 (morning only) if dizziness persists beyond 1 week\n3. Order HbA1c, fasting lipid panel, serum creatinine\n4. Follow-up in 2 weeks\n5. Patient counseled on medication adherence importance",
            },
        }

    # =====================================================================
    # FOLLOW-UP SCHEDULING
    # =====================================================================

    def create_follow_up(
        self,
        patient_id: str,
        doctor_id: str,
        scheduled_date: str,
        reason: str = "",
    ) -> dict:
        """Create a follow-up appointment and auto-generate reminder."""
        entry = {
            "id": str(uuid.uuid4()),
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_date": scheduled_date,
            "reason": reason,
            "status": "scheduled",
            "created_at": _now_iso(),
        }
        self.follow_ups.append(entry)

        patient = self.patients.get(patient_id, {})
        return {
            "follow_up": entry,
            "reminder_created": True,
            "patient_name": patient.get("full_name", "Unknown"),
            "message": f"Follow-up scheduled for {scheduled_date}. Patient will receive an automated reminder.",
        }

    # =====================================================================
    # ALERT ACKNOWLEDGMENT
    # =====================================================================

    def acknowledge_alert(self, alert_id: str, doctor_id: str) -> dict:
        """Acknowledge a smart alert."""
        for patient_id, alerts in self.smart_alerts.items():
            for alert in alerts:
                if alert["id"] == alert_id:
                    alert["acknowledged"] = True
                    alert["acknowledged_at"] = _now_iso()
                    alert["acknowledged_by"] = doctor_id
                    return {"status": "acknowledged", "alert_id": alert_id}
        return {"error": f"Alert {alert_id} not found"}


# Singleton
doctor_service = DoctorService()
