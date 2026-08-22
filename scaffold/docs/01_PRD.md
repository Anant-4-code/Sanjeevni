# Sanjeevani — Complete Product Requirement Document (PRD)

> **Document Version:** 2.0 (Production Master)  
> **Status:** Approved / Active Specification  
> **Target System:** Sanjeevani Multi-Portal Healthcare Intelligence Platform  
> **Architecture:** Next.js 14 PWA + Vite 5 Portals + FastAPI + Supabase PostgreSQL + Hybrid Edge AI

---

## 1. Executive Summary & Vision

**Sanjeevani** is an end-to-end clinical intelligence and healthcare workflow ecosystem designed to eliminate medical transcription errors, bridge communication gaps between clinical staff and patients, and enforce database-level patient safety.

Physical paper prescriptions, diagnostic pathology sheets, X-Ray films, and hospital discharge summaries represent over 80% of clinical data in outpatient workflows, yet remain siloed, vulnerable to misinterpretation, and isolated from historical medical context.

Sanjeevani solves this through:
1. **Multi-Role Clinical Collaboration:** Dedicated portals for Receptionists, Physicians, Patients, Pharmacists, and Lab Technicians operating seamlessly on a shared real-time PostgreSQL/Supabase spine.
2. **Hybrid Vision & OCR Intelligence:** Multi-engine OCR (Tesseract LSTM + Gemma 4 31B / Llama 3.1 70B clinical extraction) paired with real-time YOLOv7 bone-fracture detection.
3. **Active Pharmacological Guardrails:** Server-enforced drug-drug, drug-allergy, and dosage contraindication checks at the moment of prescription verification.
4. **Immutable Clinical Audit Logs:** Cryptographically hashed (`SHA-256`) sign-off records stored in append-only verification ledgers.
5. **Patient-Centric Adherence Ecosystem:** Next.js PWA providing universal QR health passports, condition-tagged dosing schedules, caregiver access, intelligent refill tracking, symptom journaling, and plain-language report explanations.
6. **Multi-Document Universal Record Access:** Single-endpoint cross-doctor historical record aggregation, multi-document versioned archiving, and longitudinal biomarker trend charting.

---

## 2. Stakeholders & User Personas

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SANJEEVANI ECOSYSTEM                                      │
├───────────────┬────────────────┬───────────────────────────┬────────────────┬───────────────┤
│  RECEPTION    │   PHYSICIAN    │          PATIENT          │    PHARMACY    │  LABORATORY   │
│  (Intake)     │  (Consult)     │     (Adherence & PWA)     │  (Dispense)    │  (Pathology)  │
├───────────────┼────────────────┼───────────────────────────┼────────────────┼───────────────┤
│ • Quick Reg   │ • Acuity Queue │ • Dosing Checklist & Ring │ • Live Rx Feed │ • Test Orders │
│ • NLP Triage  │ • OCR Review   │ • 8 Adherence Features    │ • Safety Lock  │ • Dual View   │
│ • Doc Ingest  │ • X-Ray Canvas │ • Offline Vault & QR Pass │ • Stock Alerts │ • Plain Lang  │
│ • Token Disp  │ • Guardrails   │ • Caregiver Delegation    │ • Pill Verify  │ • Bio Trends  │
│ • Desk Search │ • Full Record  │ • AI Copilot (Guarded)    │ • Dispense Log │ • Fast Routing│
└───────────────┴────────────────┴───────────────────────────┴────────────────┴───────────────┘
```

### 2.1 Receptionist / Triage Desk
- **Goals:** Rapid patient intake (<2 min), digitize paper slips/scans immediately, triage urgent cases automatically.
- **Pain Points:** Crowded waiting rooms, manual data entry errors, inability to assess clinical acuity at desk.

### 2.2 Physician / Consulting Specialist
- **Goals:** Instant view of complete cross-doctor patient history, verify OCR prescriptions with minimal clicks, catch dangerous drug interactions instantly, order labs and schedule follow-ups without context-switching.
- **Pain Points:** Illegible past records, unawareness of medications prescribed by other clinics, medicolegal liability, administrative burnout.

### 2.3 Patient & Family Caregivers
- **Goals:** Clear understanding of which pill to take and why, multi-language dosing reminders, one-tap refill requests, secure document vault, sharing health records via QR.
- **Pain Points:** Confusing dosage schedules, forgetting medications, complex medical jargon in lab reports, inability for elderly patients' children to monitor intake remotely.

### 2.4 Pharmacist
- **Goals:** Only dispense verified prescriptions, see explicit doctor sign-off hashes, get highlighted safety warnings for flagged interactions.
- **Pain Points:** Dispensing errors from doctor handwriting, lack of patient allergy context at counter.

### 2.5 Laboratory Technician & Pathologist
- **Goals:** Digital test requisition queue, simple raw value entry, automated conversion into patient-comprehensible summaries.
- **Pain Points:** Unclear handwritten doctor test orders, patients constantly asking lab techs to interpret clinical numbers.

---

## 3. Core Architecture & Technology Stack

| Layer | Technologies | Key Responsibilities |
|---|---|---|
| **Patient PWA** | Next.js 14 (App Router), React 18, TailwindCSS, Service Workers | Patient portal, Vault, Caregiver tools, QR Passport, Copilot |
| **Doctor Portal** | Vite 5, React 18, TypeScript, TailwindCSS (Dark Theme) | Acuity Queue, OCR Editor, X-Ray Canvas, Full Record, Guardrails |
| **Staff Portals** | Vite 5, React 18, TypeScript, TailwindCSS | Reception, Pharmacy, and Lab workbenches |
| **UI Component Kit**| `@sanjeevani/ui` workspace package | Shared design tokens, buttons, inputs, severity badges, theme vars |
| **API Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 | REST routing, guardrail engine, OCR pipelines, AI orchestration |
| **Database & Auth**| Supabase PostgreSQL 15, PostgREST, Supabase Auth | Tables, Enums, Foreign Keys, Triggers, Row-Level Security (RLS) |
| **AI / OCR Engines**| Tesseract LSTM, Google Gemma 4 31B, NVIDIA Llama-3.1 70B, YOLOv7-p6 ONNX | Handwriting extraction, clinical JSON formatting, fracture detection |
| **Realtime & Messaging**| WebSockets, Supabase Realtime, Server-Sent Events | Queue auto-refresh, alert push, dispense notifications |

---

## 4. Detailed Functional Specifications by Portal

### 4.1 Reception Portal (`/reception`)

```
┌───────────────────────────────────────────────────────────────┐
│ RECEPTION DESK — FAST INTAKE                                  │
├───────────────────────────────────────────────────────────────┤
│ [ Full Name: Ramesh Kumar   ] [ Age: 58 ] [ Gender: Male ▾ ]  │
│ [ Phone: +91 98765 43210    ] [ Emergency Phone: ...       ]  │
│ [ Chief Complaint: Severe chest pain radiating to left arm  ] │
│   ↳ AI Triage: 🚨 CRITICAL (Level 3) → Assigned Token #14     │
│ [ Scan Ingestion: Drag & Drop Rx / Camera Snap             ]  │
│ [ Submit & Push to Doctor Queue ]                             │
└───────────────────────────────────────────────────────────────┘
```

| ID | Feature | Description | Priority |
|---|---|---|---|
| **R1** | Digital Patient Registration | Capture demographics (`full_name`, `age`, `gender`, `phone`, `emergency_contact`) into `patients` table. | P0 |
| **R2** | Document/Scan Ingestion | Camera capture / file drop (`<input capture="environment">`) uploading to Supabase storage + linked `scans` table entry. | P0 |
| **R3** | Real-Time NLP Triage Engine | Classifies complaints into Routine (1), Urgent (2), Critical (3). Keywords like *chest pain*, *unconscious*, *severe bleeding* instantly assign Level 3. | P0 |
| **R4** | Live Queue Dispatch | Generates token numbers and places patient directly into target `doctor_queues` with acuity priority. | P0 |
| **R5** | Debounced Directory Search | Sub-300ms lookup across phone numbers and patient names via Trigram index (`gin_trgm_ops`). | P1 |
| **R6** | Voice-Assisted Intake (Optional) | Speech-to-text intake in regional languages for desk staff. | P2 |

---

### 4.2 Physician Command Workspace (`/doctor`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHYSICIAN WORKSPACE — Dr. Nitin Sharma                                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [QUEUE]  #14 Vikram Singh (65M) - Chest Pain [CRITICAL] ── ACTIVE CONSULT              │
│          #12 Sita Devi (45F) - High Fever 102°F [URGENT]                               │
│          #09 Ramesh Kumar (58M) - Diabetes Follow-up [ROUTINE]                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TABS: [ Overview ] [ Prescribe & OCR ] [ Dictation & SOAP ] [ Full Medical Record ]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Interactive Guardrail Engine (Live Drug-Drug & Allergy Contraindication Checks)      │
│ • Side-by-Side OCR Verification (Pan/Zoom Scan vs Structured Medicine Form)           │
│ • X-Ray Canvas Overlay (YOLOv7 Bone Fracture Bounding Boxes + Confidence Scores)      │
│ • Immutable Sign-off (SHA-256 Hash Protocol Ledger)                                    │
│ • Refill Approval Queue & Symptom Review Panel                                         │
│ • Full Patient Record (Cross-doctor chronological timeline, lab trends, doc archive)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| ID | Feature | Description | Priority |
|---|---|---|---|
| **D1** | Acuity-Sorted Queue | Orders waiting patients by Severity Level DESC, then arrival timestamp ASC. | P0 |
| **D2** | OCR Side-by-Side Verification | Split-screen showing original scanned prescription alongside auto-parsed drug, dosage, frequency, and duration fields. | P0 |
| **D3** | Live Pharmacological Guardrails | Fast server-side check evaluating active medications + new items against known interactions and allergy profiles. | P0 |
| **D4** | Immutable Sign-Off Protocol | Computes `SHA-256` digest of verified prescription state; writes to append-only `verification_logs`; sets status to `verified`. | P0 |
| **D5** | X-Ray Fracture Detection | Overlays YOLOv7-p6 ONNX bounding boxes and classification tags directly over radiology images. | P1 |
| **D6** | Ambient Voice & SOAP Note | Records doctor consultation audio, runs transcription, and formats Subjective-Objective-Assessment-Plan clinical notes. | P1 |
| **D7** | Refill Approval Queue | Review pending medication refill requests submitted by patients or caregivers with one-click approve/deny. | P0 |
| **D8** | Diagnostic Lab Order Desk | Place lab orders (`diagnostic_orders`) with clinical notes; automatically dispatches to Lab Portal. | P0 |
| **D9** | Follow-Up Scheduler | Book follow-up visit dates; automatically generates patient notifications and calendar reminders. | P0 |
| **D10**| Full Patient Record (Spec 12) | Single-call endpoint (`/api/doctor/patient/{id}/full-record`) loading cross-doctor prescription timeline, multi-category documents, and lab trends. | P0 |
| **D11**| Document Verification Action | Doctor can review patient-uploaded external documents and promote them to `clinic_verified`. | P0 |

---

### 4.3 Patient Care Portal — PWA (`/patient`)

```
┌───────────────────────────────────────────────────────────────┐
│ SANJEEVANI PATIENT PORTAL (PWA)                               │
├───────────────────────────────────────────────────────────────┤
│ [Adherence Score: 85%] 🟢 Excellent   [Universal QR Passport]  │
├───────────────────────────────────────────────────────────────┤
│ TODAY'S DOSING TIMELINE:                                      │
│ 🌅 Morning (8:00 AM)                                          │
│   • Metformin 500mg (1 Tab) — Diabetes [Dr. Sharma] [✓ Taken] │
│ 🌙 Night (9:00 PM)                                            │
│   • Gabapin NT 100mg (1 Tab) — Neuropathy [Dr. Rai] [Mark]    │
├───────────────────────────────────────────────────────────────┤
│ 8 ADHERENCE FEATURES:                                         │
│ 1. Refill Intelligence (Low Stock Alerts & 1-Tap Refill)       │
│ 2. Symptom Journal (Daily Mood, Score & Trend Tracking)       │
│ 3. Caregiver Access (Family Member Delegation & Dose Marking) │
│ 4. Smart Reminders (In-App, WhatsApp, SMS Sync)               │
│ 5. Allergy & Interaction Profile (Patient + Confirmed)        │
│ 6. Plain-Language Report Explanations (Biomarker Summaries)   │
│ 7. Medication Cost & Generic Alternatives Analyzer            │
│ 8. Clinical Visit Prep (Symptom summary for next doctor visit)│
├───────────────────────────────────────────────────────────────┤
│ VAULT & SCANNER:                                              │
│ • Universal Scanner Hub (`/scan-otc`) with File & Camera Drop │
│ • Multi-Document Categorized Vault (`/vault`)                 │
│ • Offline Service Worker Cache & Sync                         │
│ • Guarded AI Copilot (Strict No-Diagnosis Policy)             │
└───────────────────────────────────────────────────────────────┘
```

#### The 8 Patient Adherence Ecosystem Features:

1. **Refill Intelligence (P-REF):** Tracks remaining pills, calculates days of supply left, fires low-stock alerts, and lets patient or caregiver trigger 1-tap refill requests sent to the prescribing doctor.
2. **Symptom Journal (P-SYM):** Daily wellness check-in logging feeling score (1–5), energy, mood, sleep, and free-text notes. Automatically detects negative streaks and alerts the physician.
3. **Caregiver Access & Delegation (P-CAR):** Allows patients to invite family members or professional caregivers. Caregivers can view schedules and mark doses as taken with full audit attribution.
4. **Smart Reminders (P-REM):** Scheduled medication and appointment alerts across in-app banners, WhatsApp, and SMS channels with snooze support.
5. **Allergy & Interaction Profile (P-ALL):** Complete inventory of drug and environmental allergies (patient-reported and doctor-confirmed) integrated into prescribing safety checks.
6. **Plain-Language Report Explanations (P-REP):** Pathology reports automatically parsed into structured biomarker cards with clear reference ranges and 2-sentence non-diagnostic clinical summaries.
7. **Cost Awareness & Generic Alternatives (P-CST):** Highlights price breakdowns, monthly medication expenditures, and flags lower-cost bioequivalent generic alternatives.
8. **Clinical Visit Preparation (P-VIS):** Compiles questions the patient asked during the month, recent symptom logs, and medication compliance stats into a structured 1-page briefing for the next doctor consultation.

---

### 4.4 Pharmacy Dispensing Workbench (`/pharmacy`)

| ID | Feature | Description | Priority |
|---|---|---|---|
| **PH1**| Live Verified Prescriptions Stream | Real-time queue displaying prescriptions with `status='verified' AND dispensed=false`. | P0 |
| **PH2**| Safety Lock & Flag Badges | Highlights any acknowledged interaction warning or dosage precaution signed by the doctor. | P0 |
| **PH3**| Digital Dispense Confirmation | One-click barcode scan or button to mark items as dispensed, logging timestamp and pharmacist ID. | P0 |
| **PH4**| Stock Depletion Tracker | Updates `inventory_stock` levels upon dispensing; projects out-of-stock dates. | P1 |
| **PH5**| Pill Image AI Verification | Webcam snapshot evaluated against drug visual classifier to verify pill shape/color before bagging. | P2 |

---

### 4.5 Laboratory Workbench (`/lab`)

| ID | Feature | Description | Priority |
|---|---|---|---|
| **L1** | Diagnostic Order Queue | Kanban board tracking test orders across stages: `Pending Draw` → `Analyzing` → `Results Ready`. | P0 |
| **L2** | Structured Biomarker Entry | Simple tabular input for standard test panels (CBC, Lipid, Metabolic, Thyroid, HbA1c, etc.). | P0 |
| **L3** | Dual-View Output Generation | Stores clinical JSON for physician review + auto-generates plain-language non-diagnostic summary for patient vault. | P0 |
| **L4** | Report File Attachment | Upload scanned official laboratory PDF/image linked directly to `patient_documents` and `lab_results`. | P0 |

---

## 5. AI / ML Intelligence Pipeline & Guardrails

```
                    ┌──────────────────────────────────────────────────┐
                    │               RAW INPUT ARTIFACT                 │
                    │   (Paper Prescription / X-Ray / Lab Report PDF)  │
                    └────────────────────────┬─────────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
         ┌─────────────────────────┐                   ┌─────────────────────────┐
         │   PRESCRIPTION / TEXT   │                   │    RADIOLOGY / X-RAY    │
         └────────────┬────────────┘                   └────────────┬────────────┘
                      │                                             │
                      ▼                                             ▼
         ┌─────────────────────────┐                   ┌─────────────────────────┐
         │  Tesseract OCR Engine   │                   │  YOLOv7-p6 Fracture     │
         │  (Preprocessed Binarized│                   │  ONNX Inference Engine  │
         │   LSTM Engine PSM 6)    │                   │  (Bounding Box + Conf)  │
         └────────────┬────────────┘                   └────────────┬────────────┘
                      │                                             │
                      ▼                                             ▼
         ┌─────────────────────────┐                   ┌─────────────────────────┐
         │ Gemma 4 / Llama 3.1 LLM │                   │ Structured Detections   │
         │ (Clinical Regex + JSON  │                   │ JSON Overlay on Canvas  │
         │  Normalization Prompt)  │                   └─────────────────────────┘
         └────────────┬────────────┘
                      │
                      ▼
         ┌───────────────────────────────────────────────────────────┐
         │             STRUCTURED CLINICAL ENTITY GRAPH              │
         │  • Drug Name, Strength, Form, Dosage, Frequency, Duration │
         │  • Diagnosis & Condition Tags (e.g. Type 2 Diabetes)      │
         └────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
         ┌───────────────────────────────────────────────────────────┐
         │               ACTIVE GUARDRAIL ENGINE                     │
         │  • Drug-Drug Contraindication Matrix Check                │
         │  • Patient Allergy Cross-Check                            │
         │  • Duplicate Active Medication Warning                    │
         └────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
         ┌───────────────────────────────────────────────────────────┐
         │          IMMUTABLE SIGN-OFF & CRYPTOGRAPHIC HASH          │
         │   SHA-256(PatientID + Meds + DoctorID + Timestamp)        │
         │   Written to Append-Only `verification_logs` Ledger       │
         └───────────────────────────────────────────────────────────┘
```

### 5.1 AI Copilot Strict Guardrail Rules
- **No-Diagnosis Policy:** The patient AI Copilot strictly refuses to provide medical diagnoses or alter medication dosages.
- **Triage Redirection:** Any inquiry mentioning emergent symptoms (e.g., chest tightness, sudden numbness, anaphylaxis) triggers immediate display of emergency hotline numbers and urges the user to seek emergency care.
- **RAG Grounding:** Responses are grounded exclusively in verified patient prescriptions, doctor notes, and vetted clinical knowledge bases.

---

## 6. Database Schema & Security Model

### 6.1 Entity Relational Diagram Summary

```
app_users (auth mirror + roles)
  ├── patients (demographics, portal_user_id, registered_by)
  │     ├── chief_complaints (severity_level 1-3)
  │     │     └── doctor_queues (token_number, status, acuity-sorted)
  │     ├── scans (category, file_url, ocr_raw_json, xray_analysis_json)
  │     ├── prescriptions (soap_note_json, icd10_codes, status, verified_at)
  │     │     ├── prescription_items (dosage, frequency, duration, condition_tag)
  │     │     ├── verification_logs (append-only, protocol_hash, signed_at)
  │     │     ├── interaction_flags (severity, acknowledged_by_doctor)
  │     │     ├── pharmacy_dispense_log (pharmacist_id, dispensed_at)
  │     │     └── refill_requests (status, quantity, doctor_response)
  │     ├── intake_logs (scheduled_at, taken, marked_by_role, marked_by_id)
  │     ├── symptom_logs (feeling_score 1-5, symptoms json, energy, sleep)
  │     │     └── symptom_alerts (consecutive_days_count, acknowledged_by)
  │     ├── caregiver_links (caregiver_user_id, permissions, status)
  │     ├── patient_allergies (allergen_name, reaction_type, severity, confirmed)
  │     ├── diagnostic_orders (test_name, order_status, lab_results)
  │     │     └── lab_results (raw_values_json, patient_summary_text)
  │     ├── patient_documents (unified multi-doc store, category, source, version)
  │     │     └── document_access_log (audit trail of who viewed what)
  │     ├── patient_reminders (channels, remind_at, snoozed_to)
  │     └── follow_up_appointments (scheduled_date, reason, reminder_sent)
  └── medications (name, generic_name, category, interaction_tags)
```

### 6.2 Row Level Security (RLS) Policy Matrix

| Table | Patient Role | Doctor / Staff Roles | Service Role (FastAPI Backend) |
|---|---|---|---|
| `patients` | `SELECT` own record | Read through backend | Full Access |
| `prescriptions` | `SELECT` own record | Read/Write through backend | Full Access |
| `intake_logs` | `SELECT`, `INSERT`, `UPDATE` own | Read through backend | Full Access |
| `patient_documents` | `SELECT`, `INSERT` (tagged `patient_uploaded`) | Read/Verify via backend | Full Access |
| `verification_logs` | Access Denied | `INSERT` only (no `UPDATE`/`DELETE`) | Full Access (Audit Bypass) |
| `document_access_log` | Access Denied | Read/Write via backend | Full Access |
| `patient_allergies` | `SELECT`, `INSERT` self-reported | Read/Confirm via backend | Full Access |
| `symptom_logs` | `SELECT`, `INSERT` own | Read through backend | Full Access |

---

## 7. Non-Functional & Regulatory Requirements

1. **Sub-Second Guardrail Latency:** Drug interaction and allergy checks must return within `<500ms`.
2. **Deterministic Triage Speed:** NLP triage classification must complete within `<1000ms`.
3. **Auditability & Non-Repudiation:** Once signed by a physician, prescription records and verification logs cannot be updated or deleted. Corrections necessitate creating a superseded revision.
4. **Resilient Offline Operation:** The Patient PWA service worker caches the active dosing schedule and emergency medical summary in IndexedDB, enabling offline access.
5. **High-Contrast Design Tokens:** Accessible color palettes compliant with WCAG 2.1 AA standards; light clinical theme for patients, sleek dark workspace tokens for doctor and staff portals.

---

## 8. Release Roadmap & Implementation Status

| Milestone | Scope | Status |
|---|---|---|
| **Phase 1: Core Loop** | Reception registration, Triage NLP, Doctor consultation queue, OCR split-screen verification, Prescription sign-off, Patient dosing schedule, Pharmacy dispense stream. | ✅ Complete |
| **Phase 2: Clinical Extensions** | YOLOv7 bone-fracture detection, Ambient voice dictation (SOAP), Diagnostic Lab workbench with dual-view summaries, Universal QR Health Passport. | ✅ Complete |
| **Phase 3: 8 Adherence Features** | Refill intelligence, Symptom journal, Caregiver delegation, Smart multichannel reminders, Allergy profiles, Plain-language report explanations, Cost analysis, Visit prep. | ✅ Complete |
| **Phase 4: Multi-Doc & Full Record** | Generalized `patient_documents` store, `document_access_log`, Patient self-upload with verification flagging, Doctor Full Medical Record endpoint (`/full-record`), and longitudinal lab biomarker trend charts. | ✅ Complete |
| **Phase 5: Production Hardening** | Live Supabase webhook triggers, WhatsApp Business API integration for reminders, edge model optimization. | 🚀 In Progress |

---

*Authored by the Sanjeevani Engineering & Clinical Architecture Team.*
