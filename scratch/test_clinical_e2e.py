import sys
import os

sys.path.insert(0, os.path.abspath("scaffold/backend"))

from starlette.testclient import TestClient
from app.main import app
from app.services.doctor_service import doctor_service

client = TestClient(app)

print("--- 1. Testing Health Endpoint ---")
r = client.get("/health")
assert r.status_code == 200, f"Health check failed: {r.text}"
print(f"Health check status: {r.json()['status']}")

print("\n--- 2. Testing Reception Walk-in Intake (BUG-REC-01 & BUG-DR-Q02) ---")
reg_payload = {
    "full_name": "Sunita Rao",
    "phone": "+91 98222 33445",
    "age": 48,
    "gender": "female",
    "chief_complaint": "Acute severe chest discomfort and shortness of breath",
    "doctor_id": "doc-sharma-1",
}
r = client.post("/api/reception/patients/register", json=reg_payload)
assert r.status_code == 200, f"Registration failed: {r.text}"
reg_data = r.json()
print(f"Registered patient: {reg_data['patient_id']}, Token #{reg_data['token_number']}")
assert reg_data["triage"]["severity_level"] == 3, "AI-4 NLP triage failed to classify acute symptoms as critical"
print(f"AI-4 NLP Triage classified: {reg_data['triage']['label']} (Level {reg_data['triage']['severity_level']})")

print("\n--- 3. Testing Doctor Queue Live Appearance (BUG-DR-Q02) ---")
r = client.get("/api/doctor/queue?doctor_id=doc-sharma-1")
assert r.status_code == 200, f"Queue fetch failed: {r.text}"
queue_items = r.json()["queue"]
sunita_item = next((q for q in queue_items if q["patient_id"] == reg_data["patient_id"]), None)
assert sunita_item is not None, f"Sunita Rao not found in Dr. Sharma queue: {queue_items}"
print(f"Doctor Queue verified: Token #{sunita_item['token_number']}, Acuity Level {sunita_item['chief_complaints']['severity_level']}, Status: {sunita_item['status']}")

print("\n--- 4. Testing Doctor Patient Chart for Walk-In Patient ---")
r = client.get(f"/api/doctor/patient/{reg_data['patient_id']}")
assert r.status_code == 200, f"Patient chart fetch failed: {r.text}"
chart = r.json()
print(f"Patient chart loaded successfully: {chart['patient']['full_name']}, Age {chart['patient']['age']}")

print("\n--- 5. Testing Prescription Verification & Fan-Out (BUG-DR-RX-02) ---")
rx_payload = {
    "patient_id": "patient-ramesh",
    "doctor_id": "doc-sharma-1",
    "medications": [
        {
            "name": "Atorvastatin 20mg",
            "dosage": "20mg",
            "frequency": "0-0-1",
            "duration_days": 30,
            "condition_tag": "Hyperlipidemia",
        }
    ],
    "diagnoses": ["Dyslipidemia", "Cardiovascular prophylaxis"],
    "patient_signature_token": "sig-ramesh-verified",
}
r = client.post("/api/doctor/verify", json=rx_payload)
assert r.status_code == 200, f"Prescription verify failed: {r.text}"
rx_res = r.json()
print(f"Prescription verified: SHA256={rx_res['sha256_hash'][:16]}..., Status={rx_res['verified']}")

# Verify pharmacy received it
r = client.get("/api/pharmacy/queue")
assert r.status_code == 200, f"Pharmacy queue failed: {r.text}"
pharm_items = r.json()["queue"]
pharm_entry = next((item for item in pharm_items if item["patient_id"] == "patient-ramesh"), None)
assert pharm_entry is not None, "Prescription did not fan out to pharmacy queue!"
print(f"Pharmacy queue confirmed: Found Rx for patient {pharm_entry['patient_id']}")

# Verify patient daily schedule received it
r = client.get("/api/patient/patient-ramesh/timeline")
assert r.status_code == 200, f"Patient timeline failed: {r.text}"
tl = r.json()
sched = tl.get("schedule", [])
# schedule items have key "medicine" (not "medicine_name")
sched_entry = next((s for s in sched if "atorvastatin" in s.get("medicine", "").lower()), None)
assert sched_entry is not None, f"Prescription did not propagate to patient daily schedule! Got: {[s.get('medicine') for s in sched]}"
print(f"Patient schedule confirmed: {sched_entry['medicine']} scheduled at {sched_entry.get('time')}")

# Verify patient health vault indexed it
r = client.get("/api/patient/patient-ramesh/vault")
assert r.status_code == 200, f"Patient vault failed: {r.text}"
vault_res = r.json()
# vault may be nested under 'documents' or returned as a list
vault_docs = vault_res if isinstance(vault_res, list) else vault_res.get("documents", vault_res.get("vault", []))
# The vault doc title is "Rx Clinical Prescription - Dr. Nitin Sharma", search broadly
vault_entry = next(
    (d for d in vault_docs if
     "prescription" in d.get("title", "").lower() or
     "atorvastatin" in str(d).lower()),
    None
)
assert vault_entry is not None, f"Prescription was not indexed in patient health vault! Docs: {[d.get('title') for d in vault_docs]}"
print(f"Patient health vault confirmed: Indexed document '{vault_entry.get('title', 'untitled')}'")

print("\n--- 6. Testing SOAP Note Save & Fetch (BUG-DR-SOAP-01 & BUG-DR-SOAP-02) ---")
soap_payload = {
    "patient_id": "patient-ramesh",
    "doctor_id": "doc-sharma-1",
    "soap_note": {
        "S": "Patient feels significantly improved, no dizziness reported",
        "O": "BP 122/80, Fasting Glucose 108 mg/dL",
        "A": "Excellent glycemic control on current regimen",
        "P": "Continue Metformin 500mg, review in 3 months",
    },
}
r = client.post("/api/doctor/soap/save", json=soap_payload)
assert r.status_code == 200, f"Save SOAP failed: {r.text}"
print(f"SOAP note saved: Status={r.json()['status']}")

r = client.get("/api/doctor/patient/patient-ramesh/soap")
assert r.status_code == 200, f"Get SOAP failed: {r.text}"
fetched_soap = r.json()["soap_note"]
assert fetched_soap["A"] == "Excellent glycemic control on current regimen"
print(f"SOAP note retrieved and verified: Assessment='{fetched_soap['A']}'")

print("\n--- 7. Testing YOLOv7 X-Ray Re-Analysis (BUG-DR-OCR-01) ---")
xray_payload = {"patient_id": "patient-ramesh"}
r = client.post("/api/doctor/xray/analyze-patient", json=xray_payload)
assert r.status_code == 200, f"X-Ray analysis failed: {r.text}"
xray_data = r.json()
assert xray_data["status"] == "success"
print(f"YOLOv7 X-Ray inference successful: {len(xray_data['detections'])} detections returned")

print("\n--- 8. Testing Clinic Lead Capture (BUG-HOME-03) ---")
lead_payload = {
    "name": "Dr. Ananya Roy",
    "contact": "+91 98333 44556",
    "clinic": "Roy Diabetes & Endocrine Care",
}
r = client.post("/api/clinic/access-request", json=lead_payload)
assert r.status_code == 200, f"Clinic lead capture failed: {r.text}"
print(f"Clinic lead captured: {r.json()['message']}")

print("\n=======================================================")
print("ALL 8 CROSS-ROLE CLINICAL WORKFLOW TESTS PASSED CLEANLY!")
print("=======================================================")
