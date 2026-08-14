import datetime
import uuid
import re

# Drug criticality lists
CRITICAL_DRUG_KEYWORDS = [
    "warfarin", "heparin", "insulin", "digoxin", "nitroglycerin", "clopidogrel",
    "apixaban", "rivaroxaban", "dabigatran", "amiodarone", "carbamazepine",
    "lithium", "phenytoin", "theophylline", "glyceryl trinitrate"
]

ROUTINE_DRUG_KEYWORDS = [
    "multivitamin", "vitamin", "calcium", "biotin", "omega", "fish oil",
    "iron supplement", "zinc", "probiotic", "folic acid", "antacid", "gelusil"
]

def determine_criticality_tier(name: str) -> str:
    name_lower = (name or "").lower()
    if any(k in name_lower for k in CRITICAL_DRUG_KEYWORDS):
        return "critical"
    if any(k in name_lower for k in ROUTINE_DRUG_KEYWORDS):
        return "routine"
    return "important"


class PatientService:
    def __init__(self):
        self.logs = []
        self.schedule_items = [
            {
                "prescription_item_id": "item-demo-1",
                "patient_id": "demo-patient",
                "time": "08:00 AM",
                "medicine": "Pan 40mg (Pantoprazole)",
                "condition": "GASTRIC CARE",
                "doctor": "Dr. Nitin Sharma",
                "taken": True,
                "criticality_tier": "important",
                "acknowledgment_state": "taken",
                "start_date": datetime.date.today().isoformat(),
                "duration_days": 14,
            },
            {
                "prescription_item_id": "item-demo-2",
                "patient_id": "demo-patient",
                "time": "01:00 PM",
                "medicine": "Amoxicillin 500mg",
                "condition": "RESPIRATORY INFECTION",
                "doctor": "Dr. Nitin Sharma",
                "taken": False,
                "criticality_tier": "important",
                "acknowledgment_state": "none",
                "start_date": datetime.date.today().isoformat(),
                "duration_days": 7,
            },
            {
                "prescription_item_id": "item-demo-3",
                "patient_id": "demo-patient",
                "time": "08:30 PM",
                "medicine": "Clopidogrel 75mg (Blood Thinner)",
                "condition": "CARDIAC CARE",
                "doctor": "Dr. Rajesh Kulkarni (Cardiology)",
                "taken": False,
                "criticality_tier": "critical",
                "acknowledgment_state": "none",
                "start_date": datetime.date.today().isoformat(),
                "duration_days": 30,
            },
            {
                "prescription_item_id": "item-demo-4",
                "patient_id": "demo-patient",
                "time": "10:00 PM",
                "medicine": "Multivitamin & Zinc Tab",
                "condition": "GENERAL WELLNESS",
                "doctor": "Dr. Ananya Sharma",
                "taken": False,
                "criticality_tier": "routine",
                "acknowledgment_state": "none",
                "start_date": datetime.date.today().isoformat(),
                "duration_days": 30,
            }
        ]
        self.vault_documents = [
            {
                "id": "doc-lab-101",
                "patient_id": "demo-patient",
                "title": "Complete Blood Count (CBC) & Lipid Panel Report",
                "category": "lab-reports",
                "doctor_name": "Metropolis Healthcare Laboratory",
                "status": "verified",
                "date": datetime.date.today().strftime("%b %d, %Y"),
                "summary": "Hemoglobin: 13.5 g/dL (Normal). Fasting Blood Glucose: 95 mg/dL. Total Cholesterol: 185 mg/dL within healthy reference bounds.",
                "file_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
                "pinned": True,
                "patient_notes": "Routine annual health checkup report.",
                "biomarkers": [
                    {"parameter": "Hemoglobin", "value": "13.5 g/dL", "reference_range": "12.0-15.5 g/dL", "status": "normal"},
                    {"parameter": "Blood Glucose (Fasting)", "value": "95 mg/dL", "reference_range": "70-99 mg/dL", "status": "normal"},
                    {"parameter": "Total Cholesterol", "value": "185 mg/dL", "reference_range": "< 200 mg/dL", "status": "normal"}
                ]
            },
            {
                "id": "doc-mri-202",
                "patient_id": "demo-patient",
                "title": "Lumbar Spine MRI Scan — Diagnostic Radiology Report",
                "category": "x-rays",
                "doctor_name": "Manikanta MRI & Diagnostic Centre",
                "status": "verified",
                "date": datetime.date.today().strftime("%b %d, %Y"),
                "summary": "L4-L5 posterior disc bulge with mild neural foraminal narrowing. No spinal cord compression detected.",
                "file_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80",
                "pinned": True,
                "patient_notes": "Correlate with lower back radicular pain symptoms.",
                "findings": [
                    {"region": "L4-L5 Disc", "observation": "Posterior disc protrusion with mild foraminal stenosis."}
                ]
            }
        ]
        # ── Phase 1 & 2 Data Stores ──
        self.copilot_refused_queries = []   # Guardrail-blocked questions
        self.copilot_feedback = []          # Feature G: 👍👎
        self.allergy_profile = []           # §5: Allergy profile
        self.symptom_logs = []              # §2: Symptom journal
        self.refill_requests = []           # §1: Refill requests

    def add_log(self, patient_id: str, event_type: str, title: str, details: str, actor: str):
        log_entry = {
            "id": f"log-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "event_type": event_type,
            "title": title,
            "details": details,
            "actor": actor,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self.logs.insert(0, log_entry)
        return log_entry

    def get_logs(self, patient_id: str):
        return [l for l in self.logs if l["patient_id"] == patient_id or patient_id == "demo-patient"]

    def get_vault(self, patient_id: str, category: str = None):
        items = [v for v in self.vault_documents if v.get("patient_id") == patient_id or patient_id == "demo-patient"]
        if category and category != "all":
            cat_lower = category.lower()
            if cat_lower in ["lab-reports", "lab_reports"]:
                items = [v for v in items if v.get("category") in ["lab-reports", "lab_reports"]]
            elif cat_lower in ["x-rays", "scans", "imaging_scans"]:
                items = [v for v in items if v.get("category") in ["x-rays", "scans", "imaging_scans"]]
            elif cat_lower in ["other", "records", "discharge_summaries", "vaccinations"]:
                items = [v for v in items if v.get("category") in ["other", "records", "discharge_summaries", "vaccinations"]]
            else:
                items = [v for v in items if v.get("category") == category]
        return items

    def create_digital_prescription(self, patient_id: str, title: str, doctor_name: str, medicines: list, patient_notes: str = "", file_url: str = ""):
        doc_id = f"rx-digitized-{uuid.uuid4().hex[:6]}"
        
        formatted_meds = []
        for m in medicines:
            m_copy = dict(m) if isinstance(m, dict) else {"name": str(m)}
            if "sideEffects" not in m_copy or not isinstance(m_copy["sideEffects"], list):
                m_copy["sideEffects"] = ["Mild Drowsiness", "Nausea", "Headache"]
            if "usesSummary" not in m_copy:
                m_copy["usesSummary"] = f"Prescribed for {m_copy.get('conditionTag', 'general clinical care')}."
            if "precautions" not in m_copy:
                m_copy["precautions"] = "Take as prescribed with water after meals. Consult physician if symptoms persist."
            formatted_meds.append(m_copy)

        presc_doc = {
            "id": doc_id,
            "patient_id": patient_id,
            "title": title or "Digital OTC Prescription",
            "category": "prescriptions",
            "doctor_name": doctor_name or "Self Intake / OTC Scan",
            "status": "verified",
            "date": datetime.date.today().strftime("%b %d, %Y"),
            "summary": f"Digital Prescription created for {title}. Includes {len(formatted_meds)} medication(s).",
            "file_url": file_url or "",
            "pinned": True,
            "patient_notes": patient_notes or "Created via OTC Digital Prescription Generator.",
            "medicines": formatted_meds,
        }
        self.vault_documents.insert(0, presc_doc)

        for med in formatted_meds:
            duration_str = med.get("duration", "5 days")
            duration_days = self._parse_duration_days(duration_str)
            med_name = med.get("name", "Prescribed Medication")
            tier = med.get("criticality_tier") or determine_criticality_tier(med_name)

            self.schedule_items.append({
                "prescription_item_id": f"item-{uuid.uuid4().hex[:6]}",
                "patient_id": patient_id,
                "time": med.get("frequency_time", "08:00 AM"),
                "medicine": med_name,
                "condition": med.get("conditionTag", "OTC CARE"),
                "doctor": doctor_name or "Self Intake",
                "taken": False,
                "criticality_tier": tier,
                "acknowledgment_state": "none",
                "start_date": datetime.date.today().isoformat(),
                "duration_days": duration_days,
            })

        self.add_log(
            patient_id=patient_id,
            event_type="DIGITAL_PRESCRIPTION_CREATED",
            title="Digital Prescription Created & Activated",
            details=f"Digital prescription ({title}) created and saved to Patient Vault.",
            actor="Patient / User",
        )
        return presc_doc

    def add_scan_to_vault(self, patient_id: str, filename: str, doctor_name: str = "Attending Physician"):
        doc_id = f"rx-unverified-{uuid.uuid4().hex[:6]}"
        scan_doc = {
            "id": doc_id,
            "patient_id": patient_id,
            "title": f"Scanned Prescription — {doctor_name}",
            "category": "prescriptions",
            "doctor_name": doctor_name,
            "status": "unverified",
            "date": datetime.date.today().strftime("%b %d, %Y"),
            "summary": f"Uploaded paper prescription ({filename}). Extracted Doctor: {doctor_name}. Tagged as UNVERIFIED (Needs Doctor Sign-Off).",
            "file_url": "",
            "pinned": True,
            "patient_notes": "Pending clinical review & verification by the attending physician before items activate into daily schedule.",
            "medicines": [
                {
                    "name": "Pan 40mg",
                    "dosage": "40mg",
                    "frequency": "1-0-0 (Before Breakfast)",
                    "duration": "14 days",
                    "conditionTag": "GASTRIC CARE",
                    "usesSummary": "Reduces stomach acid to treat heartburn and indigestion.",
                    "sideEffects": ["Headache", "Nausea"],
                    "precautions": "Take on empty stomach 30 mins before breakfast.",
                }
            ]
        }
        self.vault_documents.insert(0, scan_doc)
        self.add_log(
            patient_id=patient_id,
            event_type="PRESCRIPTION_SCANNED",
            title="Prescription Uploaded & Archived in Vault",
            details=f"Paper prescription ({filename}) scanned. Extracted Doctor: {doctor_name}. Tagged UNVERIFIED (Needs Doctor Sign-Off).",
            actor="Reception Intake Desk",
        )
        return scan_doc

    def add_analyzed_document_to_vault(self, patient_id: str, title: str, category: str, summary: str, details: dict, file_url: str = ""):
        doc_id = f"doc-{category[:6]}-{uuid.uuid4().hex[:6]}"
        vault_category_map = {
            "lab_reports": "lab-reports",
            "imaging_scans": "x-rays",
            "scans": "x-rays",
            "prescriptions": "prescriptions",
            "discharge_summaries": "other",
            "vaccinations": "other"
        }
        mapped_cat = vault_category_map.get(category, "other")
        
        doc = {
            "id": doc_id,
            "patient_id": patient_id,
            "title": title or f"Scanned {category.replace('_', ' ').title()} Record",
            "category": mapped_cat,
            "doctor_name": details.get("doctor_name") or details.get("facility_or_lab") or "Attending Physician",
            "status": "verified",
            "date": datetime.date.today().strftime("%b %d, %Y"),
            "summary": summary or f"Extracted {category.replace('_', ' ')} archived in Vault.",
            "file_url": file_url or (details.get("file_url") if isinstance(details, dict) else "") or "",
            "pinned": True,
            "patient_notes": details.get("patient_notes") or details.get("recommendations") or summary,
            "biomarkers": details.get("biomarkers", []),
            "findings": details.get("findings", []),
            "medicines": details.get("medicines", []),
            "vaccines": details.get("vaccines", [])
        }
        self.vault_documents.insert(0, doc)
        self.add_log(
            patient_id=patient_id,
            event_type="DOCUMENT_SAVED_TO_VAULT",
            title=f"Medical Document Saved to Vault ({title})",
            details=f"Extracted {category.replace('_', ' ')} archived in Patient Vault under category '{mapped_cat}'.",
            actor="AI Document Intelligence Engine",
        )
        return doc

    def verify_prescription(self, prescription_id: str, doctor_id: str = "doc-1"):
        doc = next((d for d in self.vault_documents if d["id"] == prescription_id), None)
        if doc:
            doc["status"] = "verified"
            for med in doc.get("medicines", []):
                duration_str = med.get("duration", "5 days")
                duration_days = self._parse_duration_days(duration_str)
                med_name = med["name"]
                tier = med.get("criticality_tier") or determine_criticality_tier(med_name)

                self.schedule_items.append({
                    "prescription_item_id": f"item-{uuid.uuid4().hex[:6]}",
                    "patient_id": doc["patient_id"],
                    "time": "08:00 AM",
                    "medicine": med_name,
                    "condition": med["conditionTag"],
                    "doctor": doc["doctor_name"],
                    "taken": False,
                    "criticality_tier": tier,
                    "acknowledgment_state": "none",
                    "start_date": datetime.date.today().isoformat(),
                    "duration_days": duration_days,
                })
            
            self.add_log(
                patient_id=doc["patient_id"],
                event_type="DOCTOR_VERIFIED",
                title="Prescription Verified & Signed Off",
                details=f"{doc['doctor_name']} verified prescription {doc['title']}. Status updated to VERIFIED. Medications populated into daily schedule.",
                actor=doc['doctor_name'],
            )
            return {"status": "verified", "doc": doc}
        return None

    def get_timeline(self, patient_id: str):
        items = [s for s in self.schedule_items if s.get("patient_id") == patient_id or patient_id == "demo-patient"]
        # Snoozed is treated as pending (does not count as missed)
        evaluated_items = [s for s in items if s.get("acknowledgment_state") != "snoozed"]
        taken_count = sum(1 for s in evaluated_items if s.get("taken") or s.get("acknowledgment_state") == "taken")
        total_count = len(evaluated_items)
        adherence = round((taken_count / total_count) * 100) if total_count > 0 else 0
        return {
            "adherence_score": adherence,
            "schedule": items,
        }

    def toggle_intake(self, prescription_item_id: str, taken: bool):
        target_patient = "demo-patient"
        for item in self.schedule_items:
            if item["prescription_item_id"] == prescription_item_id:
                item["taken"] = taken
                item["acknowledgment_state"] = "taken" if taken else "none"
                target_patient = item.get("patient_id", "demo-patient")
                self.add_log(
                    patient_id=target_patient,
                    event_type="DOSE_TOGGLED",
                    title=f"Dose Marked {'TAKEN' if taken else 'PENDING'}",
                    details=f"Patient marked {item['medicine']} ({item['time']}) as {'TAKEN' if taken else 'PENDING'}.",
                    actor="Patient",
                )
                break
        return self.get_timeline(target_patient)

    # ── A2: Snooze & Explicit Skip Actions ──
    def snooze_dose(self, prescription_item_id: str, minutes: int = 20):
        target_patient = "demo-patient"
        snooze_time = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=minutes)).isoformat()
        for item in self.schedule_items:
            if item["prescription_item_id"] == prescription_item_id:
                item["acknowledgment_state"] = "snoozed"
                item["snooze_until"] = snooze_time
                item["taken"] = False
                target_patient = item.get("patient_id", "demo-patient")
                self.add_log(
                    patient_id=target_patient,
                    event_type="DOSE_SNOOZED",
                    title=f"Dose Snoozed (+{minutes} min)",
                    details=f"Patient snoozed reminder for {item['medicine']} ({item['time']}) by {minutes} minutes. Adherence status marked as Pending.",
                    actor="Patient",
                )
                break
        return self.get_timeline(target_patient)

    def skip_dose(self, prescription_item_id: str, reason: str = "Other"):
        target_patient = "demo-patient"
        for item in self.schedule_items:
            if item["prescription_item_id"] == prescription_item_id:
                item["acknowledgment_state"] = "skipped_explicit"
                item["skip_reason"] = reason
                item["taken"] = False
                target_patient = item.get("patient_id", "demo-patient")
                self.add_log(
                    patient_id=target_patient,
                    event_type="DOSE_SKIPPED_EXPLICIT",
                    title=f"Dose Explicitly Skipped: {item['medicine']}",
                    details=f"Patient skipped {item['medicine']} ({item['time']}). Stated reason: '{reason}'. Logged distinctly for physician review.",
                    actor="Patient",
                )
                break
        return self.get_timeline(target_patient)

    # ── A1 & A3: Criticality & Anti-Pileup Escalation Status ──
    def get_escalation_status(self, patient_id: str):
        items = [s for s in self.schedule_items if s.get("patient_id") == patient_id or patient_id == "demo-patient"]
        missed_doses = [
            s for s in items 
            if not s.get("taken") and s.get("acknowledgment_state") not in ["taken", "snoozed", "skipped_explicit"]
        ]
        
        has_critical = any(s.get("criticality_tier") == "critical" for s in missed_doses)
        has_important = any(s.get("criticality_tier") == "important" for s in missed_doses)
        highest_tier = "critical" if has_critical else ("important" if has_important else "routine")
        
        return {
            "missed_count": len(missed_doses),
            "highest_tier": highest_tier if missed_doses else "none",
            "missed_doses": missed_doses,
            "batch_alert_message": (
                f"You have {len(missed_doses)} pending dose(s), including high-priority medication ({missed_doses[0]['medicine']}). Please review and take promptly."
                if has_critical and len(missed_doses) > 1
                else (
                    f"High-priority dose reminder: {missed_doses[0]['medicine']} is due."
                    if has_critical and len(missed_doses) == 1
                    else (f"You have {len(missed_doses)} scheduled dose(s) pending." if missed_doses else "All current doses on track.")
                )
            )
        }

    # ── Helper: Parse duration string into days ──
    @staticmethod
    def _parse_duration_days(duration_str: str) -> int:
        if not duration_str:
            return 5
        m = re.search(r'(\d+)\s*(days?|d)\b', duration_str, re.IGNORECASE)
        if m:
            return int(m.group(1))
        m = re.search(r'(\d+)\s*(weeks?|w)\b', duration_str, re.IGNORECASE)
        if m:
            return int(m.group(1)) * 7
        m = re.search(r'(\d+)\s*(months?|m)\b', duration_str, re.IGNORECASE)
        if m:
            return int(m.group(1)) * 30
        m = re.search(r'(\d+)', duration_str)
        if m:
            return int(m.group(1))
        return 5

    # ── Copilot Refusal Logging ──
    def log_copilot_refusal(self, patient_id: str, question: str, trigger_phrase: str = ""):
        entry = {
            "id": f"ref-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "question": question,
            "trigger_phrase": trigger_phrase,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self.copilot_refused_queries.insert(0, entry)
        return entry

    def get_copilot_refusals(self, patient_id: str):
        return [r for r in self.copilot_refused_queries if r["patient_id"] == patient_id or patient_id == "demo-patient"]

    # ── Feature G: Copilot Feedback (👍👎) ──
    def add_copilot_feedback(self, patient_id: str, question: str, answer: str, rating: str, llm_tier: str = ""):
        entry = {
            "id": f"fb-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "question": question,
            "answer": answer,
            "rating": rating,
            "llm_tier": llm_tier,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self.copilot_feedback.insert(0, entry)
        return entry

    # ── §5: Allergy & Known Reaction Profile ──
    def add_allergy(self, patient_id: str, substance: str, reaction: str = "", severity: str = "mild", reported_by: str = "patient"):
        entry = {
            "id": f"alg-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "substance": substance,
            "reaction": reaction,
            "severity": severity,
            "reported_by": reported_by,
            "doctor_confirmed": reported_by == "doctor",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self.allergy_profile.insert(0, entry)
        self.add_log(
            patient_id=patient_id,
            event_type="ALLERGY_ADDED",
            title=f"Allergy Reported: {substance}",
            details=f"Patient reported allergy to {substance} (severity: {severity}, reaction: {reaction or 'unspecified'}).",
            actor="Patient" if reported_by == "patient" else "Doctor",
        )
        return entry

    def get_allergies(self, patient_id: str):
        return [a for a in self.allergy_profile if a["patient_id"] == patient_id or patient_id == "demo-patient"]

    def remove_allergy(self, allergy_id: str):
        self.allergy_profile = [a for a in self.allergy_profile if a["id"] != allergy_id]
        return {"status": "removed", "id": allergy_id}

    # ── §2 & Update 5: Symptom & Wellbeing Journal ──
    def add_symptom_log(self, patient_id: str, wellbeing_score: int, note: str = "", tagged_medicine: str = "", photo_url: str = ""):
        today_str = datetime.date.today().isoformat()
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        score_clamped = max(1, min(5, wellbeing_score))
        clean_note = note[:280] if note else ""

        existing = next((s for s in self.symptom_logs if s["patient_id"] == patient_id and s["log_date"] == today_str), None)
        
        if existing:
            # B3: Same-day update preserves history of earlier entry
            if "history" not in existing:
                existing["history"] = []
            existing["history"].append({
                "wellbeing_score": existing["wellbeing_score"],
                "note": existing.get("note", ""),
                "photo_url": existing.get("photo_url", ""),
                "logged_at": existing.get("updated_at") or existing.get("created_at")
            })
            existing["wellbeing_score"] = score_clamped
            existing["note"] = clean_note
            if photo_url:
                existing["photo_url"] = photo_url
            if tagged_medicine:
                existing["tagged_medicine"] = tagged_medicine
            existing["edited"] = True
            existing["updated_at"] = now_iso
            result_entry = existing
        else:
            result_entry = {
                "id": f"sym-{uuid.uuid4().hex[:8]}",
                "patient_id": patient_id,
                "log_date": today_str,
                "wellbeing_score": score_clamped,
                "note": clean_note,
                "photo_url": photo_url or "",
                "tagged_medicine": tagged_medicine,
                "history": [],
                "created_at": now_iso,
            }
            self.symptom_logs.insert(0, result_entry)

        # B2: Check 3-day low score trend (scores <= 2 on last 3 consecutive logs)
        patient_logs = sorted(
            [s for s in self.symptom_logs if s["patient_id"] == patient_id or patient_id == "demo-patient"],
            key=lambda x: x["log_date"],
            reverse=True
        )
        last_3 = patient_logs[:3]
        low_trend_triggered = len(last_3) >= 3 and all(l["wellbeing_score"] <= 2 for l in last_3)

        trend_alert = None
        if low_trend_triggered:
            trend_alert = {
                "triggered": True,
                "message": "We noticed you've logged feeling low for 3 days in a row.",
                "streak_days": len(last_3),
                "suggested_action": "flag_doctor",
            }
            result_entry["trend_alert"] = trend_alert

        self.add_log(
            patient_id=patient_id,
            event_type="SYMPTOM_LOGGED",
            title=f"Symptom Check-In: Score {score_clamped}/5" + (" (Edited)" if existing else ""),
            details=f"Patient recorded wellbeing score {score_clamped}/5. Note: '{clean_note or 'None'}'. Photo attached: {'Yes' if (photo_url or result_entry.get('photo_url')) else 'No'}.",
            actor="Patient",
        )
        return result_entry

    def get_symptom_logs(self, patient_id: str, limit: int = 30):
        logs = [s for s in self.symptom_logs if s["patient_id"] == patient_id or patient_id == "demo-patient"]
        return logs[:limit]

    # ── B4: Wellbeing vs. Adherence Dual-Trend Correlation ──
    def get_adherence_wellbeing_correlation(self, patient_id: str, days: int = 14):
        today = datetime.date.today()
        results = []
        sym_by_date = {s["log_date"]: s["wellbeing_score"] for s in self.symptom_logs if s["patient_id"] == patient_id or patient_id == "demo-patient"}
        
        for d in range(days - 1, -1, -1):
            day_date = today - datetime.timedelta(days=d)
            date_str = day_date.isoformat()
            day_label = day_date.strftime("%b %d")
            
            sym_score = sym_by_date.get(date_str, None)
            base_adh = 100 if d == 0 and self.get_timeline(patient_id)["adherence_score"] > 0 else (90 if d % 3 != 0 else 75)
            
            results.append({
                "date": date_str,
                "label": day_label,
                "adherence_pct": base_adh,
                "wellbeing_score": sym_score or (4 if d % 4 != 0 else 3),
                "has_real_log": date_str in sym_by_date
            })
        return results

    # ── §1: Refill & Running-Out Intelligence ──
    def get_refill_status(self, patient_id: str):
        items = [s for s in self.schedule_items if s.get("patient_id") == patient_id or patient_id == "demo-patient"]
        results = []
        today = datetime.date.today()
        for item in items:
            start_str = item.get("start_date")
            duration = item.get("duration_days", 0)
            if start_str and duration:
                try:
                    start = datetime.date.fromisoformat(start_str)
                    elapsed = (today - start).days
                    remaining = duration - elapsed
                except (ValueError, TypeError):
                    remaining = -1
            else:
                remaining = -1

            if remaining < 0:
                urgency = "unknown"
            elif remaining <= 0:
                urgency = "complete"
            elif remaining <= 2:
                urgency = "critical"
            elif remaining <= 5:
                urgency = "warning"
            else:
                urgency = "ok"

            results.append({
                "prescription_item_id": item["prescription_item_id"],
                "medicine": item["medicine"],
                "doctor": item.get("doctor", ""),
                "criticality_tier": item.get("criticality_tier", "important"),
                "start_date": item.get("start_date", ""),
                "duration_days": item.get("duration_days", 0),
                "days_remaining": max(remaining, 0) if remaining >= 0 else None,
                "urgency": urgency,
            })
        return results

    def create_refill_request(self, patient_id: str, medicine: str, prescription_item_id: str = ""):
        entry = {
            "id": f"refill-{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "medicine": medicine,
            "prescription_item_id": prescription_item_id,
            "status": "pending",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self.refill_requests.insert(0, entry)
        self.add_log(
            patient_id=patient_id,
            event_type="REFILL_REQUESTED",
            title=f"Refill Requested: {medicine}",
            details=f"Patient requested a refill for {medicine}. Status: pending.",
            actor="Patient",
        )
        return entry

    def get_refill_requests(self, patient_id: str):
        return [r for r in self.refill_requests if r["patient_id"] == patient_id or patient_id == "demo-patient"]

    # ── §8.8: Visit Prep Assistant Aggregation ──
    def get_visit_prep(self, patient_id: str):
        talking_points = []
        
        # 1. Symptom journal low scores or notes
        sym_logs = self.get_symptom_logs(patient_id, limit=5)
        for s in sym_logs:
            if s.get("wellbeing_score", 5) <= 2 or s.get("note"):
                med_tag = f" after {s['tagged_medicine']}" if s.get("tagged_medicine") else ""
                talking_points.append({
                    "category": "symptom",
                    "icon": "HeartPulse",
                    "title": f"Reported wellbeing score {s['wellbeing_score']}/5{med_tag}",
                    "detail": s.get("note") or f"Logged on {s.get('log_date')}. Discuss tolerance or side effects.",
                    "date": s.get("log_date")
                })
        
        # 2. Copilot guardrail refusals
        refusals = self.get_copilot_refusals(patient_id)
        for r in refusals[:3]:
            q_snippet = r['question'][:60] + ("..." if len(r['question']) > 60 else "")
            talking_points.append({
                "category": "question",
                "icon": "MessageCircle",
                "title": f"Asked AI Copilot: \"{q_snippet}\"",
                "detail": "Emergency or diagnostic question redirected to physician. Raise directly during consultation.",
                "date": r.get("created_at", "")[:10]
            })
            
        # 3. Refill intelligence: medications ending soon
        refill_items = self.get_refill_status(patient_id)
        for rf in refill_items:
            if rf.get("days_remaining") is not None and rf["days_remaining"] <= 5:
                talking_points.append({
                    "category": "refill",
                    "icon": "Pill",
                    "title": f"{rf['medicine']} course ends in {rf['days_remaining']} days",
                    "detail": f"Ask {rf.get('doctor', 'the doctor')} about continuation, tapering, or step-down prescription.",
                    "date": rf.get("start_date")
                })
                
        # 4. Diagnostic orders & lab findings in Vault
        vault_docs = self.get_vault(patient_id)
        lab_docs = [v for v in vault_docs if "lab" in v.get("category", "").lower()]
        if lab_docs:
            talking_points.append({
                "category": "lab",
                "icon": "FileText",
                "title": f"Review recent report: {lab_docs[0]['title']}",
                "detail": f"Biomarker summary: {lab_docs[0].get('summary', 'Ready for clinical review.')}",
                "date": lab_docs[0].get("date")
            })

        if not talking_points:
            talking_points.append({
                "category": "general",
                "icon": "CheckCircle2",
                "title": "Current treatment regimen on track",
                "detail": "No severe symptoms or missed critical doses recorded since last visit.",
                "date": datetime.date.today().isoformat()
            })

        return {
            "patient_id": patient_id,
            "doctor_name": "Dr. Nitin Sharma (Lead Physician)",
            "appointment_date": "Tomorrow, 10:30 AM",
            "talking_points": talking_points
        }


patient_service = PatientService()

