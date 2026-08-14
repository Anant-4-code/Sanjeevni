# Sanjeevani — Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Draft
**Owner:** [Your Name]
**Last Updated:** August 2026

---

## 1. Overview

Sanjeevani is an AI-augmented hospital operations and patient-care ecosystem that digitizes the full clinical loop — reception, physician consultation, pharmacy, lab, and patient self-care — into four connected web portals sharing one patient-centric backend. The core problem it solves: **prescriptions and clinical data are fragmented, illegible, and disconnected across doctors, pharmacies, and patients**, causing missed doses, dangerous drug interactions, and slow, error-prone hospital workflows.

The system uses AI (OCR, computer vision, ASR, LLM/RAG) to translate messy real-world clinical inputs (handwriting, X-rays, speech) into structured, safe, verifiable digital records — but a human (the doctor) always retains final sign-off authority.

## 2. Goals & Non-Goals

### 2.1 Goals
- Give reception a fast, structured way to register and triage patients.
- Give doctors an AI-assisted workspace that speeds up documentation, X-ray review, and prescription verification without removing clinical control.
- Give patients a zero-install PWA that makes their care plan understandable, safe (via interaction checks), and accessible in regional languages.
- Give pharmacy and lab staff real-time, error-free digital queues fed directly from verified doctor orders.
- Maintain a single unified, patient-centric data model so multi-doctor, multi-disease (polypharmacy) patients are safely cross-checked.

### 2.2 Non-Goals (v1)
- Sanjeevani does not replace a hospital's core HIS/billing system — it is a clinical workflow + patient engagement layer (though it emits ICD-10/CPT codes for billing handoff).
- The AI never auto-diagnoses or auto-prescribes; all clinical actions require explicit human verification.
- No native mobile app in v1 — patient portal is PWA-only.
- No offline mode for doctor/reception/pharmacy portals in v1 (only the Patient PWA supports offline caching via Service Workers).

## 3. Users & Personas

| Persona | Portal | Core Need |
|---|---|---|
| Receptionist | `/reception` | Fast intake, document scanning, correct triage routing |
| Doctor | `/doctor` | Fast, accurate documentation + safe prescribing |
| Patient | `/patient` (PWA) | Understand & follow care plan, stay safe from interactions |
| Pharmacist | `/pharmacy` | Accurate, fast dispensing; inventory foresight |
| Lab Technician | `/lab` | Clear order routing, fast result entry |
| Hospital Admin | `/admin` (future) | Oversight, analytics, user management |

## 4. System Scope — Five Portals

1. **Reception & Onboarding Portal** (`/reception`)
2. **Physician Command Workspace** (`/doctor`)
3. **Patient Care Portal — PWA** (`/patient`)
4. **Pharmacy Module** (`/pharmacy`)
5. **Laboratory Module** (`/lab`)

All five share one PostgreSQL-backed FastAPI core and communicate in real time via WebSockets/SSE.

---

## 5. Detailed Feature Requirements

### 5.1 Reception Portal

| # | Feature | Description | Priority |
|---|---|---|---|
| R1 | Digital Patient Registration | React form → `POST /api/patients/new` → generates UUID `patient_id`, stores in `patients` table | P0 |
| R2 | Web-Based Scan Ingestion | Camera/file capture (`<input capture="environment">`), client-side compression, `POST /api/upload/scan` to object storage | P0 |
| R3 | Smart Triage Engine | NLP classifies chief complaint into severity (Routine/Urgent/Critical), reorders queue via WebSocket | P0 |
| R4 | Quick Patient Lookup | Debounced (300ms) search, ILIKE/full-text search on name/phone | P1 |
| R5 | Autonomous Voice-Booking Agent | WebRTC + low-latency LLM voice agent for phone appointment booking in regional languages | P2 (stretch) |
| R6 | Automated ICD-10/CPT Coding | LLM parses SOAP note → billing codes for claims accuracy | P2 (stretch) |

**Acceptance criteria (R1):** Form submits with required fields validated client-side (react-hook-form); on success, patient record appears in Doctor queue within 2s via WebSocket push.

**Acceptance criteria (R3):** A complaint containing critical-risk keywords (e.g. chest pain, breathlessness, severe bleeding) is scored Level 3 and appears at queue position 1 regardless of arrival order, with a visible red flag.

### 5.2 Physician Command Workspace

| # | Feature | Description | Priority |
|---|---|---|---|
| D1 | Interactive Consultation Queue | Real-time, acuity-sorted queue via WebSocket, joined from `doctor_queues` + `patients` | P0 |
| D2 | X-Ray Canvas Overlay | Canvas-rendered bounding boxes from stored model JSON over raw image | P0 |
| D3 | Side-by-Side OCR Verification | Split view: raw scan (pan/zoom) vs. editable structured fields from OCR JSON | P0 |
| D4 | Pharmacological Guardrails | Live interaction check on every medication-list edit; blocking banner on contraindication | P0 |
| D5 | One-Click Protocol Sign-Off | Hash + timestamp + `doctor_id` written to immutable `verification_logs`; triggers pharmacy/patient/notification fan-out | P0 |
| D6 | Ambient Voice Documentation | MediaRecorder → Whisper transcription → LLM → structured SOAP note | P1 |

**Acceptance criteria (D4):** Guardrail check must respond in <500ms (perceived instant) and must block sign-off (not just warn) on "severe" severity interactions.

**Acceptance criteria (D5):** Sign-off is irreversible/immutable — corrections require a new versioned protocol entry, never an edit to a signed record.

### 5.3 Patient Care Portal (PWA)

| # | Feature | Description | Priority |
|---|---|---|---|
| P1 | Zero-Install PWA Shell | `manifest.json`, installable, theme `#050505` | P0 |
| P2 | Daily Dosing Checklist + Adherence Score | Optimistic UI toggle, `PATCH /api/intake/toggle`, adherence = taken/scheduled × 100 | P0 |
| P3 | OTC Safety Scanner | Camera capture of OTC label → CV extraction → RAG cross-check vs. active prescriptions | P1 |
| P4 | Universal Health Passport (QR) | Time-limited signed QR exposing read-only consolidated record to a scanning doctor | P1 |
| P5 | Condition-Tagged Dosing Timeline | Each dose displays disease + prescribing doctor | P0 |
| P6 | Sanjivini AI Copilot (RAG) | Context-constrained chat, strict no-diagnosis system prompt | P1 |
| P7 | Regional Audio Care Engine | Browser `speechSynthesis` reads schedule aloud in Hindi/Marathi/English etc. | P1 |
| P8 | Digital Records Vault | Client-side PDF export (jsPDF + html2canvas) | P2 |
| P9 | OCR Evidence Viewer | Tap medicine → zoom/pan animation into handwriting crop using stored bounding box | P1 |
| P10 | Offline Support | Service Worker caches schedule; syncs on reconnect | P1 |

**Acceptance criteria (P6):** Copilot must refuse to answer any new-symptom / diagnostic question and instead direct the patient to contact their doctor or emergency services — this is a hard guardrail, tested explicitly in QA.

### 5.4 Pharmacy Module

| # | Feature | Description | Priority |
|---|---|---|---|
| PH1 | Direct Digital Dispensing | Queue filtered `status='VERIFIED' AND dispensed=FALSE`, SSE/WebSocket live updates | P0 |
| PH2 | Safety Lock Badge | Surfaces any interaction flag raised during doctor review as a final-check badge | P0 |
| PH3 | Predictive Inventory | Time-series forecast (Prophet / moving average) on prescribed volume vs. stock | P2 |
| PH4 | Pill Image Verification | Webcam capture → MobileNetV3 classifier confirms pill matches prescription before dispensing | P2 |

### 5.5 Laboratory Module

| # | Feature | Description | Priority |
|---|---|---|---|
| L1 | Digital Order Routing | `diagnostic_orders` table; Kanban board (Pending Draw → Analyzing → Results Ready) | P0 |
| L2 | Plain-Language Result Translation | LLM converts raw values into a 2-sentence, non-diagnostic patient summary | P1 |
| L3 | Dual View Storage | Raw clinical JSON (doctor) + translated string (patient) both persisted | P0 |

---

## 6. AI/ML Model Inventory

| Capability | Model | Notes |
|---|---|---|
| Handwriting region detection | YOLO26 / YOLO11 | Locates medicine name, dosage, signature regions |
| Handwriting transcription | Microsoft TrOCR (`trocr-base-handwritten`) | Runs on cropped YOLO regions |
| X-ray abnormality detection | Custom fine-tuned detector (fracture etc.) | Outputs `{label, confidence, box}` JSON |
| Speech-to-text | OpenAI Whisper (`small`/`base`) | Ambient documentation |
| SOAP note structuring | LLM (Gemma / Llama 3 / BioMistral) | Prompted, not fine-tuned |
| Triage NLP classification | Lightweight classifier / keyword+embedding hybrid | Severity levels 1–3 |
| RAG patient copilot | BAAI/bge-m3 embeddings + ChromaDB + BioMistral 7B (local) or OpenRouter free-tier LLM (API fallback) | Strict context-constrained prompting |
| Pill image verification | MobileNetV3 (fine-tuned) | Real-time webcam inference |
| ICD-10/CPT coding | LLM (prompted) | Maps SOAP note to billing codes |
| Predictive inventory | Prophet / moving average | Batch job |

## 7. Non-Functional Requirements

- **Privacy/PHI:** Prefer local LLM inference (Ollama/BioMistral) for any flow touching patient data; API fallback (OpenRouter) only for non-PHI-context tasks unless a BAA-equivalent agreement is in place.
- **Latency:** Triage classification <1s; guardrail check <500ms; queue updates <2s end-to-end.
- **Availability:** Doctor/reception/pharmacy portals target 99.5% uptime during hospital hours.
- **Auditability:** All sign-off actions are hashed, timestamped, and immutable (append-only `verification_logs`).
- **Accessibility:** Patient portal must support screen readers and regional-language TTS; brutalist high-contrast UI aids low-vision users.
- **Security:** JWT-based auth per role, row-level access control so a doctor can only see patients in their queue, RBAC on all endpoints, encrypted storage for scans and audio.

## 8. Success Metrics

- Reduction in average reception intake time (target: <2 min per patient).
- % of prescriptions verified with zero post-hoc correction.
- Patient adherence score improvement over 30/60/90 days.
- Number of interaction warnings caught before dispensing (safety net effectiveness).
- Time-to-diagnosis reduction via faster lab result routing.

## 9. Release Plan (Suggested Phasing)

- **Phase 1 (MVP):** Reception intake + triage, Doctor queue + OCR verification + guardrails + sign-off, Patient dosing checklist + condition tags, Pharmacy dispensing queue. (Covers P0 items above.)
- **Phase 2:** X-ray overlay, Ambient voice documentation, RAG copilot, QR health passport, Lab module, TTS audio engine.
- **Phase 3:** OTC scanner, predictive inventory, pill verification CV, voice booking agent, ICD-10 auto-coding, offline sync hardening.

---

*See `02_ARCHITECTURE.md`, `03_DATABASE_SCHEMA.md`, `04_API_SPEC.md`, and `05_DESIGN_SYSTEM.md` for implementation detail.*
