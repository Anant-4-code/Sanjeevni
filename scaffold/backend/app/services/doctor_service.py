"""
Sanjeevani â€” Doctor Service (In-Memory Demo Data)
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
        # â”€â”€ Demo patients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        # â”€â”€ Doctor queue (acuity-sorted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    "text": "High fever (102Â°F) for 3 days, persistent cough with yellow sputum",
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

        # â”€â”€ Active prescriptions (this doctor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        # â”€â”€ Active prescriptions (other doctors â†’ cross-doctor view) â”€â”€â”€â”€â”€
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

        # â”€â”€ Allergy profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    "notes": "Severe reaction to Bactrim â€” anaphylactic risk",
                },
            ],
        }

        # â”€â”€ Symptom logs (30-day window) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        # â”€â”€ Smart alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        self.smart_alerts = {
            "patient-ramesh": [
                {
                    "id": "alert-1",
                    "type": "missed_dose_escalation",
                    "severity": "warning",
                    "title": "Missed Dose Escalation â€” Metformin",
                    "message": "Patient missed Metformin evening dose on Aug 13 (2 hrs past due). Caregiver Priya was notified; son called patient â†’ dose eventually taken.",
                    "created_at": _days_ago(3),
                    "acknowledged": False,
                },
                {
                    "id": "alert-2",
                    "type": "lab_due",
                    "severity": "info",
                    "title": "Lab Re-Check Due â€” HbA1c",
                    "message": "Last HbA1c test was 3 months ago (Aug 10). Patient hasn't scheduled re-check yet. Consider reminding during this visit.",
                    "created_at": _days_ago(0),
                    "acknowledged": False,
                },
                {
                    "id": "alert-3",
                    "type": "symptom_streak",
                    "severity": "warning",
                    "title": "Low Energy Streak â€” 6 of 30 Days",
                    "message": "Patient reported low energy (â‰¤2) on 6 of the last 30 days, mostly after Noveron evening dose. Consider dosage adjustment.",
                    "created_at": _days_ago(1),
                    "acknowledged": False,
                },
            ],
            "patient-sita": [
                {
                    "id": "alert-4",
                    "type": "symptom_streak",
                    "severity": "critical",
                    "title": "Persistent Fever â€” 3 Consecutive Days",
                    "message": "Patient has reported feeling score â‰¤2 for 3 consecutive days with persistent fever. Requires clinical evaluation.",
                    "created_at": _days_ago(0),
                    "acknowledged": False,
                },
            ],
        }

        # â”€â”€ Caregiver audit (who marked doses) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        # â”€â”€ Refill requests (pending for this doctor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                "request_notes": "Running low, going on trip next week â€” need sooner",
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

        # â”€â”€ Visit prep insights (copilot refusals + patterns) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    "Address dizziness â€” patient asked Copilot about seriousness",
                    "Reinforce Metformin adherence â€” patient asked about stopping",
                    "Schedule HbA1c re-check (3 months overdue)",
                    "Discuss Noveron refill timing (3 days remaining)",
                ],
            },
        }

        # â”€â”€ Comprehensive Multi-Category Medical Records & Documents â”€â”€â”€â”€â”€â”€â”€â”€
        self.medical_records = {
            "patient-ramesh": [
                {
                    "id": "doc-rx-mithun",
                    "title": "Neurology Consultation & Previous Rx",
                    "category": "Prescription",
                    "doctor_name": "Dr. G. Mithun",
                    "doctor_specialty": "Consultant Neuro Surgeon",
                    "clinic": "Manikanta Neuro Centre, Kakaji Colony",
                    "date": _days_ago(14),
                    "badge": "Prior Specialist Rx",
                    "file_type": "Handwritten & Digital Rx",
                    "summary": "Evaluation of peripheral neuropathic burning in feet and occasional postural dizziness. Prescribed Gabapin NT 100mg and Neurobion Forte.",
                    "findings": [
                        {"label": "Chief Complaint", "value": "Bilateral burning feet sensation, occasional postural instability"},
                        {"label": "Reflexes", "value": "Ankle jerks diminished, plantar flexor bilaterally"},
                        {"label": "Prescribed Rx", "value": "Gabapin NT (Gabapentin 100mg + Nortriptyline 10mg) 0-0-1 x 10d"},
                        {"label": "Neurobion", "value": "Neurobion Forte 1 tab daily with water x 30d"},
                    ],
                    "plain_language": "Neurologist evaluated nerve tingling/burning in feet and prescribed nerve pain relief medication for 10 days.",
                    "status": "active"
                },
                {
                    "id": "doc-rx-rai",
                    "title": "Cardiology Workup & Anticoagulation Protocol",
                    "category": "Prescription",
                    "doctor_name": "Dr. V. K. Rai",
                    "doctor_specialty": "Senior Interventional Cardiologist",
                    "clinic": "City Heart & Vascular Institute",
                    "date": _days_ago(45),
                    "badge": "Active Anticoagulation",
                    "file_type": "Digital Clinical Rx",
                    "summary": "Post-angioplasty 6-month review. Stable hemodynamics. Maintained on Warfarin 5mg and Aspirin 100mg with regular INR titration.",
                    "findings": [
                        {"label": "ECG", "value": "Sinus rhythm, HR 72 bpm, no acute ST-T changes"},
                        {"label": "2D Echo", "value": "LVEF 58%, concentric LVH, no regional wall motion abnormalities"},
                        {"label": "Target INR", "value": "2.0 - 2.5 (Current INR 2.2 on 5mg)"},
                    ],
                    "plain_language": "Heart specialist confirmed stable recovery and healthy blood flow with ongoing blood thinner medication.",
                    "status": "active"
                },
                {
                    "id": "doc-lab-cbc",
                    "title": "Comprehensive Blood Panel (CBC + Differential)",
                    "category": "Lab Report",
                    "doctor_name": "Dr. S. K. Patel",
                    "doctor_specialty": "Pathology & Diagnostics",
                    "clinic": "Apex Diagnostic Labs",
                    "date": _days_ago(12),
                    "badge": "Recent Labs",
                    "file_type": "Diagnostic Report PDF",
                    "summary": "Complete hemogram in healthy normal ranges. Normal platelet count, normal WBC, no active infection.",
                    "findings": [
                        {"label": "Hemoglobin (Hb)", "value": "13.5 g/dL", "normal_range": "13.5 - 17.5 g/dL", "status": "normal"},
                        {"label": "WBC Count", "value": "7,200 /ÂµL", "normal_range": "4,500 - 11,000 /ÂµL", "status": "normal"},
                        {"label": "Platelet Count", "value": "240,000 /ÂµL", "normal_range": "150,000 - 450,000 /ÂµL", "status": "normal"},
                        {"label": "ESR", "value": "12 mm/hr", "normal_range": "0 - 15 mm/hr", "status": "normal"},
                    ],
                    "plain_language": "Blood counts, oxygen capacity, and immune cells are in a completely healthy normal range.",
                    "status": "normal"
                },
                {
                    "id": "doc-lab-hba1c",
                    "title": "Glycated Hemoglobin (HbA1c) & Fasting Glucose",
                    "category": "Lab Report",
                    "doctor_name": "Dr. S. K. Patel",
                    "doctor_specialty": "Apex Diabetes Centre",
                    "clinic": "Apex Diagnostic Labs",
                    "date": _days_ago(90),
                    "badge": "Overdue for Recheck",
                    "file_type": "Biochemistry Report",
                    "summary": "HbA1c 7.8% indicates moderate diabetic control. Down from 8.4% 6 months prior. 3-month recheck recommended today.",
                    "findings": [
                        {"label": "HbA1c", "value": "7.8 %", "normal_range": "< 5.7% (Diabetic target < 7.0%)", "status": "warning"},
                        {"label": "Fasting Plasma Glucose", "value": "148 mg/dL", "normal_range": "70 - 100 mg/dL", "status": "warning"},
                        {"label": "Estimated Avg Glucose (eAG)", "value": "177 mg/dL", "normal_range": "< 140 mg/dL", "status": "warning"},
                    ],
                    "plain_language": "3-month blood sugar average was 7.8%. Progressing well, but due for quarterly re-testing today.",
                    "status": "warning"
                },
                {
                    "id": "doc-img-xray",
                    "title": "Right Wrist & Distal Radius Digital X-Ray",
                    "category": "Imaging & Radiology",
                    "doctor_name": "Dr. A. Mehra",
                    "doctor_specialty": "Consultant Radiologist",
                    "clinic": "Central Imaging & MRI Centre",
                    "date": _days_ago(5),
                    "badge": "AI Fracture Detected",
                    "file_type": "DICOM / Digital X-Ray",
                    "summary": "AP and Lateral views of right wrist. Non-displaced cortical hairline fissure at distal radius metaphysis.",
                    "findings": [
                        {"label": "Cortical Margin", "value": "Faint radiolucent cortical line at distal radial aspect (YOLOv7 92%)"},
                        {"label": "Joint Space", "value": "Radiocarpal joint space preserved, no subluxation"},
                        {"label": "Soft Tissue", "value": "Mild dorsal soft tissue edema without radio-opaque foreign body"},
                    ],
                    "plain_language": "Minor hairline crack in wrist bone without displacement. Recommend immobilization splint.",
                    "status": "alert"
                },
                {
                    "id": "doc-img-mri",
                    "title": "Brain MRI with Diffusion & Contrast",
                    "category": "Imaging & Radiology",
                    "doctor_name": "Dr. G. Mithun",
                    "doctor_specialty": "Manikanta Neuro Centre",
                    "clinic": "Advanced MRI & Neuro Imaging",
                    "date": _days_ago(20),
                    "badge": "Normal Neuro Scan",
                    "file_type": "DICOM / High-Res MRI",
                    "summary": "1.5T Brain MRI showing normal intracranial parenchyma, no acute infarct, mass lesion or hemorrhage.",
                    "findings": [
                        {"label": "DWI / ADC", "value": "No restricted diffusion to suggest acute ischemic stroke"},
                        {"label": "Ventricles", "value": "Age-appropriate mild cortical prominence, normal ventricles"},
                        {"label": "Vascular Flow", "value": "Major intracranial arterial flow voids preserved"},
                    ],
                    "plain_language": "Brain scan is completely clear with no signs of stroke, bleeding, or vascular blockages.",
                    "status": "normal"
                },
                {
                    "id": "doc-hosp-discharge",
                    "title": "Hospital Discharge Summary & Cath Report",
                    "category": "Discharge Summary",
                    "doctor_name": "Dr. V. K. Rai",
                    "doctor_specialty": "Apollo Heart Institute",
                    "clinic": "Apollo Hospital, Bannerghatta",
                    "date": _days_ago(180),
                    "badge": "Hospital Record",
                    "file_type": "Clinical Discharge PDF",
                    "summary": "Planned observational admission for coronary evaluation. Uneventful 48h stay. Discharged hemodynamically stable.",
                    "findings": [
                        {"label": "Admission Diagnosis", "value": "Unstable Angina â€” Rule out NSTEMI (Troponin I Negative x 2)"},
                        {"label": "Coronary Angiography", "value": "Prior LAD stent widely patent with TIMI-3 distal flow"},
                        {"label": "Discharge Medication", "value": "Warfarin 5mg, Metformin 500mg, Atorvastatin 40mg, Pantoprazole 40mg"},
                    ],
                    "plain_language": "Hospital discharge report confirming healthy heart stent function and stable discharge status.",
                    "status": "verified"
                }
            ],
            "patient-priya": [
                {
                    "id": "doc-priya-1",
                    "title": "General Health Checkup & CBC",
                    "category": "Lab Report",
                    "doctor_name": "Dr. R. Sharma",
                    "doctor_specialty": "Internal Medicine",
                    "clinic": "City Care Clinic",
                    "date": _days_ago(14),
                    "badge": "Mild Anemia",
                    "file_type": "Lab Report",
                    "summary": "Hemoglobin 11.2 g/dL indicates mild iron deficiency anemia. Vitamin D3 18 ng/mL (insufficient).",
                    "findings": [
                        {"label": "Hemoglobin", "value": "11.2 g/dL", "normal_range": "12.0 - 15.5 g/dL", "status": "warning"},
                        {"label": "Vitamin D3", "value": "18 ng/mL", "normal_range": "30 - 100 ng/mL", "status": "warning"},
                    ],
                    "plain_language": "Mild iron and Vitamin D insufficiency. Supplements recommended.",
                    "status": "warning"
                }
            ]
        }

        # â”€â”€ Scans & OCR Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        self.scans = {
            "patient-ramesh": {
                "prescription_scan": {
                    "scan_id": "scan-ramesh-1",
                    "image_url": "/api/scans/prescription-ramesh.jpg",
                    "raw_text": "Metformin 500mg BID [DIABETES]\nNoveron 500mg BD [HEART CARE]\nTab Gabapin NT 100mg HS x 10d",
                    "ocr_fields": [
                        {"name": "Metformin", "dosage": "500mg", "frequency": "2-0-2", "duration_days": 30, "condition_tag": "DIABETES", "confidence": 0.96},
                        {"name": "Noveron", "dosage": "500mg", "frequency": "1-0-1", "duration_days": 10, "condition_tag": "HEART CARE", "confidence": 0.94},
                        {"name": "Gabapin NT", "dosage": "100mg", "frequency": "0-0-1", "duration_days": 10, "condition_tag": "NERVE CARE", "confidence": 0.91},
                    ]
                },
                "xray_scan": {
                    "scan_id": "scan-ramesh-xray",
                    "image_url": "/api/scans/xray-wrist.jpg",
                    "anatomical_region": "Right Wrist / Distal Radius",
                    "model": "YOLOv7-p6-BoneFracture-ONNX",
                    "detections": [
                        {"label": "fracture", "confidence": 0.92, "box": {"x": 120, "y": 85, "w": 130, "h": 75}, "description": "Hairline distal radial fracture fissure"},
                        {"label": "boneanomaly", "confidence": 0.74, "box": {"x": 170, "y": 180, "w": 65, "h": 50}, "description": "Mild styloid osteopenia"}
                    ]
                }
            }
        }

        # â”€â”€ Diagnostic Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        self.diagnostic_orders = {
            "patient-ramesh": [
                {
                    "id": "order-lab-1",
                    "patient_id": "patient-ramesh",
                    "test_name": "HbA1c (Glycated Hemoglobin)",
                    "category": "Diabetic Profile",
                    "status": "pending_draw",
                    "ordered_at": _days_ago(1),
                    "ordered_by": "Dr. Nitin Sharma",
                    "notes": "Quarterly diabetic control recheck; compare against 7.8% baseline",
                    "doctor_summary": "Quarterly monitoring for Metformin efficacy",
                    "patient_summary": "Routine 3-month sugar test to see how well diabetes is controlled."
                },
                {
                    "id": "order-lab-2",
                    "patient_id": "patient-ramesh",
                    "test_name": "Complete Blood Count (CBC)",
                    "category": "Hematology",
                    "status": "results_ready",
                    "ordered_at": _days_ago(12),
                    "ordered_by": "Dr. S. K. Patel",
                    "notes": "Fasting blood sample, routine annual screening",
                    "doctor_summary": "Hemoglobin 13.5 g/dL, WBC 7.2 x10^9/L, Platelets 240,000 /uL (All Normal)",
                    "patient_summary": "Your blood count, red cells, and white cells are completely healthy."
                },
                {
                    "id": "order-lab-3",
                    "patient_id": "patient-ramesh",
                    "test_name": "Fasting Lipid Profile",
                    "category": "Biochemistry",
                    "status": "results_ready",
                    "ordered_at": _days_ago(45),
                    "ordered_by": "Dr. V. K. Rai",
                    "notes": "12-hour fasting sample; post-stent cardiac evaluation",
                    "doctor_summary": "Total Cholesterol 185 mg/dL, HDL 42 mg/dL, LDL 112 mg/dL, Triglycerides 155 mg/dL",
                    "patient_summary": "Cholesterol levels are in a safe range. Continue heart-healthy diet."
                }
            ]
        }

        # â”€â”€ Verification log (append-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        self.verification_logs = []

        # â”€â”€ Follow-up appointments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        self.follow_ups = []

        # â”€â”€ Draft prescriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        # ?? Patient Documents (Multi-Document Store, Spec 12) ????????????????
        self.patient_documents = [
            # --- Ramesh Kumar (patient-ramesh) ---
            {
                "id": "doc-001", "patient_id": "patient-ramesh",
                "category": "lab_report", "source": "clinic_verified",
                "title": "CBC — Complete Blood Count",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(180),
                "uploaded_at": _days_ago(180), "is_current_version": True,
            },
            {
                "id": "doc-002", "patient_id": "patient-ramesh",
                "category": "lab_report", "source": "clinic_verified",
                "title": "HbA1c — Feb 2025",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(540),
                "uploaded_at": _days_ago(540), "is_current_version": True,
            },
            {
                "id": "doc-003", "patient_id": "patient-ramesh",
                "category": "lab_report", "source": "clinic_verified",
                "title": "HbA1c — May 2025",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(450),
                "uploaded_at": _days_ago(450), "is_current_version": True,
            },
            {
                "id": "doc-004", "patient_id": "patient-ramesh",
                "category": "lab_report", "source": "clinic_verified",
                "title": "HbA1c — Aug 2025",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(365),
                "uploaded_at": _days_ago(365), "is_current_version": True,
            },
            {
                "id": "doc-005", "patient_id": "patient-ramesh",
                "category": "lab_report", "source": "clinic_verified",
                "title": "HbA1c — Feb 2026",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(180),
                "uploaded_at": _days_ago(180), "is_current_version": True,
            },
            {
                "id": "doc-006", "patient_id": "patient-ramesh",
                "category": "lab_report", "source": "clinic_verified",
                "title": "CBC — Aug 2026",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(9),
                "uploaded_at": _days_ago(9), "is_current_version": True,
            },
            {
                "id": "doc-007", "patient_id": "patient-ramesh",
                "category": "xray_scan", "source": "clinic_verified",
                "title": "Chest X-Ray — Dr. Rai",
                "file_url": None, "file_type": "jpg",
                "uploaded_by_role": "doctor", "document_date": _days_ago(60),
                "uploaded_at": _days_ago(60), "is_current_version": True,
            },
            {
                "id": "doc-008", "patient_id": "patient-ramesh",
                "category": "xray_scan", "source": "clinic_verified",
                "title": "Lumbar MRI — Jul 2026",
                "file_url": None, "file_type": "dicom",
                "uploaded_by_role": "doctor", "document_date": _days_ago(50),
                "uploaded_at": _days_ago(50), "is_current_version": True,
            },
            {
                "id": "doc-009", "patient_id": "patient-ramesh",
                "category": "discharge_summary", "source": "patient_uploaded",
                "title": "Discharge Summary (City Hospital)",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "patient", "document_date": _days_ago(200),
                "uploaded_at": _days_ago(30), "is_current_version": True,
            },
            {
                "id": "doc-010", "patient_id": "patient-ramesh",
                "category": "prescription", "source": "clinic_verified",
                "title": "Rx — Metformin 500mg — Dr. Sharma",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "doctor", "document_date": _days_ago(90),
                "uploaded_at": _days_ago(90), "is_current_version": True,
            },
            {
                "id": "doc-011", "patient_id": "patient-ramesh",
                "category": "prescription", "source": "clinic_verified",
                "title": "Rx — Warfarin 5mg — Dr. Rai",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "doctor", "document_date": _days_ago(150),
                "uploaded_at": _days_ago(150), "is_current_version": True,
            },
            {
                "id": "doc-012", "patient_id": "patient-ramesh",
                "category": "prescription", "source": "clinic_verified",
                "title": "Rx — Gabapin NT 100mg — Dr. Rai",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "doctor", "document_date": _days_ago(5),
                "uploaded_at": _days_ago(5), "is_current_version": True,
            },
            {
                "id": "doc-013", "patient_id": "patient-ramesh",
                "category": "vaccination", "source": "clinic_verified",
                "title": "Influenza Vaccine — 2025",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "reception", "document_date": _days_ago(300),
                "uploaded_at": _days_ago(300), "is_current_version": True,
            },
            {
                "id": "doc-014", "patient_id": "patient-ramesh",
                "category": "other", "source": "patient_uploaded",
                "title": "Insurance Pre-Auth Letter",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "patient", "document_date": _days_ago(20),
                "uploaded_at": _days_ago(15), "is_current_version": True,
            },
            # --- Vikram Singh (patient-vikram) ---
            {
                "id": "doc-101", "patient_id": "patient-vikram",
                "category": "lab_report", "source": "clinic_verified",
                "title": "Serum Troponin I & CK-MB",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(1),
                "uploaded_at": _days_ago(1), "is_current_version": True,
            },
            {
                "id": "doc-102", "patient_id": "patient-vikram",
                "category": "xray_scan", "source": "clinic_verified",
                "title": "Chest X-Ray — Cardiac Eval",
                "file_url": None, "file_type": "jpg",
                "uploaded_by_role": "doctor", "document_date": _days_ago(2),
                "uploaded_at": _days_ago(2), "is_current_version": True,
            },
            {
                "id": "doc-103", "patient_id": "patient-vikram",
                "category": "prescription", "source": "clinic_verified",
                "title": "Rx — Aspirin 150mg — Dr. Sharma",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "doctor", "document_date": _days_ago(3),
                "uploaded_at": _days_ago(3), "is_current_version": True,
            },
            # --- Sita Devi (patient-sita) ---
            {
                "id": "doc-201", "patient_id": "patient-sita",
                "category": "lab_report", "source": "clinic_verified",
                "title": "CBC with ESR",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "lab", "document_date": _days_ago(4),
                "uploaded_at": _days_ago(4), "is_current_version": True,
            },
            {
                "id": "doc-202", "patient_id": "patient-sita",
                "category": "discharge_summary", "source": "patient_uploaded",
                "title": "Previous Hospital Discharge — Dengue 2024",
                "file_url": None, "file_type": "pdf",
                "uploaded_by_role": "patient", "document_date": _days_ago(400),
                "uploaded_at": _days_ago(10), "is_current_version": True,
            },
        ]

        # ?? Cross-Doctor Prescription Timeline ???????????????????????????????
        self.prescriptions_timeline = {
            "patient-ramesh": [
                {"id": "rx-timeline-1", "doctor_name": "Dr. Rai", "doctor_specialty": "General Medicine", "medicine_name": "Gabapin NT 100mg", "dosage": "1-0-1", "status": "verified", "verified_at": _days_ago(5)},
                {"id": "rx-timeline-2", "doctor_name": "Dr. Sharma", "doctor_specialty": "Endocrinology", "medicine_name": "Noveron 500mg", "dosage": "1-0-1", "status": "verified", "verified_at": _days_ago(10)},
                {"id": "rx-timeline-3", "doctor_name": "Dr. Patel", "doctor_specialty": "Endocrinology", "medicine_name": "Insulin Detemir 10U", "dosage": "0-0-1", "status": "verified", "verified_at": _days_ago(60)},
                {"id": "rx-timeline-4", "doctor_name": "Dr. Rai", "doctor_specialty": "General Medicine", "medicine_name": "Warfarin 5mg", "dosage": "0-0-1", "status": "verified", "verified_at": _days_ago(150)},
                {"id": "rx-timeline-5", "doctor_name": "Dr. Sharma", "doctor_specialty": "Endocrinology", "medicine_name": "Metformin 500mg", "dosage": "1-0-1", "status": "verified", "verified_at": _days_ago(200)},
            ],
            "patient-vikram": [
                {"id": "rx-timeline-v1", "doctor_name": "Dr. Sharma", "doctor_specialty": "Cardiology", "medicine_name": "Aspirin 150mg", "dosage": "1-0-0", "status": "verified", "verified_at": _days_ago(3)},
                {"id": "rx-timeline-v2", "doctor_name": "Dr. Rai", "doctor_specialty": "General Medicine", "medicine_name": "Atenolol 50mg", "dosage": "1-0-0", "status": "verified", "verified_at": _days_ago(30)},
            ],
            "patient-sita": [
                {"id": "rx-timeline-s1", "doctor_name": "Dr. Sharma", "doctor_specialty": "Internal Medicine", "medicine_name": "Amoxicillin 500mg", "dosage": "1-1-1", "status": "verified", "verified_at": _days_ago(4)},
            ],
        }

        # ?? Lab Trends (chartable series) ????????????????????????????????????
        self.lab_trends = {
            "patient-ramesh": [
                {
                    "test_name": "HbA1c",
                    "unit": "%",
                    "reference_range": "4.0 - 5.6",
                    "points": [
                        {"date": _days_ago(540), "value": 7.8},
                        {"date": _days_ago(450), "value": 7.2},
                        {"date": _days_ago(365), "value": 6.9},
                        {"date": _days_ago(180), "value": 6.5},
                    ],
                },
                {
                    "test_name": "Fasting Glucose",
                    "unit": "mg/dL",
                    "reference_range": "70 - 100",
                    "points": [
                        {"date": _days_ago(540), "value": 168},
                        {"date": _days_ago(450), "value": 155},
                        {"date": _days_ago(365), "value": 148},
                        {"date": _days_ago(180), "value": 142},
                    ],
                },
            ],
            "patient-vikram": [
                {
                    "test_name": "Troponin I",
                    "unit": "ng/mL",
                    "reference_range": "< 0.04",
                    "points": [
                        {"date": _days_ago(90), "value": 0.02},
                        {"date": _days_ago(30), "value": 0.05},
                        {"date": _days_ago(1), "value": 0.08},
                    ],
                },
            ],
        }

        # ?? Document Access Log (audit trail) ?????????????????????????????????
        self.document_access_log = []

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
            "medical_records": self.get_medical_records(patient_id),
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
    # PATIENT CONTEXT â€” Symptoms, Caregivers, Allergies, Visit Prep
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
        # â”€â”€ Scans & X-Ray Analysis (Side-by-Side OCR & X-ray Canvas) â”€â”€â”€â”€â”€â”€
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

        # â”€â”€ Diagnostic Orders (Lab Tests) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        # â”€â”€ Follow-ups & Verification Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    def get_medical_records(self, patient_id: str) -> list[dict]:
        """Get multi-category medical records, past doctor notes, lab reports, and imaging docs."""
        return self.medical_records.get(patient_id, [])

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
                "A": "1. Type 2 Diabetes Mellitus â€” controlled on current regimen\n2. Dizziness â€” possibly medication-related (Noveron evening dose)\n3. Cardiovascular risk â€” on anticoagulation via cardiology",
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



    # =====================================================================
    # FULL PATIENT RECORD (Spec 12 — Multi-Document Access)
    # =====================================================================

    def get_full_record(
        self,
        patient_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
        category: str = "all",
        doctor_filter: str = "all",
    ) -> dict:
        """
        Returns a patient's COMPLETE medical record — every prescription from
        every doctor, every lab result, every scan, every symptom log, every
        allergy — in one call. Per Spec 12 section B.3.
        """
        patient = self.patients.get(patient_id)
        if not patient:
            return {"error": f"Patient {patient_id} not found"}

        # Cross-doctor prescription timeline
        timeline = self.prescriptions_timeline.get(patient_id, [])
        if doctor_filter != "all":
            timeline = [rx for rx in timeline if rx["doctor_name"] == doctor_filter]

        # Documents grouped by category
        docs = [d for d in self.patient_documents if d["patient_id"] == patient_id]
        if category != "all":
            docs = [d for d in docs if d["category"] == category]
        if from_date:
            docs = [d for d in docs if d["document_date"] >= from_date]
        if to_date:
            docs = [d for d in docs if d["document_date"] <= to_date]

        documents_grouped = {}
        for d in docs:
            cat = d["category"]
            if cat not in documents_grouped:
                documents_grouped[cat] = []
            documents_grouped[cat].append(d)

        # Lab trends
        trends = self.lab_trends.get(patient_id, [])

        # Audit log: record this access
        self.document_access_log.append({
            "id": str(uuid.uuid4()),
            "patient_id": patient_id,
            "accessed_by_role": "doctor",
            "accessed_at": _now_iso(),
            "documents_returned": len(docs),
        })

        # Assemble existing data
        allergy_list = self.allergies.get(patient_id, [])
        symptoms = self.symptom_logs.get(patient_id, [])
        caregiver = self.caregiver_audit.get(patient_id, {})
        alerts = self.smart_alerts.get(patient_id, [])
        refills = [r for r in self.refill_requests if r["patient_id"] == patient_id]

        return {
            "patient": patient,
            "prescriptions_timeline": timeline,
            "documents": documents_grouped,
            "lab_trends": trends,
            "allergy_profile": allergy_list,
            "symptom_summary": {
                "logs": symptoms[-7:] if symptoms else [],
                "trend": "stable",
            },
            "caregiver_audit": caregiver,
            "adherence_score": self._compute_adherence(patient_id),
            "refill_history": refills,
            "smart_alerts": alerts,
        }

    def _compute_adherence(self, patient_id: str) -> int:
        """Compute adherence score (demo: lookup from known values)."""
        scores = {
            "patient-ramesh": 78,
            "patient-vikram": 85,
            "patient-sita": 92,
            "patient-anil": 65,
            "patient-priya": 88,
        }
        return scores.get(patient_id, 75)

    def get_patient_documents(
        self, patient_id: str, category: str | None = None
    ) -> list[dict]:
        """Get all documents for a patient, optionally filtered by category."""
        docs = [d for d in self.patient_documents if d["patient_id"] == patient_id]
        if category:
            docs = [d for d in docs if d["category"] == category]
        return sorted(docs, key=lambda d: d["document_date"], reverse=True)

    def upload_patient_document(
        self,
        patient_id: str,
        title: str,
        category: str,
        document_date: str,
        file_type: str = "pdf",
        file_url: str | None = None,
    ) -> dict:
        """Patient self-uploads a document. Always marked source=patient_uploaded."""
        doc = {
            "id": f"doc-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "category": category,
            "source": "patient_uploaded",
            "title": title,
            "file_url": file_url,
            "file_type": file_type,
            "uploaded_by_role": "patient",
            "document_date": document_date,
            "uploaded_at": _now_iso(),
            "is_current_version": True,
        }
        self.patient_documents.append(doc)
        return {"status": "uploaded", "document": doc}

    def verify_patient_document(self, document_id: str, doctor_id: str) -> dict:
        """Doctor marks a patient-uploaded document as clinic_verified."""
        for doc in self.patient_documents:
            if doc["id"] == document_id:
                if doc["source"] != "patient_uploaded":
                    return {"error": "Document is already clinic-verified"}
                doc["source"] = "clinic_verified"
                doc["verified_by"] = doctor_id
                doc["verified_at"] = _now_iso()
                return {"status": "verified", "document": doc}
        return {"error": f"Document {document_id} not found"}


# Singleton
doctor_service = DoctorService()
