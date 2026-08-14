# Sanjeevani — API Specification (v1)

Base URL: `/api`
Auth: `Authorization: Bearer <JWT>` on all endpoints except `/auth/*`.
Content-Type: `application/json` unless uploading files (`multipart/form-data`).

---

## Auth

### `POST /auth/login`
Staff login (email/phone + password).
```json
// Request
{ "identifier": "doc@hospital.com", "password": "..." }
// Response
{ "access_token": "...", "refresh_token": "...", "role": "doctor", "user_id": "uuid" }
```

### `POST /auth/otp/request` / `POST /auth/otp/verify`
Patient login via phone OTP (no password).

---

## Reception

### `POST /api/patients/new`
Create a new patient record.
```json
// Request
{
  "full_name": "Ramesh Kumar",
  "age": 58,
  "gender": "male",
  "phone": "+919876543210",
  "emergency_contact_name": "Sita Kumar",
  "emergency_contact_phone": "+919876500000",
  "chief_complaint": "Severe chest pressure and shortness of breath"
}
// Response 201
{ "patient_id": "uuid", "triage": { "severity_level": 3, "label": "CRITICAL" }, "token_number": 14 }
```
Triage classification runs synchronously inline (<1s) before response.

### `GET /api/patients/search?q=`
Debounced lookup by name or phone. Returns list of `{patient_id, full_name, phone, last_visit}`.

### `POST /api/upload/scan`
`multipart/form-data`: `file`, `patient_id`, `category` (`outside_prescription` | `xray` | `lab_report`).
```json
// Response 202 (async processing)
{ "scan_id": "uuid", "ocr_status": "processing" }
```
Client should subscribe to WebSocket `scan_ready` event or poll `GET /api/scans/{scan_id}`.

---

## Doctor

### `GET /ws/doctor/{doctor_id}` (WebSocket)
Server pushes events:
```json
{ "type": "queue_update", "queue": [ { "patient_id": "...", "token_number": 14, "severity_level": 3, "chief_complaint": "..." } ] }
{ "type": "scan_ready", "scan_id": "...", "patient_id": "..." }
```

### `GET /api/doctor/queue`
Fallback REST snapshot of the acuity-sorted queue.

### `GET /api/doctor/patients/{patient_id}/scan/{scan_id}`
Returns OCR structured JSON + raw file URL + bounding boxes, for the split-screen view.
```json
{
  "file_url": "https://.../scan.jpg",
  "extracted_items": [
    { "drug_name": "Noveron", "dosage": "500mg", "frequency": "1-0-1", "bounding_box": {"x":150,"y":300,"w":80,"h":30}, "confidence": 0.88 }
  ]
}
```

### `GET /api/doctor/patients/{patient_id}/xray/{scan_id}`
```json
{
  "file_url": "https://.../xray.jpg",
  "detections": [ { "label": "fracture", "confidence": 0.92, "box": {"x":120,"y":80,"w":45,"h":60} } ]
}
```

### `POST /api/doctor/guardrail-check`
Called on every medication list edit. Must respond <500ms.
```json
// Request
{ "patient_id": "uuid", "draft_prescription_id": "uuid", "medication_items": [ {"medication_id":"uuid","dosage":"500mg"} ] }
// Response
{
  "safe": false,
  "flags": [
    { "medication_id": "uuid", "conflicting_with": "Warfarin (Dr. Sharma, Cardiology)", "severity": "severe",
      "message": "Severe interaction with active blood thinner." }
  ]
}
```

### `POST /api/doctor/verify`
Sign-off. Blocked if any unacknowledged `severe` flag exists.
```json
// Request
{ "prescription_id": "uuid", "final_state": { "...": "..." } }
// Response 200
{ "status": "verified", "protocol_hash": "sha256:...", "verified_at": "2026-08-12T10:00:00Z" }
```
Triggers: pharmacy queue insert, patient notification dispatch, diagnostic_orders creation (if any).

### `POST /api/doctor/dictation`
`multipart/form-data`: `audio_file`.
```json
// Response
{ "transcript": "...", "soap_note": { "subjective": "...", "objective": "...", "assessment": "...", "plan": "..." } }
```

---

## Patient Portal

### `GET /api/patient/{patient_id}/timeline`
Merged, condition-tagged dosing schedule across all doctors.
```json
{
  "adherence_score": 92,
  "schedule": [
    { "time": "08:00", "medicine": "Metformin 500mg", "condition": "DIABETES", "doctor": "Dr. Patel", "taken": true, "prescription_item_id": "uuid" }
  ]
}
```

### `PATCH /api/intake/toggle`
```json
// Request
{ "prescription_item_id": "uuid", "scheduled_at": "2026-08-12T08:00:00Z", "taken": true }
// Response 200
{ "adherence_score": 93 }
```

### `POST /api/patient/otc-scan`
`multipart/form-data`: `image`.
```json
{ "detected_ingredients": ["Pseudoephedrine"], "verdict": "WARNING",
  "message": "This decongestant may interact with your blood pressure medication (Dr. Rai)." }
```

### `POST /api/patient/health-passport`
Generates a short-lived signed QR token.
```json
{ "qr_token": "eyJ...", "expires_at": "2026-08-12T10:05:00Z" }
```

### `GET /api/passport/{qr_token}` (used by a scanning doctor)
Returns read-only consolidated record; token single-use, expires in minutes.

### `POST /api/patient/copilot`
```json
// Request
{ "patient_id": "uuid", "question": "Can I drink milk with my morning pill?" }
// Response
{ "answer": "...", "guardrail_triggered": false }
```
If `guardrail_triggered: true`, `answer` is always the safe fallback: contact-your-doctor / emergency-room language, regardless of what was asked.

### `GET /api/patient/{patient_id}/records/export` → returns data for client-side PDF generation (jsPDF), not a server-rendered PDF.

---

## Pharmacy

### `GET /sse/pharmacy` (Server-Sent Events)
Streams queue updates: `{ "type": "new_dispense", "prescription_id": "...", "items": [...], "safety_flag": null | {...} }`

### `GET /api/pharmacy/queue`
REST snapshot: `status='VERIFIED' AND dispensed=FALSE`.

### `POST /api/pharmacy/dispense`
```json
{ "prescription_id": "uuid", "pharmacist_id": "uuid" }
```

### `POST /api/pharmacy/verify-pill`
`multipart/form-data`: `image_file`, `expected_medicine`.
```json
{ "detected_pill": "Noveron 500mg", "confidence": 0.97, "is_safe_to_dispense": true }
```

### `GET /api/pharmacy/inventory/forecast`
```json
{ "alerts": [ { "medication": "Noveron 500mg", "days_remaining": 3 } ] }
```

---

## Lab

### `GET /sse/lab`
Kanban status stream.

### `POST /api/lab/orders/{order_id}/status`
```json
{ "status": "analyzing" }
```

### `POST /api/lab/results`
```json
// Request
{ "diagnostic_order_id": "uuid", "raw_values": { "hemoglobin": 11.2, "unit": "g/dL" } }
// Response
{ "patient_summary": "Your Hemoglobin is slightly lower than normal, which might explain the tiredness. This is not a diagnosis — please discuss with your doctor." }
```

---

## Error Format (all endpoints)

```json
{ "error": { "code": "GUARDRAIL_BLOCKED", "message": "Cannot verify: severe drug interaction unacknowledged." } }
```

Standard codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `GUARDRAIL_BLOCKED`, `PROCESSING` (202-style async-not-ready), `RATE_LIMITED`.
