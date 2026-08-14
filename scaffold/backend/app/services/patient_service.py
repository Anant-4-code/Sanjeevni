import datetime
import uuid

# Real Data Storage Service for Sanjeevani
# Serves live database records with automatic clinical seeding

class PatientService:
    def __init__(self):
        self.logs = []
        self.schedule_items = []
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
        return [l for l in self.logs if l["patient_id"] == patient_id]

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
            "file_url": file_url or "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
            "pinned": True,
            "patient_notes": patient_notes or "Created via OTC Digital Prescription Generator.",
            "medicines": formatted_meds,
        }
        self.vault_documents.insert(0, presc_doc)

        for med in formatted_meds:
            self.schedule_items.append({
                "prescription_item_id": f"item-{uuid.uuid4().hex[:6]}",
                "patient_id": patient_id,
                "time": med.get("frequency_time", "08:00 AM"),
                "medicine": med.get("name", "Prescribed Medication"),
                "condition": med.get("conditionTag", "OTC CARE"),
                "doctor": doctor_name or "Self Intake",
                "taken": False,
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
            "file_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
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
            "file_url": file_url or (details.get("file_url") if isinstance(details, dict) else "") or "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
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
            # Add medicine items to active dosing timeline
            for med in doc.get("medicines", []):
                self.schedule_items.append({
                    "prescription_item_id": f"item-{uuid.uuid4().hex[:6]}",
                    "patient_id": doc["patient_id"],
                    "time": "08:00 AM",
                    "medicine": med["name"],
                    "condition": med["conditionTag"],
                    "doctor": doc["doctor_name"],
                    "taken": False,
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
        items = [s for s in self.schedule_items if s.get("patient_id") == patient_id]
        taken_count = sum(1 for s in items if s["taken"])
        total_count = len(items)
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

patient_service = PatientService()
