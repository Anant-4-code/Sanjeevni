# Sanjeevani — Project Scaffold

> 📌 **Note:** For full project progress, AI OCR engine details, Universal Document Hub specs, and setup instructions, see the main [Project README](../README.md).

This is a working starting point generated from `01_PRD.md` → `05_DESIGN_SYSTEM.md`, using:
- **Backend:** Python + FastAPI, **Supabase** (Postgres + Auth + Storage) instead of self-hosted Postgres
- **Frontend:** React + Vite + TailwindCSS (staff portals), Next.js PWA (patient portal)
- **X-ray AI:** your uploaded `yolov7-p6-bonefracture.onnx` model (GRAZPEDWRI-DX), wired into `backend/app/ai/xray/inference.py`

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `supabase/schema.sql` — this creates every table, enum, index, and RLS policy described in `03_DATABASE_SCHEMA.md`.
3. In **Storage**, create a private bucket named `scans`.
4. In **Authentication**, enable Phone (OTP) sign-in for patients and Email/Password for staff.
5. Copy your Project URL, `anon` key, and `service_role` key into `backend/.env` (copy from `backend/.env.example`).

## 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase keys
```

**Add the X-ray model weight** (not included in this scaffold due to size — ~140MB):
```bash
mkdir -p app/ai/xray/model
cp /path/to/yolov7-p6-bonefracture.onnx app/ai/xray/model/
```

Run it:
```bash
uvicorn app.main:app --reload --port 8000
```

## 3. Frontend

Each portal is an independent app so hospital staff only load what their role needs.

```bash
cd frontend
npm install   # installs all workspaces (reception, doctor, pharmacy, lab, patient, ui)

# run any portal individually, e.g.:
npm run dev --workspace=@sanjeevani/reception   # http://localhost:5173
npm run dev --workspace=@sanjeevani/doctor       # http://localhost:5174 (change port in vite.config.ts)
npm run dev --workspace=@sanjeevani/patient       # http://localhost:3000 (Next.js PWA)
```

Each Vite app reads `VITE_API_BASE` (defaults to `http://localhost:8000/api`); the patient app reads `NEXT_PUBLIC_API_BASE`.

## 4. What's real vs. stubbed in this scaffold

| Feature | Status |
|---|---|
| Patient registration + triage keyword classifier | ✅ working (Supabase-backed) |
| Patient search | ✅ working |
| Scan upload → Supabase Storage | ✅ working |
| X-ray fracture detection (YOLOv7-p6 ONNX) | ✅ working — needs the model file added locally |
| X-ray Canvas overlay (frontend) | ✅ working — renders whatever detections are in `scans.xray_analysis_json` |
| Pharmacological guardrail check | ✅ working, but uses a **naive tag-overlap check** — replace `interaction_tags` matching with a real drug-interaction database/API before production use |
| Prescription sign-off + immutable verification log | ✅ working |
| OCR (handwriting → structured text via YOLO + TrOCR) | 🚧 stub — pipeline described in `02_ARCHITECTURE.md`, not yet implemented in code |
| Ambient voice documentation (Whisper + SOAP LLM) | 🚧 stub |
| Sanjivini RAG Copilot | 🚧 stub — has the "do not diagnose" guardrail keyword-block wired, but no real ChromaDB/LLM retrieval yet |
| Pharmacy dispensing queue, lab Kanban | 🚧 UI built, backend endpoints are stubs — need Supabase queries wired like `doctor.py` |
| Realtime (WebSocket/SSE) | 🚧 not implemented — frontends currently poll on load; see `02_ARCHITECTURE.md` §5 for the intended design |
| Voice-booking agent, ICD-10 auto-coding, predictive inventory, pill CV verification | 🚧 not started (Phase 3 in the PRD) |

## 5. Suggested next steps
1. Wire up the OCR pipeline (YOLO region detection + TrOCR transcription) the same way `xray/inference.py` wires the fracture model.
2. Add a Celery + Redis worker for async jobs (OCR, Whisper, forecasting) so uploads return instantly and results stream back via WebSocket.
3. Replace the naive guardrail tag-matching with a real interaction dataset (or an API like openFDA).
4. Build out Supabase Auth flows in each frontend (currently using hardcoded `demo-doctor` / `demo-patient` IDs as placeholders).
5. Stand up ChromaDB + a local LLM (Ollama/BioMistral) for the Sanjivini Copilot's real RAG pipeline.
