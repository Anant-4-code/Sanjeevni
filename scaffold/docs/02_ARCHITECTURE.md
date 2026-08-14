# Sanjeevani — System Architecture

## 1. High-Level Architecture

```
                                   ┌─────────────────────────────────────────┐
                                   │              CLIENTS (React + Tailwind)  │
                                   │                                           │
                                   │  /reception   /doctor   /pharmacy  /lab   │
                                   │       (Vite + React, internal staff)      │
                                   │                                           │
                                   │  /patient  →  Next.js PWA (public)        │
                                   └───────────────┬───────────────────────────┘
                                                    │ HTTPS (REST) + WSS (realtime)
                                                    ▼
                                   ┌─────────────────────────────────────────┐
                                   │            API GATEWAY / FASTAPI CORE     │
                                   │  Auth (JWT) · RBAC · Rate limiting        │
                                   │  REST routers per domain                  │
                                   │  WebSocket / SSE hub                      │
                                   └───────┬───────────────┬───────────────────┘
                                           │               │
                        ┌──────────────────┘               └───────────────────┐
                        ▼                                                      ▼
        ┌───────────────────────────┐                          ┌───────────────────────────────┐
        │      AI INFERENCE LAYER    │                          │        DATA LAYER              │
        │  (async workers / queue)   │                          │                                 │
        │                             │                          │  PostgreSQL (relational core)  │
        │  • YOLO26 (region detect)  │                          │  ChromaDB (vector store, RAG)  │
        │  • TrOCR (handwriting)     │                          │  Object Storage (S3 / local)   │
        │  • X-ray detector          │                          │    - scans, X-rays, audio      │
        │  • Whisper (ASR)           │                          │  Redis (cache, pub/sub, queue) │
        │  • LLM (SOAP/RAG/coding)   │                          │                                 │
        │  • Triage classifier       │                          └───────────────────────────────┘
        │  • MobileNetV3 (pill CV)   │
        │  • Prophet (forecasting)   │
        └───────────────────────────┘
```

## 2. Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11+), Pydantic v2 for schema validation
- **Async task processing:** Celery or FastAPI `BackgroundTasks` + Redis broker for heavier AI jobs (OCR, X-ray, Whisper)
- **Database:** PostgreSQL 16 (SQLAlchemy 2.0 async ORM + Alembic migrations)
- **Vector DB:** ChromaDB (embedded, in-process) for the RAG pharmacological knowledge base
- **Realtime:** FastAPI native WebSockets for doctor/reception queues; Server-Sent Events for pharmacy/lab dashboards
- **Object storage:** AWS S3 (prod) / local filesystem volume (dev) for scans, X-rays, audio blobs
- **Cache/broker/pubsub:** Redis
- **Auth:** JWT (access + refresh tokens), role-based access control (`receptionist`, `doctor`, `pharmacist`, `lab_tech`, `patient`, `admin`)
- **AI serving:** Ollama (local LLM/BioMistral), local PyTorch inference for CV models, OpenRouter as API fallback for LLM calls

### Frontend
- **Staff portals** (`/reception`, `/doctor`, `/pharmacy`, `/lab`): React 18 + Vite, TypeScript, TailwindCSS, react-hook-form, TanStack Query, native WebSocket client
- **Patient portal** (`/patient`): Next.js (App Router) for PWA capability (manifest + service worker), TailwindCSS, same design tokens
- **Shared UI kit:** a small internal `@sanjeevani/ui` package (buttons, inputs, badges) built to the brutalist monochrome spec in `05_DESIGN_SYSTEM.md`, consumed by all portals for visual consistency

### Infra
- Docker Compose for local dev (api, postgres, redis, chroma, ollama)
- CI: lint + typecheck + test on PR
- Reverse proxy: Nginx / Caddy in front of FastAPI + static frontends
- Environments: dev → staging → prod, with separate object storage buckets and DB instances

## 3. Repository Structure

```
sanjeevani/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entrypoint
│   │   ├── core/                   # config, security, db session
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── patients.py
│   │   │   ├── uploads.py
│   │   │   ├── triage.py
│   │   │   ├── doctor.py
│   │   │   ├── pharmacy.py
│   │   │   ├── lab.py
│   │   │   ├── copilot.py
│   │   │   └── auth.py
│   │   ├── ai/
│   │   │   ├── ocr/                # YOLO + TrOCR pipeline
│   │   │   ├── xray/               # X-ray detector
│   │   │   ├── asr/                # Whisper wrapper
│   │   │   ├── llm/                # SOAP note, RAG, coding prompts
│   │   │   ├── triage_classifier.py
│   │   │   ├── pill_verification.py
│   │   │   └── inventory_forecast.py
│   │   ├── ws/                     # WebSocket connection manager
│   │   └── tasks/                  # Celery tasks
│   ├── alembic/
│   ├── tests/
│   ├── pyproject.toml / requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── apps/
│   │   ├── reception/               # Vite React app
│   │   ├── doctor/                  # Vite React app
│   │   ├── pharmacy/                # Vite React app
│   │   ├── lab/                     # Vite React app
│   │   └── patient/                 # Next.js PWA
│   └── packages/
│       └── ui/                      # shared design-system components
│
├── docs/
│   ├── 01_PRD.md
│   ├── 02_ARCHITECTURE.md
│   ├── 03_DATABASE_SCHEMA.md
│   ├── 04_API_SPEC.md
│   └── 05_DESIGN_SYSTEM.md
│
├── docker-compose.yml
└── README.md
```

## 4. Core Data Flow — "Reception to Pharmacy" End-to-End

1. **Reception** submits patient + chief complaint → `POST /api/patients/new` → row in `patients`, triage classifier scores severity → row in `doctor_queues` → WebSocket broadcast to `/doctor` clients subscribed to that hospital/department channel.
2. **Reception** uploads a scan → `POST /api/upload/scan` → file persisted to object storage → async job dispatched (Celery) → YOLO detects regions → TrOCR transcribes → structured JSON written to `prescription_drafts` (or `xray_analyses` for imaging) → doctor's client refetches/receives WebSocket "scan_ready" event.
3. **Doctor** opens the patient, reviews Canvas-rendered X-ray overlay and side-by-side OCR fields, edits as needed. Every field-level edit to the medication list triggers `POST /api/doctor/guardrail-check` (fast, <500ms) against the patient's full active-medication set (pulled across *all* prescribing doctors) plus a pharmacological interaction dataset.
4. **Doctor** clicks **Verify & Activate** → `POST /api/doctor/verify` → backend hashes the final protocol JSON, writes an immutable row to `verification_logs`, sets `prescriptions.status = 'VERIFIED'`. This single write fans out to:
   - `pharmacy_queue` (new dispense-ready row, pushed via SSE to `/pharmacy`)
   - `patient` notification (Twilio/WhatsApp deep link into the PWA)
   - `diagnostic_orders` if labs were also ordered in the same consult
5. **Pharmacy** dispenses, marks `dispensed = TRUE`, `dispensed_at` timestamp recorded.
6. **Patient** opens PWA, sees the merged, condition-tagged dosing timeline pulling *all* verified prescriptions across all their doctors, toggles doses taken, and can ask the Sanjivini Copilot questions scoped strictly to their own verified data + the RAG knowledge base.

## 5. Realtime Strategy

| Channel | Mechanism | Consumers |
|---|---|---|
| Doctor queue updates | WebSocket (`/ws/doctor/{doctor_id}`) | Doctor portal |
| Scan/X-ray ready | WebSocket event within doctor channel | Doctor portal |
| Pharmacy queue | Server-Sent Events (`/sse/pharmacy`) | Pharmacy portal |
| Lab Kanban status | Server-Sent Events (`/sse/lab`) | Lab portal |
| Patient notifications | Twilio/WhatsApp webhook (external), not in-app realtime | Patient's phone |

WebSockets are chosen over SSE where bidirectional push matters (doctor queue reorder); SSE is used where the flow is one-directional server→client (pharmacy/lab dashboards), which is simpler to scale behind standard HTTP infra.

## 6. AI Pipeline Design Notes

- All AI inference that is not sub-200ms (OCR, X-ray, Whisper, LLM) runs **asynchronously** via a Celery/Redis task queue — the API returns immediately with a `processing` status, and the frontend either polls or receives a WebSocket "ready" event. This keeps reception/doctor UI responsive.
- The **triage classifier** and **guardrail check** are the two exceptions: they must be synchronous and fast, so they should be lightweight (rule-augmented embedding similarity or a small fine-tuned classifier, not a full LLM call) to hit the <1s / <500ms targets.
- The **RAG copilot** always injects the patient's *own verified prescription JSON* as hidden system context, retrieves top-k chunks from ChromaDB (pharmacological guidelines), and is prompted with an explicit "do not diagnose, refer to doctor" fallback instruction. This should be enforced with both prompt engineering *and* a lightweight output classifier that detects diagnostic language and substitutes the safe fallback response before it reaches the patient.
- PHI should not leave the hospital's infrastructure by default — prefer local model serving (Ollama) for anything touching identifiable patient data; the OpenRouter free-tier fallback is only acceptable for de-identified or non-PHI prompts, or once a proper data-processing agreement is in place.

## 7. Security & Compliance Notes

- JWT auth, short-lived access tokens + refresh tokens, per-role scopes enforced at the router-dependency level in FastAPI.
- Object storage buckets private by default; signed URLs with short expiry for scan/X-ray access.
- `verification_logs` is append-only (no UPDATE/DELETE grants at the DB role level) to preserve medico-legal integrity of sign-offs.
- QR Health Passport tokens are short-lived, single-purpose JWTs scoped to read-only, expiring in minutes.
- All PHI-bearing tables should have row-level access checks (a doctor only queries patients within their queue/hospital; a patient can only ever query their own `patient_id`).
- This system should be designed to align with local health-data regulations (e.g., India's DPDP Act / ABDM standards if targeting Indian hospitals) — plan for ABDM/FHIR interoperability in a later phase if integrating with India's Ayushman Bharat Digital Mission.

## 8. Scaling Considerations (Post-MVP)

- Move AI inference workers to a dedicated GPU pool (or hosted inference endpoints) as load grows, decoupled from the FastAPI web tier.
- Introduce a read-replica for PostgreSQL as patient/prescription volume grows.
- Multi-tenancy: add a `hospital_id` scoping column to every table from day one so the platform can serve multiple hospitals/clinics without a schema rewrite.
