UPDATE 1

# Universal Medical Document & Report Hub (`/scan-otc`)
### Deep-Dive: How It Works, What It Depends On, What It Feeds, and How to Make It Better

Scope: this document covers **PT-7** (Section 9.3 of the Patient spec) — the camera/upload → OCR → AI analysis → Vault pipeline. It traces the feature end-to-end against the actual scaffold code (`copilot.py`, `patient_service.py`, `scan-otc/page.tsx`), not just the spec.

---

## 1. What This Feature Actually Is

Despite the route being named `/scan-otc`, this is **not** the OTC drug-interaction scanner (that's a separate endpoint, `/api/copilot/otc-scan`, used for checking a new packaged medicine against active prescriptions). This route is the **general-purpose medical document intake system** — the single front door for every piece of paper or PDF a patient owns:

| Category key | What goes here |
|---|---|
| `prescriptions` | Doctor-written scripts (handwritten or printed) |
| `lab_reports` | CBC, metabolic panel, lipid profile, thyroid, etc. |
| `imaging_scans` | X-Ray, MRI, CT, Ultrasound reports |
| `discharge_summaries` | Hospital inpatient discharge notes |
| `vaccinations` | Immunization certificates / immunity charts |

Every category shares one pipeline shape, but branches into category-specific prompts and category-specific output schemas. This is the most important architectural fact about the feature — **one funnel, five destinations.**

---

## 2. End-to-End Flow (as implemented)

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND — /scan-otc  (scan-otc/page.tsx)                            │
│                                                                         │
│  1. Patient picks a category (Prescriptions / Lab / Imaging /          │
│     Discharge / Vaccination)                                           │
│  2. Patient either:                                                    │
│       a) Uploads a file (PNG/JPG/WEBP/PDF) via dropzone, OR             │
│       b) Uses live camera → captures a canvas snapshot → JPEG          │
│  3. Preview shown before submit                                        │
│  4. POST multipart/form-data → /api/copilot/analyze-document           │
│       fields: image (file), category (string), patient_id (string)     │
└───────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND — POST /analyze-document  (copilot.py L948)                  │
│                                                                         │
│  → calls analyze_medical_document_by_category(image_bytes, category)  │
└───────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 1 — Local OCR  (run_ocr_on_bytes, copilot.py L426)              │
│                                                                         │
│  • PIL/OpenCV preprocessing: grayscale conversion, 2.0x contrast       │
│  • Pytesseract, LSTM engine (--oem 1 --psm 6)                          │
│  • Output: raw_ocr_text (unstructured string)                          │
│  • NOTE: prescriptions category skips this generic path and routes    │
│    to extract_prescription_from_image() instead (see §3)              │
└───────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 2 — Category-Specific Prompt Construction                      │
│                                                                         │
│  raw_ocr_text is embedded into ONE of 5 hardcoded prompt templates,    │
│  each demanding a strict JSON schema back:                             │
│                                                                         │
│  lab_reports        → {title, facility_or_lab, date, summary,          │
│                         recommendations, biomarkers[], patient_notes}  │
│  imaging_scans      → {title, facility_or_lab, date, modality,         │
│                         summary, recommendations, findings[],          │
│                         patient_notes}                                 │
│  discharge_summaries→ {title, facility_or_lab, doctor_name, date,      │
│                         summary, recommendations, medicines[],         │
│                         patient_notes}                                 │
│  vaccinations       → {title, facility_or_lab, date, summary,          │
│                         vaccines[], patient_notes}                     │
│  (other/fallback)   → {title, facility_or_lab, summary,                │
│                         recommendations, patient_notes}                │
└───────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3 — Dual-LLM Extraction (waterfall, NOT parallel)               │
│                                                                         │
│  1st try → NVIDIA NIM  (meta/llama-3.1-70b-instruct)   timeout 6s      │
│  2nd try → OpenRouter  (google/gemma-4-31b-it:free)    timeout 6s      │
│  3rd     → Hardcoded static fallback JSON (see §5 — RISK)              │
│                                                                         │
│  Both providers: strip ```json fences → json.loads() → return dict     │
│  If key missing / request fails / non-dict parse → falls to next tier  │
└───────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RESPONSE → Frontend renders "AI Result Cards":                        │
│    • Executive summary                                                 │
│    • Biomarker table (lab_reports only)                                │
│    • Radiology findings table (imaging_scans only)                     │
│    • Recommendations / next steps                                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                  │  patient reviews, then taps
                                  │  "Save to Vault"
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST /save-document-to-vault  (copilot.py L963)                       │
│    → patient_service.add_analyzed_document_to_vault(...)               │
│    → category mapped: lab_reports→lab-reports,                        │
│                        imaging_scans→x-rays,                           │
│                        discharge_summaries→other, etc.                 │
│    → stored in in-memory vault_documents list (see §5 — RISK)          │
│    → redirect to /vault                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. The One Category That Breaks the Pattern: `prescriptions`

`analyze_medical_document_by_category()` special-cases `prescriptions` and hands off entirely to a **different, older, more elaborate pipeline** (`extract_prescription_from_image`, L225 + `parse_prescription_text_rules`, L596):

- Adds a **Pen-to-Print RapidAPI** fallback specifically for handwritten scripts (the generic path has no equivalent)
- Runs a **rules-based multi-drug parser** tuned to real handwritten formats (e.g. `1-0-1`, `BD`, `Night`) rather than trusting the LLM's free-form JSON alone
- Explicitly filters out clinic addresses, registration numbers, degrees, and diagnosis terms (LBA, radiculopathy, etc.), routing them to a separate "notes" field instead of polluting the medicine list

**Why this matters for your roadmap:** the prescription path is meaningfully more mature/defensive than the other four categories. Any enhancement work on lab/imaging/discharge/vaccination should borrow from the prescription path's pattern (rules-based sanity-checking on top of LLM output) rather than trusting the LLM waterfall alone — see §6.

---

## 4. Dependency Map — What This Feature Needs, and What Needs It

### 4.1 Upstream dependencies (what this feature *consumes*)

| Depends on | Why |
|---|---|
| **Camera/File API (browser)** | Live scanner and dropzone both need `getUserMedia` + `<canvas>` capture; SSR hydration guard (`isMounted`) exists because `<video>` can't render server-side |
| **OCR runtime (Tesseract + PIL/OpenCV)** | Must be installed in the FastAPI container; if missing, `run_ocr_on_bytes` fails and every category downstream gets an empty `raw_ocr_text` |
| **NVIDIA_API_KEY / OPENROUTER_API_KEY (env)** | Both are optional per `os.getenv(..., "")`, but if *both* are unset, every single document — regardless of category — silently returns the **static hardcoded fallback JSON**, not an error. This is currently invisible to the patient. |
| **`patient_service.add_analyzed_document_to_vault`** | The only write path into the Vault for this feature |
| **`patient_id`** | Passed as a plain form field with `default="demo-patient"` — **there is no auth-derived patient identity check on this endpoint today** (see §5) |

### 4.2 Downstream consumers (what *depends on* this feature)

```
                    ┌───────────────────────────────────┐
                    │   /scan-otc Document Hub            │
                    │   (this feature)                    │
                    └───────────────┬─────────────────────┘
                                     │ writes analyzed docs
                                     ▼
        ┌────────────────────────────────────────────────────┐
        │              Digital Records Vault (/vault)          │
        │  • Category tiles (Prescriptions/Lab/X-Ray/Other)    │
        │  • Search, verified/unverified badges                │
        │  • Prescription Detail view (expandable drug cards)  │
        └───────┬──────────────────┬────────────────┬─────────┘
                │                  │                │
                ▼                  ▼                ▼
   ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
   │ Doctor Sign-Off   │  │ Sanjivini Copilot │  │ Activity Logs (/logs)│
   │ (prescriptions    │  │  pulls "Archived  │  │ DOCUMENT_SAVED event │
   │  only — needs      │  │  Vault records as │  │ fired on every save  │
   │  verification      │  │  additional        │  │                       │
   │  before dosing     │  │  context" per      │  │                       │
   │  timeline uses it) │  │  §9.5              │  │                       │
   └─────────────────┘  └──────────────────┘  └──────────────────────┘
                │
                ▼
   ┌───────────────────────────────────┐
   │ Dashboard Dosing Timeline           │
   │ (only reads VERIFIED prescriptions  │
   │  — a scanned Rx sits "unverified"   │
   │  in Vault until a doctor signs off, │
   │  it does NOT appear on the daily    │
   │  schedule automatically)            │
   └───────────────────────────────────┘
```

**The critical chain to understand:** scanning a prescription here does **not** put it on the patient's daily dosing timeline. It lands in the Vault as `unverified`. Only `patient_service.verify_prescription()` (triggered elsewhere — currently a "Simulate Doctor Sign-Off" button per §9.4) flips it to a state the Dashboard will show. This is correct clinical design (a patient shouldn't self-prescribe by uploading a photo) but it means **the feature's real value is Vault archival + AI explanation, not schedule population**, and any new copy/messaging you add should be honest about that distinction so patients don't expect a scanned Rx to trigger reminders immediately.

### 4.3 Sibling feature it is often confused with

| | `/scan-otc` (this doc) | OTC Safety Scanner (`otc_scan`, L730) |
|---|---|---|
| Purpose | Archive & explain *existing* medical records | Check a *new* packaged medicine for interactions |
| Input | 5 document categories | A single OTC drug label photo |
| Output | Structured report summary → Vault | SAFE / WARNING verdict against active prescriptions |
| Route | `/analyze-document` | `/otc-scan` |
| Feeds | Vault, Copilot context, Logs | Nothing persistent — a one-shot safety check |

Worth renaming the frontend route away from `/scan-otc` at some point — the name collision with the actual OTC scanner is a genuine source of confusion for anyone reading the codebase (including future-you).

---

## 5. Current Risks / Gaps Worth Knowing Before You Build On Top

1. **Silent fallback data.** If both LLM API keys are missing or both calls fail, the patient receives a **fabricated-looking but fake** result (hardcoded "Hemoglobin 13.5 g/dL, Normal" for every lab report with no real data behind it). Nothing in the response tells the frontend this happened. This is the single highest-priority fix — a patient could genuinely believe a canned "normal" reading is their own result.
2. **No patient identity verification on `/analyze-document`.** `patient_id` is a trusted form field with a `"demo-patient"` default — anyone who can call the endpoint can attach a scan to any patient_id.
3. **In-memory storage only.** `PatientService.__init__` initializes `self.vault_documents` as a plain Python list — this resets on every server restart and isn't shared across workers. Fine for a scaffold/demo, not for anything beyond that.
4. **6-second timeouts on both LLM calls** — for a 70B/31B model doing OCR-text reasoning, this is tight; slow responses will be indistinguishable from failures and silently degrade to the fake fallback (compounding risk #1).
5. **No confidence signal surfaced to the patient** at any stage — OCR confidence, LLM parse success/failure, and "we used the fallback" are all invisible in the current response shape.

---

## 6. Recommended Enhancements — What Goes Where

### 6.1 Fixes to the existing pipeline (do these first — they de-risk everything else)

| Add | Where | Why |
|---|---|---|
| `"source": "ai_llm" \| "fallback_static" \| "ocr_only"` field in every response | `analyze_medical_document_by_category` return dict | Lets the frontend show "⚠️ Could not fully analyze — showing partial results" instead of presenting fake data as real |
| Real `patient_id` from session/auth, not a form field | `/analyze-document`, `/save-document-to-vault` | Closes the impersonation gap |
| Persist `vault_documents` to Supabase Postgres | `patient_service.py` | Survives restarts, enables RLS scoping described in the Patient spec §4 |
| OCR confidence score passed through (`pytesseract.image_to_data` gives per-word confidence) | `run_ocr_on_bytes` | Foundation for the "verify this value" UI flagging discussed below |

### 6.2 New capability: Extraction Confidence Flagging
- **Where:** Stage 1 (OCR) + Stage 3 (LLM) response, surfaced in the "AI Result Cards" on the frontend.
- **What:** any biomarker/finding/medicine field extracted from a low-confidence OCR region gets a small "⚠️ verify" badge next to it in the table.
- **Connects to:** directly protects the Digital Vault and, transitively, the Dashboard (since a mis-read dosage that later gets doctor-verified would otherwise propagate silently into the daily schedule).

### 6.3 New capability: `explain_this_report` prompt (already tracked as §8.6 in the roadmap)
- **Where:** same function, `analyze_medical_document_by_category` — this is purely a prompt-template addition per category, no new infra, since the JSON-schema-and-waterfall machinery already exists.
- **Connects to:** none of the plumbing changes; only the prompt text changes. Lowest-effort, highest-ratio enhancement available in this whole feature.

### 6.4 New capability: Multi-page capture
- **Where:** frontend `scan-otc/page.tsx` — allow multiple captures/uploads to queue before a single submit; backend `analyze-document` needs to accept `images: list[UploadFile]` instead of one `image`.
- **Connects to:** `run_ocr_on_bytes` would need to run once per page and concatenate `raw_ocr_text` before the single LLM call — keeps Stage 2/3 unchanged.

### 6.5 New capability: Lab trend detection
- **Where:** new logic in `analyze_medical_document_by_category` for `lab_reports` — before building the prompt, query `patient_service.get_vault(patient_id, category="lab-reports")` for the most recent prior lab doc and inject its `biomarkers` into the prompt as comparison context.
- **Connects to:**
  - **Vault** (read, not just write, for the first time in this pipeline)
  - **Visit Prep Assistant (§8.8, planned)** — a biomarker that moved sharply between two reports is exactly the kind of thing that belongs in a "things to mention to your doctor" card
- **Output schema change:** add optional `"trend"` array to the lab_reports JSON schema: `[{"parameter": "Hemoglobin", "previous": "13.2", "current": "11.8", "change_pct": -10.6, "direction": "down"}]`

### 6.6 New capability: Critical value escalation
- **Where:** post-processing step after Stage 3 succeeds, before the response is returned — check `biomarkers[].status` / `findings[]` against a small hardcoded list of critical-value thresholds (e.g., `status == "critical"` or a keyword match like "urgent," "immediate attention").
- **Connects to:**
  - Frontend: renders a persistent red banner instead of the normal card treatment
  - **Sanjivini Copilot's no-diagnose guardrail pattern** — reuse the same "always give a concrete next action" tone (contact doctor / ER) rather than inventing new UI language
  - Optionally, **Activity Logs** — a `CRITICAL_VALUE_FLAGGED` event type so this is auditable

### 6.7 New capability: "Flag for my doctor" annotation
- **Where:** a small action on each row of the Biomarker/Findings table in the frontend result card; backend needs a new lightweight table, e.g.:
  ```sql
  CREATE TABLE flagged_report_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   TEXT NOT NULL,
    document_id  TEXT NOT NULL,   -- vault doc id
    item_label   TEXT NOT NULL,   -- e.g. "Hemoglobin"
    flagged_at   TIMESTAMPTZ DEFAULT now()
  );
  ```
- **Connects to:** **Visit Prep Assistant (§8.8)** — this is literally one of the data sources that section's spec already calls for (`copilot_refused_queries` is the sibling table for chat; this would be the sibling table for document findings).

---

## 7. Summary Table — Feature Interconnection at a Glance

| This feature... | Reads from | Writes to | Read by |
|---|---|---|---|
| `/analyze-document` | Uploaded image bytes only (stateless) | Nothing persistent (response only) | Frontend result cards |
| `/save-document-to-vault` | — | `patient_service.vault_documents` | Vault UI, Copilot context injection, Activity Logs |
| Vault entry (`category=prescriptions`) | — | — | Doctor Sign-Off flow → Dosing Timeline (only after verification) |
| Vault entry (`category=lab-reports`, `x-rays`, `other`) | — | — | Vault UI only, today. **Should also feed:** Visit Prep Assistant, trend detection (§6.5) |

---

## 8. Suggested Build Order

1. **§6.1 risk fixes** (source flag, real patient_id, persistence) — everything else compounds on top of shaky ground otherwise
2. **§6.3 Explain This Report** — near-zero effort, already scoped in your roadmap as §8.6
3. **§6.2 Confidence flagging** — cheap once OCR confidence is plumbed through, high trust payoff
4. **§6.5 Lab trend detection** — meaningful clinical value, needs the persistence fix from step 1 first
5. **§6.6 Critical value escalation** — safety-relevant, should happen before wide patient rollout
6. **§6.4 Multi-page capture** and **§6.7 Flag for doctor** — quality-of-life and roadmap-linking work, can trail the above



UPdate 2

# Digital Records Vault & Sanjivini AI Copilot
### Deep-Dive: How It Works, What It Depends On, What It Feeds, and How to Make It Better

Scope: covers **9.4 Digital Records Vault** (`/vault`, `/vault/[category]`, `/vault/prescription/[id]`) and **9.5 Sanjivini AI Copilot** (`/copilot`), traced against the real scaffold code — `copilot.py`, `patient_service.py` — not just the spec. These two features are documented together because the Copilot's single most important capability (clinical context) is entirely dependent on the Vault, and can't be understood in isolation from it.

---

## PART A — Digital Records Vault

### A.1 What It Actually Is

The Vault is the **single source of truth store** for every medical document a patient owns — both AI-analyzed uploads (from the Document Hub, see companion doc) and directly-created digital prescriptions. It is not a separate database table; in the current scaffold it's one in-memory Python list, `PatientService.vault_documents`, that every other write path (scan, digital-prescription-creation, doctor-verification) appends to and every read path (Vault UI, Copilot context, Dashboard timeline) reads from.

### A.2 How Documents Enter the Vault (3 distinct write paths)

```
┌────────────────────────────────────────────────────────────────────┐
│ PATH 1 — AI Document Analysis → Save to Vault                        │
│   /scan-otc → /analyze-document → patient reviews → taps "Save"      │
│   → POST /save-document-to-vault                                     │
│   → patient_service.add_analyzed_document_to_vault()                 │
│   → status: "verified" (always — see Risk A.5-1)                     │
│   → category auto-mapped: lab_reports→lab-reports,                   │
│       imaging_scans→x-rays, discharge_summaries/vaccinations→other   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ PATH 2 — Manual "Create Digital Prescription"                        │
│   Patient/reception fills the modal shown in your screenshot         │
│   → patient_service.create_digital_prescription()                    │
│   → status: "verified" immediately                                   │
│   → ALSO writes directly into schedule_items                         │
│     (i.e. this path bypasses doctor sign-off entirely —              │
│      see Risk A.5-2, this is the most safety-relevant gap in Vault)  │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ PATH 3 — Raw Scan Upload (Reception/Intake flow)                     │
│   patient_service.add_scan_to_vault()                                │
│   → status: "unverified"                                             │
│   → medicines list is HARDCODED to a single demo entry               │
│     ("Pan 40mg") regardless of what was actually uploaded            │
│     — this path currently does no real extraction at all             │
│      (see Risk A.5-3)                                                │
└────────────────────────────────────────────────────────────────────┘
```

### A.3 Verification State Machine

This is the core safety mechanic of the whole Vault, and it's worth being explicit about because it's easy to lose track of across three write paths:

```
   unverified  ──[doctor verifies via patient_service.verify_prescription()]──▶  verified
       │                                                                             │
       │  shows "Simulate Doctor Sign-Off" button in UI,                            │
       │  patient sees "Unverified — needs doctor review" banner                    │
       │                                                                             ▼
       │                                                          medicines[] copied into
       │                                                          schedule_items → NOW appears
       │                                                          on Dashboard Dosing Timeline
       └── NOT on Dosing Timeline, NOT counted in adherence score
```

**Important inconsistency to know about:** Path 1 (AI analysis) and Path 2 (manual digital prescription) both set `status: "verified"` **immediately on creation**, skipping the unverified state entirely. Only Path 3 (raw scan) actually uses the unverified→verified flow. This means two of your three intake paths currently bypass doctor review by construction — worth deciding if that's intentional (e.g. "digital prescription" is meant to be self-authored) or a gap to close.

### A.4 Dependency Map

**Vault reads from:**
| Source | What |
|---|---|
| `add_analyzed_document_to_vault` | AI Document Hub output (biomarkers, findings, medicines, vaccines, summary) |
| `create_digital_prescription` | Manually entered medicine list from the modal |
| `add_scan_to_vault` | Filename + doctor name only — no real document content |
| `verify_prescription` | Doctor-role action (currently simulated client-side) |

**Vault is read by:**
```
                    ┌─────────────────────┐
                    │   Vault Documents     │
                    │  (vault_documents[])  │
                    └──────────┬───────────┘
             ┌──────────────────┼──────────────────────┐
             ▼                  ▼                       ▼
   ┌──────────────────┐ ┌─────────────────┐  ┌────────────────────────┐
   │ Vault UI            │ │ Sanjivini Copilot │  │ Dashboard Dosing Timeline│
   │ (/vault,             │ │ (query_copilot_llm │  │ — ONLY via schedule_items,│
   │  /vault/[category],  │ │  injects EVERY     │  │   which is only populated │
   │  /vault/prescription/│ │  vault doc's title, │  │   by verify_prescription()│
   │  [id])               │ │  category, doctor,  │  │   or create_digital_       │
   │                       │ │  summary, and notes │  │   prescription() —         │
   │                       │ │  as context, every   │  │   NOT by simply being in   │
   │                       │ │  single turn — see    │  │   the Vault                │
   │                       │ │  Part B.2)            │  │                             │
   └──────────────────┘ └─────────────────┘  └────────────────────────┘
```

**The one-sentence rule to remember:** *being in the Vault* and *being on the Dosing Timeline* are two different things. A document can sit in the Vault forever, fully visible to the Copilot and to the patient, without ever generating a single dose reminder — only `schedule_items` drives the Dashboard.

### A.5 Risks Found in the Vault Code

1. **Paths 1 & 2 auto-set `status: "verified"`** with no actual clinician involved — the "Clinically Verified & Signed Off" badge your screenshot showed is applied automatically by the AI pipeline finishing, not by a doctor. This directly contradicts the spec's own stated principle (§1.5: "Patient can never edit a medication... without clinical review").
2. **`create_digital_prescription` writes straight into `schedule_items`**, meaning the modal in your screenshot ("Archived in Vault & activated in Daily Timeline") is *accurate* — it really does activate dosing reminders instantly, patient-authored, no doctor in the loop at all.
3. **`add_scan_to_vault` never processes the uploaded file** — "Pan 40mg" is a hardcoded placeholder returned for every single raw scan upload, regardless of content. If this path is still live anywhere in the current UI, it is actively lying to patients about what was extracted.
4. **Every fallback `file_url` is the same hardcoded Unsplash link** across three different functions (`add_scan_to_vault`, `create_digital_prescription`, `add_analyzed_document_to_vault`) — this is exactly the bug from your last screenshot (stock pill-blister photo instead of the real scan). Same root cause, three call sites.
5. **In-memory storage** — same caveat as the Document Hub: `vault_documents` is a plain list, resets on restart, not scoped by real auth.

---

## PART B — Sanjivini AI Copilot

### B.1 What It Actually Is

A multi-turn chat interface backed by a 3-tier LLM waterfall (local Ollama → OpenRouter → NVIDIA NIM → hardcoded text fallback), with a **keyword-based guardrail that runs before any LLM call at all**.

### B.2 How Context Injection Actually Works (this is the core mechanic)

```
Patient sends a question
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ ask_copilot() — copilot.py L170                                 │
│                                                                   │
│  1. Log the question (COPILOT_QUESTION event)                    │
│  2. Check DIAGNOSTIC_TRIGGERS keyword list:                      │
│     ["what should i take", "is it", "diagnose",                  │
│      "what's wrong with me", "chest pain"]                       │
│     → if matched: return canned refusal, STOP. No LLM call.      │
│  3. Otherwise → query_copilot_llm()                               │
└───────────────────────────────┬─────────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ query_copilot_llm() — copilot.py L30                              │
│                                                                    │
│  • Pulls patient's FULL schedule (get_timeline)                   │
│  • Pulls patient's FULL vault (get_vault, ALL categories,          │
│    not just prescriptions — labs, imaging, discharge notes         │
│    all get flattened into the system prompt too)                   │
│  • Builds one big system_prompt string containing:                 │
│      - every active medicine + condition tag                       │
│      - every vault doc's title/category/doctor/summary/notes       │
│  • Appends last 8 turns of conversation history                    │
│  • Sends to Ollama (local) first, then OpenRouter, then NVIDIA     │
│  • If ALL fail → static keyword-matched text fallback              │
│    ("tumor" → canned definition, "medical history" → vault dump)   │
└───────────────────────────────────────────────────────────────┘
```

### B.3 Dependency Map

**Copilot depends on:**
| Dependency | Role |
|---|---|
| `patient_service.get_timeline()` | Active medicines injected as context every turn |
| `patient_service.get_vault()` | **Every** vault document, every category, injected every turn — this is the entire "clinical context" claim in §9.5 |
| Local Ollama server (`localhost:11434`) | First-choice LLM, silently skipped if not running |
| `OPENROUTER_API_KEY` / `NVIDIA_API_KEY` | Optional fallbacks, same waterfall pattern as the Document Hub |
| `DIAGNOSTIC_TRIGGERS` hardcoded list | The entirety of the "no-diagnose guardrail" — see Risk B.5-1 |

**Copilot is depended on by:**
- **Activity Logs** — every question is logged as `COPILOT_QUESTION`, visible in `/logs`
- **§8.8 Visit Prep Assistant (planned)** — needs a `copilot_refused_queries` log that does **not currently exist**; right now a guardrail trigger returns `guardrail_triggered: True` in the API response but is never persisted anywhere, so there is no way today to build "you asked about chest pain 3 times this week" — the data simply isn't being kept.

### B.4 Risks Found in the Copilot Code

1. **The guardrail is a 5-phrase keyword list**, not semantic detection. `"is it"` is broad enough to false-positive on completely benign questions ("is it okay to take this with food?"), while a patient rephrasing an emergency ("my chest feels tight and heavy") sails straight past it into the LLM, which has an explicit system-prompt instruction to **never refuse** ("Do not issue generic refusals like 'I cannot provide medical advice'"). Combined, these two facts mean the guardrail is both over-broad on trivial questions and under-broad on real emergencies phrased differently than the exact trigger phrases.
2. **The system prompt actively discourages caution.** The line `"ALWAYS answer the user's question directly... Do not issue generic refusals"` is in direct tension with the Patient spec's own non-goal ("Copilot can never diagnose a new symptom or suggest a new drug," §1.5). As written, the LLM is instructed to be maximally helpful/direct, with no no-diagnose framing anywhere in the system prompt itself — the *only* safety net is the 5-keyword pre-filter.
3. **Guardrail refusals aren't logged**, so §8.8 Visit Prep Assistant cannot be built on top of this without adding the missing table/write first (matches what the spec itself flags as 📋 Planned).
4. **Full vault dump on every turn, unbounded** — every lab result, every scan finding, every discharge note gets flattened into the prompt on every single message, with no relevance filtering or size cap. For a patient with a long history this will eventually blow past context limits or bury the actually-relevant document in noise.

---

## C — How Vault and Copilot Connect (the relationship in one diagram)

```
                    ┌─────────────────────────────┐
                    │   Digital Records Vault        │
                    │   (all 3 intake paths)          │
                    └───────────────┬─────────────────┘
                                     │  EVERY document, every turn,
                                     │  no filtering, no relevance ranking
                                     ▼
                    ┌─────────────────────────────┐
                    │   Sanjivini Copilot             │
                    │   system prompt injection        │
                    └───────────────┬─────────────────┘
                                     │  guardrail_triggered flag returned
                                     │  but NEVER persisted
                                     ▼
                    ┌─────────────────────────────┐
                    │   (missing) copilot_refused_    │
                    │   queries table                  │
                    └───────────────┬─────────────────┘
                                     │  would feed →
                                     ▼
                    ┌─────────────────────────────┐
                    │   Visit Prep Assistant (§8.8,   │
                    │   planned, not yet buildable)   │
                    └─────────────────────────────┘
```

The practical takeaway: **Copilot quality is a direct function of Vault data quality.** Every Vault bug documented in Part A (fake "Pan 40mg" placeholder medicines, garbled OCR notes, wrong file URLs) doesn't just corrupt the Vault UI — it's silently fed into the Copilot's system prompt as if it were real clinical fact, and the patient has no way to tell which parts of a Copilot answer trace back to a genuinely-extracted document versus a hardcoded placeholder. Fixing the Document Hub extraction bugs (see companion doc) is therefore also a Copilot fix, not just a Vault fix.

---

## D — Recommended Enhancements

### D.1 Vault enhancements

| Add | Where | Connects to |
|---|---|---|
| **Real doctor-side verification workflow** instead of client-side "Simulate Doctor Sign-Off" | `verify_prescription()` needs to be called from an authenticated doctor session, not a patient-facing button | Closes Risk A.5-1/2; makes the "verified" badge trustworthy |
| **Document versioning** — if a patient re-uploads a corrected/clearer photo of the same report, link it to the original instead of creating a duplicate Vault entry | `add_analyzed_document_to_vault` — add a `supersedes_doc_id` field | Prevents Vault clutter, keeps Copilot context from citing stale duplicate data |
| **Per-document "extraction quality" badge** (High/Partial/Failed) shown in the Vault list and detail view | Surface the `source` field recommended in the Document Hub deep-dive | Lets a patient (and the Copilot) know which documents to trust |
| **Real per-file storage** replacing the shared Unsplash fallback | All three write paths in `patient_service.py` | Fixes the exact bug from your screenshot |
| **Vault search/filter by doctor or date range**, not just title/summary text (extends the existing search) | Vault Category Archive Page | Useful once a patient has 20+ documents across years |

### D.2 Copilot enhancements

| Add | Where | Connects to |
|---|---|---|
| **Real no-diagnose system prompt instruction**, replacing/supplementing the current "always answer directly" line, so the guardrail isn't the *only* line of defense | `system_prompt` construction in `query_copilot_llm` | Closes Risk B.5-2, aligns actual behavior with the spec's own stated non-goal |
| **Log every guardrail trigger** to a real table (this is exactly §8.8's prerequisite) | `ask_copilot()` — add a write before returning the canned refusal | Unblocks Visit Prep Assistant, which is otherwise unbuildable as scoped |
| **Relevance-ranked context injection** instead of dumping the entire vault every turn — e.g. only include vault docs whose category/keywords match the current question, plus always include active prescriptions | `query_copilot_llm` | Fixes Risk B.4-4, also reduces cost/latency on every LLM call |
| **Source attribution in Copilot answers** — when the answer references a specific vault document, name it explicitly ("Based on your Aug 8 CBC report...") so the patient can trace the claim back to a document they can verify | Prompt engineering + lightweight post-processing | Builds patient trust, gives the "flag for my doctor" feature (from the Document Hub doc) a natural anchor point |
| **"I don't have enough information" as a valid, non-alarming answer type**, distinct from both a normal answer and a guardrail refusal — for when the vault genuinely has nothing relevant | New response category in `query_copilot_llm`'s static fallback logic | Prevents the LLM from fabricating plausible-sounding answers when context is empty |
| **Copilot-to-Vault deep link** — if the Copilot references a specific document in its answer, render a tappable chip that opens that Vault entry directly | Frontend `/copilot` chat UI | Turns the chat from a dead-end into a navigation aid across the two features |

### D.3 Suggested Build Order

1. **Fix the shared `file_url` fallback bug** (D.1, closes your reported screenshot issue) — cheapest, highest-visibility fix
2. **Stop auto-verifying Paths 1 & 2** in the Vault, or explicitly relabel them as "patient-entered, not doctor-verified" if instant activation is intentional — this is a clinical-safety-adjacent decision, not just a code fix, so it's worth deciding deliberately rather than leaving as-is
3. **Add the real no-diagnose system prompt language** — cheap, directly closes a real safety gap
4. **Log guardrail refusals** — small schema addition, unlocks §8.8 for later
5. **Relevance-ranked context injection** — moderate effort, meaningfully improves both answer quality and cost
6. **Extraction quality badges + source attribution** — polish layer once the above are solid
# Planned Add-On Features — Deep Dive
### How It Works · What It Depends On · What It Feeds · How to Make It Better

Scope: this covers the **Planned** features from the roadmap — Refill Intelligence, Symptom Journal, Caregiver Access, Missed-Dose Escalation, Allergy Profile, Explain This Report, Cost Awareness, and Visit Prep Assistant. None of these exist in code yet, so instead of tracing real functions, this specs out exactly how each *should* work against your existing architecture (`patient_service.py`, `copilot.py`, the Vault, the Timeline), so building them slots cleanly into what's already there instead of becoming a bolt-on.

---

## 1. Refill & Running-Out Intelligence

### How It Works
Every prescription item already stores (or should store) a start date and a duration. This feature is pure derived intelligence — no new AI, no new document type, just a countdown computed from data you already have.

```
schedule_items entry: { medicine, duration_days, start_date, ... }
        |
        v
Daily backend job (or on-demand calc when Dashboard loads):
  days_remaining = duration_days - (today - start_date)
        |
        |-- days_remaining <= 5  -> show amber banner
        |-- days_remaining <= 2  -> show red banner
        `-- days_remaining <= 0  -> course complete, archive banner
        |
        v
Patient taps "Request Refill" -> POST /api/patient/refill-request
        -> new refill_requests row (status: pending)
        -> appears in Doctor/Reception queue
        -> patient sees confirmation text, not a silent no-op
```

### What It Depends On
| Dependency | Why |
|---|---|
| **`schedule_items`** (populated by `verify_prescription` / `create_digital_prescription`) | Needs `start_date` + `duration_days` fields — check whether these currently exist on schedule items; if not, this is the first thing to add |
| **Dashboard** | Banner needs to render above the Dosing Timeline |
| **A new `refill_requests` table** | Doesn't exist yet — this is the one new piece of state this feature needs |

### What It Feeds
- **Pharmacy queue** — a refill request should land in the same place a fresh prescription would, so Pharmacy doesn't need a separate workflow
- **Visit Prep Assistant (§8)** — "medicine ending soon" is one of its explicit input sources
- **Notifications** — push notification 5 days before course end reuses the existing WhatsApp/SMS delivery path already built for dose reminders

### How to Make It Better
- **Weekend/holiday-aware nudging** is already spec'd (trigger 1 day earlier if a weekend falls in the window) — worth also checking against clinic operating hours, not just calendar weekends, since a refill request sent Friday night to a clinic closed all weekend is functionally the same problem.
- **Auto-suggest quantity** based on remaining course length + standard pack sizes (e.g. "you need 6 more tablets, standard strip is 10") so the refill request itself is actionable for Pharmacy without back-and-forth.
- **Distinguish "chronic/recurring" from "short-course" prescriptions** — a diabetes patient's Metformin refill logic should probably auto-renew or prompt differently than a 5-day antibiotic course ending. Right now the spec treats all medicines identically.

---

## 2. Symptom & Side-Effect Journal

### How It Works
```
Dashboard shows expandable "How are you feeling today?" widget
        |
Patient picks 1-5 emoji scale + optional 280-char note
        | (optional: tag to a specific active medicine from schedule_items)
        v
POST /api/patient/symptom-log
        -> symptom_logs row: (patient_id, log_date, wellbeing_score, note, tagged_medicine)
        -> UNIQUE constraint on (patient_id, log_date) - one entry per day
        |
        v
No AI processing at write time (explicit design choice - keeps it fast,
cheap, and avoids over-interpreting a subjective daily log)
```

### What It Depends On
| Dependency | Why |
|---|---|
| **`schedule_items`** | Populates the "tag to medicine" dropdown with the patient's actual current medicines |
| **Dashboard widget slot** | Needs a place to live without crowding the existing Dosing Timeline layout |
| **New `symptom_logs` table** | Core new state |

### What It Feeds
```
symptom_logs
    |
    |--> Doctor Portal /history/{patient_id}
    |      renders alongside the prescription timeline so a doctor sees
    |      "patient reported dizziness on Day 3 of Gabapin NT" in context
    |
    `--> Visit Prep Assistant (§8)
           low-wellbeing days + notes surfaced as "things to mention"
```

This is a **feeder-only** feature in your current roadmap — it doesn't consume from anything else, it just produces a new data stream that two other planned features (Doctor history view, Visit Prep) read from. That makes it a good build-early candidate: low risk, unlocks two other features once it exists.

### How to Make It Better
- **Optional photo attachment** for visible symptoms (rash, swelling) — high value for a doctor reviewing the log later, especially since the app already has camera capture infrastructure built for the Document Hub.
- **Trend nudge, not just raw log** — if 3+ consecutive days score ≤2, proactively surface "Would you like to flag this for your doctor now instead of waiting for Visit Prep?" rather than only surfacing it passively at the next appointment.
- **Avoid AI-generated causal claims** — the system should never auto-suggest "this is because of X medicine" even when a note is tagged to a specific drug; that inference should stay with the doctor, not the app.

---

## 3. Family / Caregiver Access

### How It Works
```
Patient: Settings -> Family Access -> enters caregiver's phone number
        |
        v
System sends OTP invite SMS to caregiver
        |
        v
Caregiver taps link on THEIR OWN device -> accepts
        |
        v
caregiver_links row created: (patient_id, caregiver_user_id,
                               permissions[], status: 'pending'->'active')
        |
        v
Caregiver's own Supabase Auth session now scoped (via RLS) to also read
the linked patient_id's data, subject to the permissions array
        |
        v
Caregiver sees a SEPARATE simplified dashboard:
  "You are managing [Patient Name]'s medications" header
  Active meds + today's dose status + adherence ring (read-only)
  Dose-toggle button IF 'dose_toggle' in permissions
  Refill-request button IF 'refill_request' in permissions
```

### What It Depends On
| Dependency | Why |
|---|---|
| **Supabase Auth + RLS** | The entire permission model rests on RLS policies keying off `caregiver_links`, not on trusting the client |
| **Existing Dosing Timeline components** | The caregiver dashboard should reuse the same UI components as the patient dashboard, just permission-gated, not be a separate build |
| **New `caregiver_links` table** | Core new state |

### What It Feeds
This is the single **highest-leverage** planned feature — almost every other planned feature becomes materially better once a caregiver exists:

```
caregiver_links
    |
    |--> Missed-Dose Escalation (§4)
    |      "+2hr caregiver push notification" cannot be built
    |      without this existing first
    |
    |--> Refill Intelligence (§1)
    |      caregiver can action a refill request on an elderly patient's
    |      behalf - much higher real-world completion rate
    |
    `--> Symptom Journal (§2)
           caregiver gets read-only visibility, useful for a family member
           managing a parent's care remotely
```

### How to Make It Better
- **Granular, not all-or-nothing revocation** — let a patient revoke `dose_toggle` while keeping `read`, rather than only a binary active/revoked link. The permission array already supports this in the data model; make sure the Settings UI actually exposes per-permission toggles, not just a single revoke button.
- **Caregiver activity is visible to the patient** — every dose toggle or refill request a caregiver makes should show up in the patient's own Activity Log with the caregiver's name as `actor`, not silently merged as if the patient did it. This matters for trust and for catching mistakes.
- **Multiple caregivers per patient** — the data model (a join table) already supports this; worth explicitly deciding in v1 whether the UI allows more than one linked caregiver (common for elderly patients with several adult children involved).

---

## 4. Smarter Reminders — Missed-Dose Escalation

### How It Works
```
Scheduled backend job (/api/internal/reminder-sweep), runs every 30 min
        |
        v
For each schedule_item where scheduled_time has passed and taken == false:
        |
        |-- +0 min    -> initial push (already exists today)
        |-- +30 min   -> gentle re-ping push notification
        |-- +2 hr     -> persistent, non-dismissable in-app banner
        |-- +2 hr AND caregiver_links exists & active
        |             -> push notification to caregiver
        `-- next morning -> adherence score recalculated,
                            missed dose flagged in the log permanently
```

### What It Depends On
| Dependency | Why |
|---|---|
| **Existing dose-reminder notification pipeline** | This extends it with an escalation ladder rather than replacing it |
| **`caregiver_links`** (§3) | The +2hr caregiver branch is a hard dependency — build §3 first |
| **A scheduled job runner** | Nothing currently in the scaffold appears to run background jobs — this is new infra, not just new logic |

### What It Feeds
- **Adherence Score** — missed doses need to be distinguishable from "not yet due" in the scoring logic, which affects the Adherence Ring calculation already on the Dashboard
- **Doctor Portal** — a pattern of repeated missed doses for a specific medicine is exactly the kind of signal a doctor should see at the next visit (natural tie-in to Visit Prep, §8)

### How to Make It Better
- **Escalation should be per-medicine-risk-tier, not uniform.** A missed vitamin dose and a missed anticoagulant dose shouldn't follow the same 30min/2hr ladder — critical medicines could escalate faster. This requires tagging medicines with a criticality level somewhere (could live on `medications_ref` alongside the cost/generic data from §7).
- **Let the patient snooze/acknowledge without marking taken** — "I'll take it in 20 min" should reset the gentle-reping timer without falsely marking the dose complete, avoiding a dishonest adherence score.
- **Cap notification frequency** — repeated pings for the same missed dose across multiple channels (push + caregiver push + in-app banner) risks notification fatigue; make sure the +2hr caregiver alert doesn't also redundantly re-trigger the patient's own re-ping.

---

## 5. Allergy & Known Reaction Profile

### How It Works
```
Settings -> Allergy & Reactions -> patient adds entries:
  { substance, reaction, severity, reported_by: 'patient'|'doctor' }
        |
        v
allergy_profile table, doctor_confirmed defaults to FALSE
        |
        v
OTC Safety Scanner (/otc-scan, ALREADY BUILT) extended:
        current check: active prescriptions vs. scanned label -> interaction check
        NEW check:     allergy_profile vs. scanned label's drug class family
        |
        v
Verdict card gets a distinct ALLERGY_WARNING badge, separate from the
existing INTERACTION_WARNING, since the clinical reasoning differs
```

### What It Depends On
| Dependency | Why |
|---|---|
| **Existing OTC Scanner** (`otc_scan`, already built) | This feature is purely an extension of an existing endpoint's logic, not a new surface |
| **A drug-class-family reference mapping** | Needed to know that e.g. "Ibuprofen" belongs to the same NSAID family as an allergy entry for "Aspirin" — this is new reference data, not just a new table |
| **New `allergy_profile` table** | Core new state |

### What It Feeds
- **OTC Scanner verdicts** (direct extension)
- **Visit Prep Assistant (§8)** indirectly — an unverified/patient-reported allergy is exactly the kind of thing worth flagging for doctor confirmation at the next visit

### How to Make It Better
- **This is genuinely the lowest-effort, highest-safety-value item on the whole roadmap** — it reuses 100% of existing OTC Scanner infrastructure and just adds one more lookup. Worth prioritizing above several "planned" items with more novel infra needs.
- **Cross-check against the Vault, not just OTC scans** — if a doctor writes a new digital prescription containing a drug the patient has a declared allergy to, that check should fire at prescription-creation time too, not only when the patient later scans an OTC label. The same guardrail logic belongs in `create_digital_prescription` and `verify_prescription`.
- **Severity should gate scanner behavior**, not just annotate it — a "mild" patient-reported reaction might warrant a soft warning; a "severe"/anaphylaxis entry should probably push toward "contact your doctor now" language instead, matching the same escalation tone the Copilot guardrail already uses for emergencies.

---

## 6. "Explain This Report" — Universal Plain-Language AI

### How It Works
This is the lowest-effort item in the entire roadmap because the machinery already exists end-to-end — it's a prompt-template addition, not new infra.

```
analyze_medical_document_by_category(image_bytes, category)
        |
        v
Already has 5 category-specific prompt branches (lab_reports, imaging_scans,
discharge_summaries, vaccinations, fallback) - see Document Hub deep-dive
        |
        v
NEW: extend each existing prompt template with an explicit
"explain in plain, non-diagnostic language" instruction block,
reusing the SAME waterfall (NVIDIA -> OpenRouter -> static fallback)
that already runs for every document
```

### What It Depends On
- **Nothing new.** This is purely a text change inside a function that already exists and already runs for every document upload.

### What It Feeds
- **AI Result Cards** on the frontend — no new component needed, the "Executive Clinical Summary" card already renders whatever `summary` field comes back
- Indirectly strengthens **Copilot context quality**, since a clearer plain-language summary in the Vault means a better-quality string gets injected into the Copilot's system prompt later

### How to Make It Better
- **Tie the urgency framing to the Critical Value Escalation concept** (from the Document Hub deep-dive) — the "mention if anything needs urgent attention" instruction in the imaging prompt should use consistent escalation language across the whole app, not independently-worded urgency phrases per feature.
- **Explicitly instruct the model to flag its own uncertainty** in the plain-language explanation itself ("this appears to show X, but the original scan should be reviewed by your doctor for confirmation") rather than presenting AI interpretation with unwarranted confidence — especially important for imaging/discharge summaries, which are higher-stakes than a biomarker table.

---

## 7. Cost & Generic Alternative Awareness

### How It Works
```
Prescription Detail Page (already built, /vault/prescription/[id])
        |
        v
Each medicine card looks up medicines_ref by name
        |
        v
NEW columns: estimated_cost_inr_range, generic_name,
             generic_available, generic_cost_range
        |
        v
Renders as an additional expandable section per medicine card,
alongside the EXISTING sections (purpose, side effects, food timing)
```

### What It Depends On
| Dependency | Why |
|---|---|
| **Existing expandable medicine card component** | Purely additive UI, reuses the pattern already built for side-effects/precautions |
| **Seed data** for ~200 most-prescribed India drugs | This is a data-sourcing task (CDSCO/OpenFDA India), not a code task — the actual bottleneck here is content, not engineering |

### What It Feeds
Nothing downstream — this is a **terminal/leaf feature**, purely informational display. It doesn't produce data anything else consumes.

### How to Make It Better
- **Never let this data go stale silently** — drug prices in India can shift meaningfully; show a "last updated" date on the cost figures so patients don't treat a year-old estimate as current, especially since this is informational-only, never a substitution recommendation.
- **Regional price variation** — a single national price range may not reflect real local pharmacy pricing; if you have city/state-level data available, that's more useful than a single all-India range, though this is a "nice to have" given the primary value is just generic-name awareness, not exact pricing.

---

## 8. Visit Prep Assistant

### How It Works
This is the **integration feature** — it doesn't introduce new patient-facing data collection, it aggregates everything the other planned features (and one existing feature) already produce.

```
48 hours before a scheduled appointment:
        |
        v
GET /api/patient/visit-prep/{appointment_id}
        |
        |-- symptom_logs               -> low-wellbeing days, notes tagged to medicines
        |-- copilot_refused_queries    -> topics the guardrail blocked, worth
        |     (NEW - doesn't exist yet,   raising directly (see Copilot deep-dive)
        |      needs a code change to
        |      ask_copilot() to persist)
        |-- refill_requests / duration_days -> medicines ending soon
        `-- diagnostic_orders          -> pending lab orders with approaching due dates
        |
        v
All 4 sources -> single Gemma summarization prompt:
"Given these patient-reported symptoms, copilot questions, and clinical
order status items, generate a short plain-language 'things to discuss
with your doctor' list. Max 6 bullets. Factual only - no diagnosis."
        |
        v
Pre-Visit Summary Card rendered on Dashboard + "Export as PDF" button
```

### What It Depends On — this is the key planning insight for this feature

Visit Prep is **not independently buildable**. It has a hard dependency chain:

```
Visit Prep Assistant
    |
    |-- REQUIRES §2 Symptom Journal to exist (data source 1)
    |-- REQUIRES a new copilot_refused_queries table + a code change to
    |   ask_copilot() to actually write to it (data source 2 -
    |   currently ask_copilot() returns guardrail_triggered but never
    |   persists it anywhere, per the Copilot deep-dive)
    |-- REQUIRES §1 Refill Intelligence's duration tracking (data source 3)
    `-- REQUIRES diagnostic_orders to already be populated by the Lab role
        (data source 4 - this one likely already exists given Lab/Doctor
         flows are built)
```

If you build Visit Prep before the first three, it will have at most one working data source (diagnostic orders) and will feel broken/empty — this is the clearest case in the whole roadmap where **build order matters more than effort estimate.**

### What It Feeds
- **PDF export** — reuses whatever PDF generation the app already has (Records Vault export is listed as built)
- Nothing consumes Visit Prep output downstream — it's a terminal feature like Cost Awareness, but with a much richer dependency fan-in

### How to Make It Better
- **Show partial results honestly** rather than waiting for all 4 sources — if a patient has no symptom journal entries but does have a refused Copilot query and a pending lab order, show those 2 items rather than suppressing the whole card until every source has data.
- **Let the patient edit/remove items before export** — an auto-generated "things to discuss" list should be a draft the patient curates, not a fixed output; a symptom log entry they no longer consider relevant shouldn't be locked into the PDF they hand their doctor.
- **De-duplicate against "flag for my doctor" annotations** (from the Document Hub deep-dive) — if a symptom was already flagged there, it shouldn't also appear as a separate Visit Prep bullet; the two features should share one underlying "things flagged for doctor" store rather than growing two parallel lists.

---

## 9. Cross-Feature Dependency Graph (all 8, at a glance)

```
                    +---------------------------+
                    |  §3 Caregiver Access       |  <- build early: highest fan-out
                    +-------------+---------------+
                                  | required by
                                  v
                    +---------------------------+
                    |  §4 Missed-Dose Escalation  |
                    +---------------------------+

+--------------------+  +------------------------+  +-------------------------+
| §1 Refill Intel.     |  | §2 Symptom Journal       |  | Copilot refusal logging  |
| (standalone)          |  | (standalone, feeds §8)   |  | (code fix, feeds §8)     |
+----------+----------+  +-----------+------------+  +------------+------------+
           |                          |                             |
           +--------------------------+-----------------------------+
                                       | all 3 required
                                       v
                    +---------------------------+
                    |  §8 Visit Prep Assistant    |  <- build LAST, needs 3 deps
                    +---------------------------+

+--------------------+  +------------------------+
| §5 Allergy Profile   |  | §6 Explain This Report   |  <- both standalone,
| (extends OTC Scanner)|  | (pure prompt addition)    |     both cheap, both
+--------------------+  +------------------------+     safe to build anytime

                    +---------------------------+
                    |  §7 Cost Awareness           |  <- standalone, data-
                    +---------------------------+     sourcing bottleneck,
                                                        not engineering
```

### Suggested Overall Build Order (combining effort, safety value, and dependencies)
1. **§5 Allergy Profile** — cheapest, extends existing scanner, real safety value
2. **§6 Explain This Report** — near-zero effort, prompt-only
3. **Copilot refusal logging** (code fix, not a user-facing feature on its own, but unlocks §8)
4. **§1 Refill Intelligence** — standalone, moderate value
5. **§2 Symptom Journal** — standalone, feeds §8
6. **§3 Caregiver Access** — higher effort but highest downstream leverage; do before §4
7. **§4 Missed-Dose Escalation** — needs §3
8. **§8 Visit Prep Assistant** — needs §1, §2, and Copilot logging all in place first
9. **§7 Cost Awareness** — can happen anytime in parallel, gated by data sourcing rather than build order


update 3
# Sanjivini AI Copilot — New Add-On Features (Detailed Spec)

Each feature below expands on the short version from the last doc into a full spec: what it looks like, exact data flow, schema, edge cases, and how it plugs into what's already built.

---

## A. Source-Attributed Answers

### The problem today
`query_copilot_llm()` flattens every Vault document into one undifferentiated block of text in the system prompt. The LLM's answer comes back as plain prose with no marker of *which* document it drew from. A patient reading "Your Hemoglobin was low in your last test" has no way to tell if that's from a real report, a stale one, or a hallucination.

### How it should work
```
Patient: "Is my hemoglobin okay?"
        |
        v
query_copilot_llm() builds context AS BEFORE, but each vault doc is now
tagged with a stable reference ID in the prompt itself:

  "[DOC:doc-lab-101] Complete Blood Count Report, Aug 8 2026,
   Metropolis Healthcare. Hemoglobin: 11.8 g/dL (Low, ref 12.0-15.5)..."

        |
        v
System prompt instruction added:
  "When your answer relies on a specific record, cite it inline using
   the format [DOC:doc-id]. Never invent a doc-id that wasn't provided."
        |
        v
LLM response: "Your last Hemoglobin reading was 11.8 g/dL, which is
slightly below the normal range [DOC:doc-lab-101]. This was recorded
on Aug 8. Consider discussing this with your doctor."
        |
        v
Backend post-processes the raw LLM text: regex-extract [DOC:xxx] tags,
strip them from the displayed text, and return them as a separate
structured field:

{
  "answer": "Your last Hemoglobin reading was 11.8 g/dL, which is
              slightly below the normal range. This was recorded on
              Aug 8. Consider discussing this with your doctor.",
  "sources": [{"doc_id": "doc-lab-101", "title": "CBC & Lipid Panel Report"}],
  "guardrail_triggered": false
}
```

### Frontend rendering
The chat bubble renders normally, but ends with a small citation row:
```
┌─────────────────────────────────────────┐
│ Sanjivini: Your last Hemoglobin reading    │
│ was 11.8 g/dL, which is slightly below     │
│ the normal range. This was recorded on     │
│ Aug 8. Consider discussing this with your  │
│ doctor.                                    │
│                                             │
│ 📄 Source: CBC & Lipid Panel Report ›      │
└─────────────────────────────────────────┘
```

### Edge cases to handle
- **Multiple sources in one answer** — support an array, not a single doc_id, since a question like "compare my last two lab reports" legitimately needs two citations.
- **LLM cites a doc-id that doesn't exist** (hallucinated ID) — validate every extracted `[DOC:xxx]` against the actual list of doc-ids that were in the prompt; silently drop any that don't match rather than showing a broken citation link.
- **Fallback-tier answers (Ollama/OpenRouter/NVIDIA all fail)** — the static keyword fallback obviously has no real source to cite; make sure the `sources` field is just an empty array in that case, not omitted (keeps the frontend contract consistent).

### Why this matters
This is the single change that would do the most to make the Copilot trustworthy rather than just fluent. It also sets up Feature B below almost for free, since once you have a `doc_id`, a deep link is trivial.

---

## B. Tap-to-Open Source Chip

### Directly extends A — once `sources: [{doc_id, title}]` exists in the response, render it as an interactive element, not just plain text.

```
┌─────────────────────────────────────────┐
│ Sanjivini: ...consider discussing this     │
│ with your doctor.                          │
│                                             │
│  ┌───────────────────────────────────┐    │
│  │ 📄 CBC & Lipid Panel Report  Aug 8 │ ›  │  ← tappable chip
│  └───────────────────────────────────┘    │
└─────────────────────────────────────────┘
        |
        | tap
        v
Navigates to /vault/[category]/[doc_id]
(the existing Vault detail view — no new screen needed)
```

### Implementation notes
- This is a pure frontend routing change once (A) exists on the backend — `router.push('/vault/lab-reports/doc-lab-101')` or equivalent, using the same detail route already built for the Vault.
- If a citation references a category the frontend route structure doesn't cleanly support (e.g. a prescription vs. a lab report have different detail page shapes), map `doc.category` → the correct route prefix, reusing the same `vault_category_map` logic already present in `patient_service.add_analyzed_document_to_vault`.
- Multiple sources in one message → render multiple chips in a row, horizontally scrollable if needed rather than stacked, to keep the chat compact.

### Why this matters
This turns three previously disconnected surfaces — Copilot, Vault, and the document detail view — into one connected navigation flow. A patient asking a question in chat and ending up looking at the actual verified document (rather than trusting the chat's word for it) is a meaningfully stronger trust model.

---

## C. Confidence-Scoped Answers for Empty Context

### The problem today
When a new patient with no prescriptions and no Vault documents asks the Copilot anything, `query_copilot_llm()` still sends a full system prompt (with `med_str = "No active daily prescriptions currently registered."` and `vault_str = "No archived health documents in vault yet."`) to the LLM, which then answers as it sees fit — and the static Tier-3 fallback's generic "take medications as prescribed" text can read as though it has context behind it, even when it plainly doesn't.

### How it should work
```
Before calling any LLM at all, check upfront:

  has_context = bool(schedule_items) or bool(vault_items)

  if not has_context AND question is NOT a general/definitional
  question (e.g. "what is a CBC?"):
        return a distinct, honest response type:

        {
          "answer": "I don't have any of your medical records yet, so
                     I can't give you a personalized answer to this.
                     Once your doctor signs off on a prescription, or
                     you scan a report into your Vault, I'll be able
                     to reference it directly. In the meantime, would
                     you like me to explain this in general terms?",
          "response_type": "no_context",
          "guardrail_triggered": false
        }
```

### Distinguishing general-knowledge questions from personalized ones
Not every question needs personal context — "what does CBC stand for?" is answerable generally. A simple heuristic: if the question contains a first-person reference to the patient's own state ("my", "am I", "should I", "is my") AND there's no context available, use the no-context response. If it's phrased generically ("what is...", "explain..."), let it proceed to the LLM as a general-knowledge question — this matches what the LLM already does reasonably well today for things like the "tumor" definition in the Tier-3 fallback.

### Frontend treatment
Render this response type with a distinct visual affordance — not an error, not a refusal, just a calm "here's why I can't personalize this yet" state, ideally with a direct action button:
```
┌─────────────────────────────────────────┐
│ Sanjivini: I don't have any of your        │
│ medical records yet, so I can't give a     │
│ personalized answer. Once your doctor      │
│ signs off, or you scan a document, I'll    │
│ be able to help more specifically.         │
│                                             │
│  [ Scan a Document → ]                     │
└─────────────────────────────────────────┘
```

### Why this matters
Right now the app has no way to distinguish "I have real information and this is my answer" from "I have nothing to go on and I'm guessing." This feature draws that line explicitly, which protects trust in every other Copilot answer by contrast — once patients know the app is honest about not knowing, they trust it more when it does claim to know something.

---

## D. "Ask My Doctor Instead" One-Tap Escalation

### How it should work
```
Trigger conditions (either one):
  1. Tier-1 keyword guardrail fires (existing DIAGNOSTIC_TRIGGERS match)
  2. LLM response itself signals uncertainty/deferral (detect phrases
     like "I'm not able to", "please consult", "see a doctor" in the
     LLM's own output — a lightweight secondary check on the answer text)
        |
        v
Response includes an additional action affordance:

{
  "answer": "I can't diagnose new emergency symptoms. Please contact
             your attending physician immediately.",
  "guardrail_triggered": true,
  "suggested_action": {
    "type": "message_doctor",
    "prefill_text": "Patient asked Sanjivini: \"<original question>\"
                      — requesting guidance."
  }
}
        |
        v
Frontend renders a button under the refusal:
  [ Message Dr. Sharma about this → ]
        |
        | tap
        v
Opens a pre-filled message composer (reusing whatever channel
Reception/Doctor already uses for patient communication — WhatsApp
deep link is already built for other notification flows in this app)
with the original question attached, addressed to the patient's
current/most-recent prescribing doctor.
```

### Which doctor to address it to
Pull from the patient's most recent `verify_prescription` action, or — if multiple active doctors — offer a quick picker ("Which doctor would you like to message: Dr. Sharma (Heart Care) or Dr. Patel (Diabetes)?") rather than guessing. This reuses the same doctor-name data already present on every schedule item and Vault document.

### Logging
Every escalation tap should log a `COPILOT_ESCALATED_TO_DOCTOR` event (extending the existing `patient_service.add_log` pattern), separate from the plain `COPILOT_QUESTION` log — this becomes a second useful Visit Prep signal beyond guardrail refusals: not just "the app blocked this," but "the patient actively chose to escalate this."

### Why this matters
A guardrail refusal today is a dead end — the patient is told to contact their doctor but the app does nothing to make that easier. This feature converts every refusal into a completed, low-friction action, which is a meaningfully better patient outcome than a static warning message.

---

## E. Multi-Turn Safety Persistence

### The problem today
`ask_copilot()` only inspects `payload.question` — the single newest message — against `DIAGNOSTIC_TRIGGERS`. The conversation `history` array is sent to the LLM for context but never re-examined by the guardrail itself. A conversation could escalate in urgency across several turns without any single message tripping the keyword filter.

### How it should work
```
Example conversation:
  Turn 1 - "I've been really tired lately"           -> no trigger, answered normally
  Turn 2 - "and now my hands feel numb"                -> no trigger, answered normally
  Turn 3 - "it's spreading up my arm"                  -> no trigger, answered normally

Each individual message is mundane-sounding; the escalating PATTERN
across turns is the actual signal, and today's implementation has no
way to see that pattern at all.
```

### Proposed approach
```
Before the Tier-1 keyword check, construct a rolling window:

  recent_turns = [h.content for h in history[-4:]] + [payload.question]
  combined_text = " ".join(recent_turns).lower()

Run the SAME DIAGNOSTIC_TRIGGERS check against combined_text, not just
the current message alone, so a trigger phrase appearing anywhere in
the last few turns (not only literally in the newest message) still
fires the guardrail.

This is a minimal, cheap first step - a true escalating-pattern
detector would need actual reasoning (e.g. a lightweight
classification pass), which is a larger undertaking. The windowed-
keyword-check is the pragmatic middle ground: catches the case where
a patient's phrasing splits an emergency description across two
messages, without needing new infrastructure.
```

### Why the scope should stay narrow
It would be tempting to build a full sentiment/escalation classifier here, but given the guardrail's core weakness today is simply "only checks the latest message," widening the window it checks is a proportionate first fix. A more sophisticated model-based escalation detector is a reasonable future iteration, not a v1 requirement.

---

## F. Language-Aware Guardrail

### The problem today
`DIAGNOSTIC_TRIGGERS` is a fixed list of English phrases (`"chest pain"`, `"diagnose"`, etc.). The app already supports 6 regional languages elsewhere (TTS Audio Care Engine, Vault translation). If Copilot chat is used in a regional language — either because the frontend surfaces a language toggle for chat, or because a patient simply types in Hindi/Tamil/etc. regardless of UI language — the keyword filter as written cannot match any of it, and the question goes straight to the LLM with zero guardrail coverage.

### How it should work
```
Option 1 (cheapest): Maintain translated trigger phrase sets per
supported language, checked in addition to the English list:

  DIAGNOSTIC_TRIGGERS_BY_LANG = {
    "en": ["what should i take", "is it", "diagnose",
           "what's wrong with me", "chest pain"],
    "hi": ["<Hindi equivalents>"],
    "te": ["<Telugu equivalents>"],
    "ta": ["<Tamil equivalents>"],
    "kn": ["<Kannada equivalents>"],
    "mr": ["<Marathi equivalents>"],
  }

  Check against ALL language sets simultaneously (not just the
  patient's stored language_pref), since a patient may type in a
  language different from their UI/TTS preference.

Option 2 (more robust, more effort): Detect the input language first
  (or normalize/translate the question to English before the keyword
  check only - NOT for the actual LLM call, which should still receive
  the original language), then run the existing English trigger list
  against the normalized text.
```

### Recommendation
Start with Option 1 — it's a direct, auditable extension of the existing pattern (a hardcoded list), doesn't introduce a translation-quality dependency into the safety-critical path, and can ship quickly. Option 2 is a reasonable later iteration if trigger-phrase coverage proves too narrow in practice.

### Why this matters
This is a genuine, currently-unaddressed gap given the product's own stated design goal (per the original Patient spec, PT-9: 6 regional languages, explicitly built for elderly/low-literacy users who are named as the population most likely to use audio/regional-language features). The guardrail's coverage should match the product's actual language scope, not just its English-first development default.

---

## G. Post-Answer Feedback Loop

### How it should work
```
Every Copilot chat bubble gets a small, unobtrusive feedback affordance:

┌─────────────────────────────────────────┐
│ Sanjivini: <answer text>                   │
│                                             │
│                              👍  👎        │
└─────────────────────────────────────────┘
        |
        | tap
        v
POST /api/patient/copilot-feedback
  { patient_id, question, answer, rating: "up"|"down",
    llm_tier_used: "ollama"|"openrouter"|"nvidia"|"fallback" }
        |
        v
New copilot_feedback table:

CREATE TABLE copilot_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  rating      TEXT NOT NULL,      -- 'up' | 'down'
  llm_tier    TEXT,               -- which tier in the waterfall answered
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### What this unlocks
- **Waterfall tier quality comparison** — since the response already implicitly knows which tier answered (Ollama vs OpenRouter vs NVIDIA vs static fallback), tagging feedback with `llm_tier` lets you see, over time, whether the local Ollama models are actually producing acceptable answers or whether the app is silently relying on lower-quality tiers more than expected.
- **Down-voted answer review queue** — a simple admin-facing list of thumbs-down answers with their original question is a direct, low-effort way to catch systematic Copilot failure modes (a specific drug name it keeps getting wrong, a phrasing pattern it misunderstands) without needing to guess.
- **Reuses an existing pattern** — this mirrors the "extraction accuracy tracking" idea already suggested for the Document Hub (thumbs up/down on OCR/AI document analysis); implementing both with a shared feedback-table shape means one small admin view could review quality signal from both features together.

### UI restraint
Keep this genuinely lightweight — no follow-up "why did you dislike this?" modal in v1, since that adds friction and most patients won't complete it. A bare thumbs up/down with silent logging captures the signal that matters (which answers are trusted) without turning every chat interaction into a survey.

---

## Summary — Effort vs. Value at a Glance

| Feature | Effort | Depends on | Unlocks |
|---|---|---|---|
| A. Source attribution | Low-Medium | Prompt + light post-processing | B (chips), improves trust in every answer |
| B. Tap-to-open chip | Low | A | Connects Copilot ↔ Vault navigation |
| C. Confidence-scoped empty context | Low | None | Prevents misleadingly generic answers |
| D. Ask-my-doctor escalation | Medium | Existing WhatsApp/messaging infra | Converts refusals into completed actions |
| E. Multi-turn safety persistence | Low | None | Closes a real emergency-detection gap |
| F. Language-aware guardrail | Low-Medium | Translated phrase lists | Closes guardrail gap for majority of app's actual target users |
| G. Feedback loop | Low | New table | Long-term quality visibility across LLM tiers |



UPDATE 5
# Reminders & Notifications + Symptom Journal — New Add-On Features (Detailed Spec)

Full expansion of every new add-on idea for these two sections: exact data flow, schema, UI, edge cases, and how each plugs into what's already built.

---

# PART A — Reminders & Notifications: New Add-Ons

## A1. Criticality-Tiered Escalation

### The problem today
The planned escalation ladder (+30min, +2hr, +2hr caregiver) is a single fixed sequence applied identically to every medicine. A missed daily vitamin and a missed anticoagulant dose currently get the same urgency treatment.

### How it should work
```
New field on the medicine reference data: criticality_tier
  ("routine" | "important" | "critical")

Seed this alongside the medications_ref table already planned for
Cost Awareness (§8.7) — one reference-data expansion serves two
features instead of two separate schema additions.

Escalation ladder becomes tier-dependent:

  ROUTINE   (vitamins, general supplements)
    +0 min   initial push
    +2 hr    gentle re-ping
    +6 hr    quiet log entry, no further escalation

  IMPORTANT (most standard prescriptions - antibiotics, pain management)
    +0 min   initial push
    +30 min  gentle re-ping
    +2 hr    persistent in-app banner
    +2 hr    caregiver notified (if linked)

  CRITICAL  (anticoagulants, insulin, cardiac medication, etc. -
             flagged explicitly by the prescribing doctor at
             sign-off time, not inferred automatically)
    +0 min   initial push
    +15 min  gentle re-ping (faster than default)
    +45 min  persistent in-app banner
    +45 min  caregiver notified immediately (if linked)
    +2 hr    optional: flag in Activity Log as HIGH_PRIORITY_MISSED_DOSE
             for visibility in any future clinician-facing dashboard
```

### Who sets the tier
Default every medicine to `"important"` unless:
- It matches a small curated list of well-known high-risk drug classes (anticoagulants, insulin, certain cardiac drugs) — auto-tag these on ingestion into `medications_ref`
- **OR** the prescribing doctor explicitly marks it critical at verification time — this should always be able to override the automatic tag, since clinical judgment beats a static list

### Edge cases
- **Multiple medicines missed at the same time** — don't fire N separate escalation cascades; batch into one notification ("You have 2 missed doses, including 1 critical") with the critical one's ladder driving the overall urgency.
- **Patient has no `criticality_tier` data available for a self-entered digital prescription** (a path that bypasses doctor review) — default to `"important"`, never silently downgrade to routine just because the tier is unknown.

### Why this matters
This is the single highest-value addition to the escalation feature — it's the difference between a notification system that treats every missed pill identically and one that actually reflects clinical risk.

---

## A2. Acknowledge-Without-Marking-Taken (Snooze State)

### The problem today
The only two states implied by the current design are `taken: true/false`. A patient who says "I'll take it in 20 minutes" has no way to communicate that without either falsely marking it taken (corrupting the adherence record) or leaving it in a state indistinguishable from "hasn't seen the reminder at all."

### How it should work
```
schedule_items entry gets a new field: acknowledgment_state
  ("none" | "snoozed" | "taken" | "skipped_explicit")

Patient taps notification -> sees 3 options instead of just Taken/Not:
  [ Taken ]   [ Snooze 20 min ]   [ Skip — won't take this dose ]

SNOOZE:
  acknowledgment_state = "snoozed"
  snooze_until = now + 20min
  -> the +30min/+2hr escalation TIMER RESETS relative to snooze_until,
     not the original scheduled time
  -> adherence score treats this dose as "pending", NOT missed,
     for the duration of the snooze window

SKIP (explicit):
  acknowledgment_state = "skipped_explicit"
  -> prompts a short reason picker: "Ran out" / "Feeling better" /
     "Doctor advised stopping" / "Other"
  -> logged distinctly from a silent missed dose — this is patient-
     initiated, not a lapse, and should be visible to the doctor as
     such, not conflated with genuine non-adherence
```

### Why this matters
Without this, every "life happened, I'll take it soon" moment gets recorded identically to genuine non-adherence, which corrupts the exact metric (Adherence Score) the whole feature is built to protect. This also directly prevents an unnecessary caregiver alert from firing on a dose the patient already acknowledged.

---

## A3. Coordinated Multi-Channel Notification (Anti-Pileup)

### The problem today
Once Caregiver Access exists, a missed dose at +2hr could trigger the patient's own escalation banner AND a caregiver push AND (if snooze/acknowledge doesn't exist yet, see A2) a redundant re-ping — three notifications about the same event, uncoordinated.

### How it should work
```
Single source of truth: a per-dose "escalation_state" object, not
independent timers per channel:

{
  "prescription_item_id": "...",
  "current_stage": "gentle_reping" | "in_app_banner" |
                    "caregiver_notified" | "resolved",
  "last_notification_sent_at": "...",
  "channels_notified": ["push_patient", "push_caregiver"]
}

The reminder-sweep job reads THIS object, not raw time-since-scheduled,
to decide what to send next. Each stage transition sends exactly ONE
notification set, then advances the stage — nothing re-sends for a
stage it already completed, even if the sweep job runs again before
the next stage's threshold is reached.
```

### Why this matters
Prevents exactly the notification-fatigue risk flagged earlier — a family already anxious about a missed dose does not need three separate uncoordinated alerts about the same event arriving in a burst.

---

## A4. Rich Calendar Entries for Lab/Appointment Reminders

### The problem today
The base spec for "Remind Me" just creates a calendar entry — likely with a bare title.

### How it should work
```
Patient taps "Remind Me" on a Lab/Appointment Reminder card
        |
        v
Generate a .ics file (or in-app /calendar entry, reusing the existing
built calendar route) with:

  Title:    "CBC Follow-Up — Dr. Rai"
  Notes:    "Ordered on Aug 6 following consultation for [condition
             tag]. Please fast for 8 hours before the blood draw if
             instructed by your clinic."
  Location: (if available from diagnostic_orders / clinic data)
  Reminder: 1 day before, in addition to the day-of push notification
```

### Why this matters
A calendar entry a patient finds days later with just "CBC Follow-Up" and no context forces them to open the app again to remember why. Embedding the doctor's name and reason directly in the calendar entry makes it useful standalone, which matters most for exactly the low-tech-engagement patients this app is designed for.

---

## A5. Escalation Transparency Log for the Patient

### How it should work
A simple, patient-facing (not just doctor-facing) view showing exactly what happened around a missed dose — reachable from the existing Activity Logs screen:
```
+----------------------------------------------------------+
|  Aug 12 — Tab. Gabapin NT 100mg (Night dose)               |
|                                                              |
|  9:00 PM   Reminder sent                                    |
|  9:30 PM   Gentle re-ping sent                               |
|  11:00 PM  Marked as taken (2 hrs late)                       |
|                                                              |
|  This dose is counted as "taken late" in your adherence     |
|  score, not "missed."                                        |
+----------------------------------------------------------+
```

### Why this matters
Escalation logic that's invisible to the patient can feel punitive or confusing ("why did my mother get a text about my medicine?"). Making the sequence transparent — including explicitly stating how a late-but-completed dose is scored — builds trust in a system that is, by design, watching closely and sometimes looping in other people.

---

# PART B — Symptom & Wellbeing Journal: New Add-Ons

## B1. Photo Attachment for Visible Symptoms

### How it should work
```
Daily Check-In widget gets an optional camera/upload icon, reusing
the SAME capture component already built for the Document Hub
(scan-otc/page.tsx) rather than building new camera handling:

+----------------------------------------------------------+
|  How are you feeling today?                                 |
|   sad  meh  neutral  smile  happy                            |
|  [ + Add a note ]     [ Add a photo (optional) ]              |
+----------------------------------------------------------+
        |
        v
symptom_logs row gets an additional field: photo_url
(stored the same way Document Hub scans are stored — same
underlying file storage, once that's fixed per the known shared-
fallback-URL bug from the Vault deep-dive)
```

### Edge cases
- **Never AI-analyze the photo automatically.** Unlike the Document Hub, this photo is not fed into any diagnostic pipeline — it's purely for the doctor's own eyes at review time. Auto-analysis here would blur the "this is not medical advice" boundary the whole journal feature is built around.
- **Doctor view should show the photo inline** in the interleaved timeline, not as a separate download link, so a doctor scanning the history doesn't miss it.

### Why this matters
For visible symptoms (rash, swelling, injection-site reaction) a photo is dramatically more useful to a doctor than a text description, and the infrastructure to capture and store it already exists elsewhere in the app.

---

## B2. Trend-Aware Proactive Nudge

### How it should work
```
After each symptom_logs write, run a lightweight check (no AI needed —
pure arithmetic on recent scores):

  last_3_scores = query symptom_logs for the last 3 consecutive
                  calendar days for this patient

  if all 3 scores <= 2:
        surface an active prompt, distinct from the passive Visit
        Prep aggregation:

+----------------------------------------------------------+
|  We noticed you've logged feeling low for 3 days in a row.  |
|  Would you like to:                                          |
|                                                              |
|  [ Flag this for my doctor now → ]                            |
|  [ I'm okay, just tracking → ]                                 |
+----------------------------------------------------------+
```

### What "Flag this for my doctor now" should do
Reuse the exact same mechanism as the "Ask My Doctor Instead" Copilot add-on — a pre-filled message to the patient's current prescribing doctor via the existing WhatsApp/SMS channel, containing the 3-day score trend and any notes. Sharing this mechanism across Copilot escalation and Symptom Journal escalation means one messaging integration serves two features instead of two.

### Why this matters
Passive logging that only surfaces at the next scheduled visit (via Visit Prep) can be too slow for a pattern that matters now. This closes the gap between "the data exists" and "someone notices in time," without requiring any AI interpretation — it's pure threshold logic on numbers the patient already entered themselves.

---

## B3. Same-Day Edit / Append

### How it should work
```
The UNIQUE(patient_id, log_date) constraint stays, but the write
becomes an UPSERT, not a strict INSERT:

  Morning:   score=4, note="feeling fine"
  Afternoon: patient reopens widget, sees their morning entry shown,
             taps to update:
             score=2, note="feeling fine this morning, but had a bad
             reaction after my afternoon dose — dizziness and nausea"
        |
        v
UPDATE symptom_logs SET wellbeing_score=2, note=<new note>,
       updated_at=now() WHERE patient_id=... AND log_date=today
        |
        v
Doctor-facing timeline shows the LATEST entry for that day, with a
small "edited" indicator and the original entry viewable if tapped
(don't silently overwrite history — keep both versions available)
```

### Why this matters
A rigid one-shot-per-day design would actively discourage patients from recording a more clinically important later event on a day where they already logged something mundane in the morning — exactly backward from what the feature is trying to encourage.

---

## B4. Wellbeing-to-Adherence Correlation View (Doctor-Facing)

### How it should work
```
On the Doctor Portal's history view, alongside the interleaved
timeline, add a simple side-by-side visual:

  Adherence Score (daily %)     vs.     Wellbeing Score (daily 1-5)

  This is a DISPLAY-ONLY correlation, never an automated causal
  claim — the doctor draws their own conclusions from seeing the
  two lines side by side, the system never states "low adherence
  is causing low wellbeing" or any inverse claim.
```

### Why this matters
This is one of the few places where combining two data sources genuinely helps a doctor faster than either alone — but the implementation constraint (display-only, no auto-generated causal text) matters just as much as the feature itself, consistent with the standing rule against the app ever generating causal narratives from patient-logged data.

---

## B5. Gentle Non-Logging Nudge (Not Guilt-Based)

### How it should work
```
If a patient hasn't logged in 3+ days AND has active prescriptions
(i.e. they're clearly still using the app, just not this specific
feature), show a single low-pressure prompt on the Dashboard —
NOT a push notification, NOT repeated daily:

+----------------------------------------------------------+
|  Haven't checked in for a few days — no pressure, but        |
|  logging how you're feeling helps your doctor spot            |
|  patterns before your next visit.                             |
|                            [ Log Today ]  [ Dismiss ]           |
+----------------------------------------------------------+

Dismissing suppresses the prompt for at least 7 days before it can
reappear — this should never become a nagging pattern.
```

### Why this matters
The Symptom Journal's honesty principle (don't backfill or imply continuous tracking that didn't happen) means gaps are fine and expected — but a single gentle, dismissible nudge (not a streak counter, not guilt language, not a push notification) can meaningfully increase real usage without turning the feature into another source of notification pressure on top of dose reminders.

---

# Summary — Effort vs. Value Across Both Sections

| Feature | Section | Effort | Depends on | Unlocks / Improves |
|---|---|---|---|---|
| A1. Criticality-tiered escalation | Reminders | Medium | New reference data field (shares schema with Cost Awareness) | Makes escalation clinically meaningful, not uniform |
| A2. Snooze / acknowledge state | Reminders | Low-Medium | None | Protects Adherence Score accuracy; prevents false "missed" logging |
| A3. Coordinated multi-channel notification | Reminders | Medium | Caregiver Access | Prevents notification pileup once caregivers exist |
| A4. Rich calendar entries | Reminders | Low | Existing `/calendar` route | Makes reminders useful standalone, outside the app |
| A5. Escalation transparency log | Reminders | Low | Existing Activity Logs UI | Builds trust in an otherwise "invisible" escalation system |
| B1. Photo attachment | Symptom Journal | Low | Reuses Document Hub camera component | Higher-value doctor review for visible symptoms |
| B2. Trend-aware proactive nudge | Symptom Journal | Low-Medium | Shares "ask doctor" mechanism with Copilot add-on | Closes the gap between data existing and someone noticing in time |
| B3. Same-day edit/append | Symptom Journal | Low | None | Prevents important later-day events from being lost |
| B4. Wellbeing/adherence correlation view | Symptom Journal | Medium | Doctor Portal history view | Faster pattern-spotting for doctors, display-only by design |
| B5. Gentle non-logging nudge | Symptom Journal | Low | None | Increases real usage without adding notification pressure |

### Suggested Build Order (both sections combined)
1. **A2 Snooze/acknowledge state** — cheap, protects data integrity for everything downstream
2. **B3 Same-day edit** — cheap, prevents data loss in the journal from day one
3. **A5 Escalation transparency log** — cheap, pure UI over data that will already exist once base escalation ships
4. **B1 Photo attachment** — cheap, reuses existing infrastructure directly
5. **B5 Gentle non-logging nudge** — cheap, standalone
6. **A1 Criticality-tiered escalation** — do before shipping escalation broadly; retrofitting tiers later means re-triaging every existing medicine
7. **B2 Trend-aware proactive nudge** — build once the "ask doctor" messaging mechanism exists (shared with the Copilot add-on)
8. **A4 Rich calendar entries** — polish layer on Lab/Appointment Reminders
9. **A3 Coordinated multi-channel** — needed once Caregiver Access ships, not before
10. **B4 Correlation view** — polish/analysis layer, lowest urgency of the set


# Sanjeevani — Adherence & Wellbeing Trend Widget
### Bug Diagnosis + Full Spec + Working Code + Fix Prompt

**Widget:** "Adherence & Wellbeing Trend (Past 7 Days)" — doctor-facing card showing daily adherence % + wellbeing score side by side.

---

# PART A — WHAT'S BROKEN, EXPLAINED

## A.1 The Mojibake Bug (garbled emoji: `ðŸ™‚`)

**What's happening:** The emoji characters are almost certainly hardcoded as raw Unicode string literals (`"🙂"`, `"😐"`, etc.) somewhere in the component. Those bytes are being written/read through a layer that isn't UTF-8-aware — Windows console output getting relayed into the browser, a file saved without explicit UTF-8 encoding, or an API response missing `charset=utf-8` in its `Content-Type` header. The result: valid UTF-8 bytes get reinterpreted as Latin-1/Windows-1252, producing the `ðŸ™‚`-style garbage. This is why it's inconsistent per cell — different underlying emoji, same corruption pattern, not a one-off typo.

**Why "just re-save the file as UTF-8" isn't the real fix:** it'll silently break again the next time anyone edits that file in a tool/OS that doesn't default to UTF-8, or the next time the string passes through a misconfigured pipe (Windows terminal → subprocess → log → frontend, etc.). The actual fix is to stop representing mood as a raw emoji character at all, and use an icon component instead (Part C code below) — this is encoding-proof by construction, not by discipline.

## A.2 The "Dummy Data" Tells

Three signs this card is static/seeded rather than live:
1. **Every bar is identical green** regardless of 75% vs 90% — no severity-based coloring, so a bad day doesn't visually stand out.
2. **The tooltip shows a flat "Wellbeing Score: 3/5"** that doesn't appear to change per bar hovered — a single hardcoded tooltip string, not bound to per-day data.
3. **"7-DAY WINDOW" looks like a control but likely isn't wired** — no visible way to actually change it, no loading state when it would change.

## A.3 What "Live" Requires

Two real queries (adherence from `intake_logs`, wellbeing from `symptom_logs`), merged server-side into one response keyed by date, with the frontend rendering exactly what it receives — never computing, guessing, or falling back to a hardcoded array.

---

# PART B — UPGRADED FEATURE SPEC

## B.1 What Changes

| Current | Upgraded |
|---|---|
| Static 7-day seeded array | Live query, date-range selectable (7/14/30 days) |
| All bars same green | Color-coded by threshold: ≥85% green, 70–84% amber, <70% red |
| Broken emoji, non-UTF-8-safe | Icon component (lucide-react), theme-colored, `aria-label`'d |
| Flat, identical tooltip | Real per-day tooltip: exact %, doses taken/scheduled, wellbeing score, patient's note excerpt |
| Dead-end chart (not clickable) | Click a day → jumps to that date in the Symptom Calendar / Timeline tab |
| No pattern insight | One computed, non-diagnostic sentence when a real pattern is visible (e.g. "Wellbeing dropped on the 2 days adherence was below 75% this week") |

## B.2 Non-Goals (Keep the Existing Honesty)

- Never claim causation — the existing "non-causal" framing was correct and must be preserved in copy.
- The pattern-insight sentence (B.1, last row) is informational only, never a diagnosis, never auto-actioned.

---

# PART C — WORKING CODE

## C.1 Backend — FastAPI Endpoint

```python
# scaffold/backend/app/routers/doctor.py (add to existing router)

from datetime import date, timedelta
from fastapi import APIRouter, Query

@router.get("/patient/{patient_id}/adherence-wellbeing")
async def get_adherence_wellbeing_trend(
    patient_id: str,
    days: int = Query(7, ge=1, le=90)
):
    """
    Live, merged adherence + wellbeing trend for the doctor's review card.
    Never returns hardcoded/seeded data — if a day has no symptom log,
    wellbeing_score is null and the frontend must render an empty state
    for that day's icon, not a fake default.
    """
    sb = get_supabase()
    start_date = (date.today() - timedelta(days=days - 1)).isoformat()

    # Adherence % per day
    intake_res = (
        sb.table("intake_logs")
        .select("scheduled_at, taken")
        .eq("patient_id", patient_id)
        .gte("scheduled_at", start_date)
        .execute()
    )

    adherence_by_day: dict[str, dict] = {}
    for row in intake_res.data:
        day = row["scheduled_at"][:10]
        bucket = adherence_by_day.setdefault(day, {"taken": 0, "total": 0})
        bucket["total"] += 1
        if row.get("taken"):
            bucket["taken"] += 1

    # Wellbeing score per day (+ optional note excerpt)
    symptom_res = (
        sb.table("symptom_logs")
        .select("log_date, feeling_score, notes")
        .eq("patient_id", patient_id)
        .gte("log_date", start_date)
        .execute()
    )
    wellbeing_by_day = {
        row["log_date"]: {
            "score": row["feeling_score"],
            "note": (row.get("notes") or "")[:120] or None
        }
        for row in symptom_res.data
    }

    # Merge into one day-by-day series, oldest → newest
    series = []
    for i in range(days):
        day = (date.today() - timedelta(days=days - 1 - i)).isoformat()
        adherence = adherence_by_day.get(day)
        adherence_pct = (
            round(100 * adherence["taken"] / adherence["total"])
            if adherence and adherence["total"] > 0
            else None
        )
        wellbeing = wellbeing_by_day.get(day)

        series.append({
            "date": day,
            "adherence_pct": adherence_pct,
            "doses_taken": adherence["taken"] if adherence else None,
            "doses_scheduled": adherence["total"] if adherence else None,
            "wellbeing_score": wellbeing["score"] if wellbeing else None,
            "note_excerpt": wellbeing["note"] if wellbeing else None,
        })

    # Non-causal pattern flag: only surfaced if it's actually true this window
    low_adherence_days = [d for d in series if d["adherence_pct"] is not None and d["adherence_pct"] < 75]
    low_wellbeing_on_low_adherence_days = [
        d for d in low_adherence_days if d["wellbeing_score"] is not None and d["wellbeing_score"] <= 2
    ]
    pattern_note = None
    if len(low_wellbeing_on_low_adherence_days) >= 2:
        pattern_note = (
            f"Wellbeing was low on {len(low_wellbeing_on_low_adherence_days)} of the "
            f"{len(low_adherence_days)} days adherence was below 75% this window."
        )

    return {
        "patient_id": patient_id,
        "days": days,
        "series": series,
        "pattern_note": pattern_note  # null if no clear pattern — never fabricated
    }
```

## C.2 Frontend — React Component (encoding-safe icons, real tooltip, clickable days)

```tsx
// scaffold/frontend/apps/doctor/src/components/AdherenceWellbeingTrend.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Frown, Meh, Smile, Laugh, HelpCircle, TrendingUp } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type DayPoint = {
  date: string;
  adherence_pct: number | null;
  doses_taken: number | null;
  doses_scheduled: number | null;
  wellbeing_score: number | null;
  note_excerpt: string | null;
};

type TrendResponse = {
  series: DayPoint[];
  pattern_note: string | null;
};

const MOOD_ICON: Record<number, { Icon: any; color: string; label: string }> = {
  1: { Icon: Frown, color: "text-red-400", label: "Very low" },
  2: { Icon: Frown, color: "text-amber-400", label: "Low" },
  3: { Icon: Meh, color: "text-amber-300", label: "Okay" },
  4: { Icon: Smile, color: "text-green-400", label: "Good" },
  5: { Icon: Laugh, color: "text-green-400", label: "Great" },
};

function adherenceColor(pct: number | null): string {
  if (pct === null) return "bg-[var(--border)]";
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdherenceWellbeingTrend({ patientId }: { patientId: string }) {
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/doctor/patient/${patientId}/adherence-wellbeing?days=${windowDays}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, windowDays]);

  const goToDay = (day: string) => {
    router.push(`/doctor/patient/${patientId}/timeline?date=${day}`);
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-400" />
          <h3 className="font-semibold text-[var(--fg)]">
            Adherence &amp; Wellbeing Trend (Past {windowDays} Days)
          </h3>
        </div>
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value) as 7 | 14 | 30)}
          className="text-xs bg-[var(--bg-muted)] border border-[var(--border)] px-2 py-1"
        >
          <option value={7}>7-DAY WINDOW</option>
          <option value={14}>14-DAY WINDOW</option>
          <option value={30}>30-DAY WINDOW</option>
        </select>
      </div>
      <p className="text-xs text-[var(--fg-muted)] mb-4">
        Display-only side-by-side tracking for doctor review (non-causal).
      </p>

      {loading ? (
        <div className="grid grid-flow-col auto-cols-fr gap-2">
          {Array.from({ length: windowDays }).map((_, i) => (
            <div key={i} className="h-32 bg-[var(--bg-muted)] animate-pulse" />
          ))}
        </div>
      ) : !data || data.series.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] py-6">
          No adherence or wellbeing data recorded in this window yet.
        </p>
      ) : (
        <div className={`grid gap-2 overflow-x-auto`} style={{ gridTemplateColumns: `repeat(${data.series.length}, minmax(90px, 1fr))` }}>
          {data.series.map((day) => {
            const mood = day.wellbeing_score ? MOOD_ICON[day.wellbeing_score] : null;
            const isHovered = hoveredDay === day.date;

            return (
              <button
                key={day.date}
                onClick={() => goToDay(day.date)}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
                className="relative text-left border border-[var(--border)] p-2 hover:border-[var(--fg)] transition-colors"
              >
                <p className="text-xs text-[var(--fg-muted)] mb-2">{formatDayLabel(day.date)}</p>

                <div className="h-16 flex items-end mb-2">
                  <div
                    className={`w-full ${adherenceColor(day.adherence_pct)} transition-all`}
                    style={{ height: day.adherence_pct !== null ? `${day.adherence_pct}%` : "8%" }}
                  />
                </div>

                <p className="text-sm font-semibold text-center mb-2">
                  {day.adherence_pct !== null ? `${day.adherence_pct}%` : "—"}
                </p>

                <div className="flex justify-center">
                  {mood ? (
                    <mood.Icon size={18} className={mood.color} aria-label={mood.label} />
                  ) : (
                    <HelpCircle size={18} className="text-[var(--fg-muted)]" aria-label="No log" />
                  )}
                </div>

                {isHovered && (
                  <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-black text-white text-xs p-3 rounded shadow-lg">
                    <p className="font-semibold mb-1">{formatDayLabel(day.date)}</p>
                    <p>
                      {day.adherence_pct !== null
                        ? `${day.adherence_pct}% adherence (${day.doses_taken}/${day.doses_scheduled} doses)`
                        : "No doses scheduled"}
                    </p>
                    <p>
                      Wellbeing: {day.wellbeing_score ? `${day.wellbeing_score}/5` : "Not logged"}
                    </p>
                    {day.note_excerpt && (
                      <p className="mt-1 italic text-[var(--fg-muted)]">"{day.note_excerpt}"</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {data?.pattern_note && (
        <p className="text-xs text-amber-400 mt-4 border-t border-[var(--border)] pt-3">
          ⓘ {data.pattern_note} This is an observation, not a diagnosis.
        </p>
      )}
    </div>
  );
}
```

---

# PART D — FIX PROMPT (Copy-Paste to Your Coding Agent)

```
Fix the "Adherence & Wellbeing Trend" card in the doctor patient-detail view. It is
currently rendering static/seeded data with a real bug: the wellbeing emoji are
garbled (e.g. "ðŸ™‚") due to a UTF-8/Latin-1 mojibake issue from hardcoding raw emoji
string literals somewhere in the component.

1. DELETE any hardcoded emoji string arrays used for the mood indicator
   (e.g. `["😢","🙁","😐","🙂","😄"][score-1]`). Replace with an icon-component
   mapping (lucide-react Frown/Meh/Smile/Laugh, color-coded, each with a proper
   aria-label) exactly as in the reference implementation below. This permanently
   fixes the encoding bug because it never stores emoji as a string that can be
   corrupted by an intermediate encoding step again.

2. DELETE any static/seeded 7-day array currently backing this card. Add the
   `GET /doctor/patient/{id}/adherence-wellbeing?days=N` endpoint (reference
   implementation provided) that computes adherence % from `intake_logs` and
   wellbeing score from `symptom_logs`, merges them by date server-side, and
   returns `null` (not a fake default) for any day with no data.

3. Rewire the frontend card to fetch that endpoint, keyed by `patientId` AND the
   selected window size, so switching patients or window size always triggers a
   fresh fetch with a loading skeleton — never leaves the previous patient's bars
   visible while new data loads.

4. Color-code each day's bar by threshold (≥85% green, 70–84% amber, <70% red) —
   do not render every bar as the same static green regardless of value.

5. Fix the tooltip so it shows that SPECIFIC day's real data (exact %, doses
   taken/scheduled, wellbeing score, and a short excerpt from that day's symptom
   note if one exists) — not one flat hardcoded string repeated for every bar.

6. Make the "7-DAY WINDOW" control an actual working selector (7/14/30 days) that
   re-fetches from the same endpoint with a different `days` param — if it's
   currently just a static pill with no interaction, wire it up or remove the
   dropdown-arrow affordance so it doesn't look clickable when it isn't.

7. Make each day clickable, navigating to that exact date in the patient's
   Timeline/Symptom Calendar tab (`/doctor/patient/{id}/timeline?date=YYYY-MM-DD`)
   so the chart is an entry point into the record, not a dead-end visualization.

8. Only surface the "pattern note" sentence when the backend's own threshold logic
   (2+ days where adherence <75% AND wellbeing <=2 in the current window) actually
   fires — never hardcode this sentence, and always keep the existing "this is an
   observation, not a diagnosis" framing in the UI copy. Do not let this evolve into
   a causal claim.

9. Verify: open a patient with genuinely no symptom logs in the window and confirm
   the card shows an honest empty/muted state per day (a "no log" icon, not a fake
   score) rather than defaulting to a fabricated 3/5 or similar placeholder value.
```


# Sanjeevani — Vault Archive: Prescriptions & Scans
### What Belongs Here + AI Features to Add

---

# PART A — WHAT "VAULT ARCHIVE" SHOULD CONTAIN OVERALL

The Vault is the patient's (and doctor's, via full-record) permanent, categorized document store. Per the multi-document model (doc 12), it should never be "one slot per category" — it's an ever-growing archive.

## A.1 Top-Level Categories

```
Vault Archive
├── 💊 Prescriptions           (every prescription ever written, any doctor)
├── 🧪 Lab Diagnostic Reports   (every test result, any lab)
├── 🦴 Imaging & Scans          (X-Ray, MRI, CT, Ultrasound)
├── 🏥 Hospital Discharges       (discharge summaries, admission notes)
├── 💉 Vaccinations             (immunization certificates)
├── 📋 Referral Letters          (doctor-to-doctor referrals)
└── 📁 Other Documents          (patient-uploaded, insurance docs, misc)
```

Each category is a **list, sorted newest-first**, filterable by date range and doctor, with a count badge (e.g. "Prescriptions (12)") — never a single overwritten record.

---

# PART B — WHAT GOES INSIDE ONE "PRESCRIPTION" ENTRY

This is the actual content model for a single prescription card in the vault.

## B.1 Header (always visible, collapsed state)

| Field | Example | Source |
|---|---|---|
| Prescribing doctor + specialty | Dr. V. K. Rai, Cardiology | `prescriptions.doctor_id` → `app_users` |
| Date issued | Aug 12, 2026 | `prescriptions.verified_at` |
| Status badge | Verified / Dispensed / Expired | `prescriptions.status` |
| Condition tag(s) | HEART CARE, DIABETES | `prescription_items.condition_tag` |
| Days remaining (if active) | 3 days left ⚠ | computed from `duration_days` (Feature #1) |
| Source clinic | Manikanta Neuro Centre | `app_users.clinic_name` |

## B.2 Expanded Detail (on tap)

1. **Original scanned image** — the raw prescription scan, zoomable, with OCR bounding-box overlay (existing Evidence Viewer).
2. **Structured medicine list** — for each medicine:
   - Name + dosage + frequency (e.g. "1-0-1") + duration
   - OCR confidence score (so a low-confidence field is visually flagged)
   - **Uses & Details** (expandable) — what it's for, side effects, precautions (Feature #6/medication_info)
   - **Cost estimate** — brand price, generic alternative if available (Feature #7)
3. **Doctor's patient-facing notes** — the plain-language note field, separate from clinical SOAP (doc 08 §PV-9).
4. **Regional language toggle** — re-render instructions/notes in the patient's chosen language (doc 08 §PV-7), with drug names/dosages always kept in original form.
5. **Allergy cross-check flag** — if any medicine on this prescription conflicts with a patient-declared allergy (Feature #5), show a small warning badge here too, not just at prescribing time.
6. **Refill status** (if applicable) — pending/approved/dispensed, with a direct [Request Refill] action if running low.
7. **Linked lab orders** — if this prescription was accompanied by a diagnostic order, cross-link to that lab report.
8. **Folder membership** — which Prescription Folder(s) this belongs to (e.g. "Diabetes Management"), with [Add to Folder].
9. **Verification metadata** (doctor/full-record view only) — protocol hash, `verified_at` timestamp, immutable audit trail reference — this is what makes the record medico-legally trustworthy, and should be visible to a doctor reviewing cross-doctor history even though a patient doesn't need to see the hash itself.
10. **Source flag** — `clinic_verified` vs `patient_uploaded` (doc 12 §B.1) — an uploaded external prescription must always show "Not clinically verified" until a doctor confirms it.

## B.3 What Goes Inside a "Scan" Entry (X-Ray/MRI/CT)

| Field | Notes |
|---|---|
| Scan type + body region | "Right Wrist — Digital X-Ray" |
| Ordering/reviewing doctor | who requested + who read it |
| AI detection results | e.g. "Fracture (92% confidence)" with bounding box overlay |
| Radiologist/doctor's written finding | plain text, e.g. "Non-displaced cortical hairline fissure" |
| Normal/Abnormal badge | quick-glance status |
| Linked prescription (if treatment followed) | e.g. the pain medication prescribed because of this finding |
| Comparison view (if repeat scan exists) | side-by-side with a prior scan of the same region/type |

---

# PART C — AI FEATURES FOR THIS SPECIFIC SECTION

These are scoped tightly to "Prescriptions & Scans," building only on infrastructure you already have (OCR, X-ray ONNX model, LLM pipeline, embeddings).

## C.1 AI Feature Matrix

| ID | Feature | What It Does | Reuses |
|---|---|---|---|
| VA-1 | **Auto-categorization on upload** | When any document is uploaded/scanned, AI classifies it into the right vault category (prescription vs. lab vs. scan vs. discharge) automatically instead of the user picking manually | Existing OCR + a lightweight classification prompt |
| VA-2 | **Duplicate/near-duplicate detection** | Flags if a newly uploaded prescription looks like a re-upload of one already in the vault (same doctor, same date range, similar medicines) — prevents clutter | Embedding similarity over extracted text |
| VA-3 | **Auto-linking related documents** | Automatically links a prescription to the lab order that prompted it, or a scan to the prescription that resulted from its finding, based on date proximity + doctor + condition tag match | Rule-based + LLM disambiguation for ambiguous cases |
| VA-4 | **"Explain This Scan" plain-language summary** | For X-ray/MRI entries, generates a 2-3 sentence plain-language explanation of the radiologist's finding (already partly spec'd as Feature #6) | Existing plain-language pipeline |
| VA-5 | **Prescription comparison across visits** | If a patient has multiple prescriptions for the same condition tag over time, AI generates a one-line diff: "Metformin dose increased from 500mg to 1000mg since March" | LLM summarization over structured `prescription_items` history |
| VA-6 | **Scan trend/comparison view** | For repeat imaging of the same body region, AI drafts a short comparison note: "Compared to the Jan 2026 MRI, no new findings; prior mild disc bulge appears stable" | Vision-capable LLM comparing two scan images + their written findings |
| VA-7 | **Smart Vault Search** | Natural-language search across the entire vault: "Show me all prescriptions for my back pain" or "When was my last chest X-ray?" — returns matching documents, not just keyword hits | Same RAG approach as full-record "Ask about this patient" (doc 15 AI-9), scoped to one patient's own vault |
| VA-8 | **OCR confidence-based review nudge** | If any field in a scanned prescription has OCR confidence below a threshold (e.g. 80%), proactively flag it for the doctor to double check at next sign-off, rather than silently trusting a low-confidence transcription | Existing OCR confidence scores, already computed but not surfaced as an action |
| VA-9 | **Expiry/relevance decay flagging** | Old prescriptions for resolved short-term conditions (e.g. a 5-day antibiotic course from 2 years ago) get a subtle "Archived — likely no longer relevant" tag so the vault doesn't visually clutter with irrelevant history, without ever deleting the record | Simple rule: `duration_days` elapsed + condition tag not in patient's current active tags |
| VA-10 | **Auto-generated visit summary from a bundle of documents** | If a patient uploads/receives a prescription + lab report + discharge summary from the same visit, AI drafts one combined visit summary card sitting above the three individual documents | LLM summarization across linked documents (VA-3's links feed this) |

## C.2 Implementation Notes (Keep It Safe)

- **VA-1, VA-2, VA-3, VA-9** are pure organization/UX — no clinical risk, safe to fully automate.
- **VA-4, VA-5, VA-6, VA-10** produce clinical-adjacent language — always show a "not medical advice, generated summary" caption, and for doctor-facing views, always link back to the original document rather than replacing it.
- **VA-8** must never auto-correct a low-confidence field itself — it only nudges a human to look, consistent with your existing rule that OCR is assistive, not authoritative.
- **VA-7** must never search into `patient_uploaded` (unverified) documents and present them with the same confidence as `clinic_verified` ones — always carry the verification badge through into search results.

## C.3 Suggested UI Addition — "AI Insights" Strip Above the Document List

```
┌─────────────────────────────────────────────────────┐
│  💊 Prescriptions (12)                    [🔍 Ask...]│
├─────────────────────────────────────────────────────┤
│  ✨ Metformin dose increased 500mg → 1000mg since    │
│     March 2026 (Dr. Patel)                            │
│  ✨ 2 prescriptions this month may be duplicates —     │
│     [Review]                                          │
├─────────────────────────────────────────────────────┤
│  [ Aug 12, 2026 — Dr. Rai — Gabapin NT ...      ]    │
│  [ Jul 2, 2026 — Dr. Sharma — Noveron ...        ]    │
│  ...                                                  │
└─────────────────────────────────────────────────────┘
```

---

# PART D — BUILD PROMPT

```
Add the following to the existing Vault Archive (patient_documents table from doc 12):

1. Confirm every field listed in Part B.1/B.2/B.3 above is actually returned by the
   vault list/detail endpoints — cross-check against `prescriptions`,
   `prescription_items`, `medications`, `medication_info`, `scans`, and
   `patient_documents`. Add any missing joins (e.g. cost estimate from Feature #7's
   reference data, allergy cross-check from Feature #5).

2. Implement VA-1 (auto-categorization) at upload time: when a new document hits the
   OCR/ingestion pipeline, run a classification prompt ("prescription | lab_report |
   xray_scan | discharge_summary | other") and set `patient_documents.category`
   automatically — still let the user recategorize manually if wrong.

3. Implement VA-3 (auto-linking) as a background job: for each new document, search
   for other documents from the same patient within +/- 3 days with matching
   condition_tag or doctor_id, and populate `linked_prescription_id` /
   `linked_lab_result_id` / `linked_diagnostic_order_id` on `patient_documents`
   accordingly.

4. Implement VA-7 (Smart Vault Search) as
   `POST /api/patient/{id}/vault/search-ai { query }`, scoped ONLY to that patient's
   own documents, always including each result's `source` (clinic_verified vs
   patient_uploaded) in the response so the frontend can badge it correctly.

5. Implement VA-5 (prescription comparison) as a computed insight shown only when 2+
   prescriptions share the same condition_tag for the same patient — never fabricate
   a comparison when there's only one data point.

6. Add the "AI Insights" strip (Part C.3) above the Prescriptions list, populated by
   whichever of VA-2/VA-5/VA-9 have something real to say for this patient right now
   — show nothing in that strip when there are no genuine insights, rather than
   filling it with generic filler text.
```








# Sanjeevani — Vault Archive: Lab Diagnostic Reports
### What Belongs Here + AI Features to Add

---

# PART A — WHAT GOES INSIDE ONE "LAB REPORT" ENTRY

## A.1 Header (always visible, collapsed state)

| Field | Example | Source |
|---|---|---|
| Test name | Complete Blood Count (CBC) | `diagnostic_orders.test_name` |
| Date collected / reported | Aug 12, 2026 | `lab_results.created_at` |
| Ordering doctor + specialty | Dr. Rai, Cardiology | `diagnostic_orders.doctor_id` |
| Lab / diagnostic center | Central Path Lab | `lab_results.lab_name` |
| Overall status badge | Normal / Abnormal / Critical | computed from flagged parameters |
| Source flag | Clinic-Verified / Patient-Uploaded | `patient_documents.source` (doc 12) |

## A.2 Expanded Detail (on tap)

1. **Original report file** — scanned/uploaded PDF or image, viewable full-screen.
2. **Structured biomarker table** — for each parameter:
   - Parameter name, result value, unit, reference range
   - Status badge per row: Low / Normal / High / Critical (color-coded, not just text)
   - Trend arrow if this same test exists from a prior date (↑↓→)
3. **Plain-language summary** — 2-3 sentence explanation of what the results mean overall, written for the patient (Feature #6), clearly separated from the raw table so a patient isn't left to interpret numbers alone.
4. **Doctor's review note** — "Reviewed by Dr. Rai — no action needed" / "Discuss at next visit" — distinct from the lab tech's raw data entry, this is the doctor's clinical read on the result.
5. **Linked prescription/order** — the `diagnostic_orders` row that requested this test, and if a prescription was written as a result of this report, a cross-link to it.
6. **Re-check reminder status** — if this test type has a recommended recheck interval (e.g. HbA1c every 3 months), show "Next recheck suggested: Nov 2026" with a [Set Reminder] action (Feature #4).
7. **Historical trend chart** — if 2+ instances of the same test exist, a simple line chart across all dates, not just this one snapshot (doc 12 §MD-6).
8. **Abnormal flag audit** — which specific parameters triggered the "Abnormal" badge, so the summary badge is always traceable to real numbers, never a vague label.

---

# PART B — AI FEATURES FOR LAB REPORTS

| ID | Feature | What It Does | Reuses |
|---|---|---|---|
| LR-1 | **Auto-flagging of abnormal values** | As soon as a lab tech enters raw values, AI compares each against the reference range and flags Low/High/Critical automatically — lab tech confirms, doesn't manually eyeball every row | Rule-based range check, already partly built (Feature #7 in doc 09) |
| LR-2 | **Plain-language summary draft** | Generates the patient-facing 2-3 sentence summary from the structured values, for the lab tech/doctor to review and approve before it's patient-visible | Existing plain-language pipeline |
| LR-3 | **Cross-report trend detection** | When a new result comes in for a test the patient has had before, AI automatically computes the trend ("HbA1c improving: 7.8% → 7.2% → 6.9% over 6 months") instead of a doctor manually comparing PDFs | Structured `lab_results` history, no new infra |
| LR-4 | **Critical-value escalation** | If any parameter comes back at a critical (not just abnormal) threshold, immediately notify the ordering doctor (not just wait for them to open the vault) — this is the one lab-report AI feature with real urgency, so it should push, not just passively flag | New: threshold check + existing notification pipeline |
| LR-5 | **Recheck interval suggestion** | Based on test type + result trend, AI suggests when the next recheck should happen (e.g. sooner than the default interval if a value is borderline) — doctor confirms before it becomes a patient reminder | LLM/rule hybrid over test-type reference data |
| LR-6 | **Duplicate/redundant test detection** | If a doctor is about to order a test the patient already had very recently (e.g. within the last week) with no clinical reason for repeat, flag it at order time — saves cost and patient inconvenience | Simple recency check against `diagnostic_orders`, surfaced at order-creation time |
| LR-7 | **Natural-language query over lab history** | "What was my cholesterol last year?" / doctor: "Show me all abnormal kidney function tests for this patient" — answers from the full lab history, not manual scrolling | Same RAG approach as vault search (doc 18 VA-7) |
| LR-8 | **Multi-parameter pattern insight (doctor-only, non-diagnostic)** | Flags when a combination of parameters together suggests something worth a doctor's attention (e.g. rising creatinine + declining eGFR trend) — framed strictly as "worth reviewing," never a diagnosis | LLM reasoning over structured trend data, doctor-facing only, logged as AI-suggested per doc 15's audit-trail rule |

## B.1 Safety Notes

- **LR-1, LR-3, LR-6** are safe to fully automate — pure data computation, no interpretation risk.
- **LR-2, LR-5, LR-8** must always be reviewed/approved by a lab tech or doctor before becoming visible to the patient or acted on — never auto-publish a generated summary or auto-schedule a recheck without human confirmation.
- **LR-4** is the one feature that should push proactively rather than wait to be viewed, because a critical value sitting unopened in a vault is a real safety gap — but it must never bypass the doctor to notify the patient directly with clinical interpretation; the doctor sees it first.
- **LR-8** is explicitly doctor-only, never patient-visible, and every instance must be logged with whether the doctor reviewed/dismissed it (same audit pattern as the Risk Forecast Card, doc 15 §A.3).

---

# PART C — SUGGESTED UI (Matches Existing Vault Style)

```
┌─────────────────────────────────────────────────────┐
│  🧪 Lab Diagnostic Reports (6)             [🔍 Ask...]│
├─────────────────────────────────────────────────────┤
│  ✨ HbA1c improving: 7.8% → 7.2% → 6.9% over 6 months │
│  🔴 Critical value flagged in Aug 12 report — Dr. Rai │
│     notified                                          │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐   │
│  │ 🧪 Complete Blood Count (CBC)      [Normal]    │   │
│  │ Aug 12, 2026 · Dr. Rai · Central Path Lab      │   │
│  │ ────────────────────────────────────────────   │   │
│  │ "Your blood count looks good. All values are    │   │
│  │  within normal range."                          │   │
│  │ Reviewed by Dr. Rai: "No action needed."         │   │
│  │ [View Full Report →]                            │   │
│  └───────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────┐   │
│  │ 🧪 HbA1c                        [High] ↓ trend │   │
│  │ Aug 12, 2026 · Dr. Patel                        │   │
│  │ Next recheck suggested: Nov 12, 2026            │   │
│  │ [View Trend Chart →] [Set Reminder]             │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

# PART D — BUILD PROMPT

```
Extend the Vault Archive's Lab Diagnostic Reports category with the fields and AI
features above:

1. Confirm the lab report detail view returns every field in Part A.1/A.2 — cross-
   check against `diagnostic_orders`, `lab_results`, and `patient_documents`. Add a
   `lab_results.reviewed_by_doctor_note` column if it doesn't exist, distinct from
   the lab tech's raw entry and the patient-facing plain-language summary.

2. Implement LR-1 (auto-flagging) at the point the lab tech saves raw values —
   compare each parameter against a reference-range table and set a per-parameter
   status before the lab tech ever sees the "Normal/Abnormal" preview, so they're
   confirming AI's flags, not doing the range-lookup manually.

3. Implement LR-4 (critical-value escalation) as a synchronous check on save: if any
   parameter crosses a "critical" (not just "abnormal") threshold, immediately fire a
   notification to the ordering doctor through the existing alert/notification
   pipeline — do not let this wait for a nightly batch job like the other AI features
   in this system; a critical lab value is time-sensitive.

4. Implement LR-3 (trend detection) as part of the same full-record / lab-trends
   endpoint already spec'd in doc 12 §B.3 — this is not new infrastructure, just
   ensure the Lab Reports vault category surfaces the same trend data inline, not
   only in the doctor's full-record screen.

5. Implement LR-6 (duplicate test detection) at the moment a doctor creates a new
   `diagnostic_orders` row — check for the same `test_name` for the same patient
   within the last N days (configurable, default 7) and show a soft warning
   ("Patient had this test 3 days ago — order again?") that the doctor can dismiss
   and proceed past, never a hard block.

6. Gate LR-2, LR-5, and LR-8 behind an explicit human-review step before anything
   reaches the patient: LR-2's draft summary and LR-5's suggested recheck date must
   sit in a "pending review" state until a lab tech/doctor approves them; LR-8's
   pattern insight is doctor-only and must never be patient-visible at all, logged
   with `doctor_action` exactly like the Risk Forecast Card in doc 15.
```






# Sanjeevani — Dosing & Reminders Calendar
### Bug Diagnosis + Full Spec + AI Features + Working Code + Fix Prompt

**Screen:** Patient PWA, `/patient/calendar` — "09 // Care Schedule Calendar"

---

# PART A — WHAT'S WRONG (Diagnosis From the Screenshot)

## A.1 The "Today" Indicator Is Stale/Hardcoded

The black filled circle marking "today" sits on **August 14**, but the "Selected Day" panel on the right — and the actual system date — is **August 22, 2026**. This is the same class of bug as the adherence widget and the doctor dashboard: a hardcoded "today" value baked in during development (Aug 14 was very likely the actual date this screen was being built) that never gets recomputed from `new Date()` / the server clock. It's a dead giveaway the calendar's "current day" highlight is a static prop, not `today.getDate()`.

## A.2 No Dose Indicators on Any Day Cell

Every day cell in the grid is blank — no dot, no color, no count badge — even on days that almost certainly have scheduled doses (this patient has active prescriptions elsewhere in the app, per every other screenshot you've shared). A calendar that can't show "this day has 3 doses, 2 taken" at a glance is not doing the one job a dosing calendar exists to do: let a patient (or caregiver) see their month's compliance shape in one look, per doc 08 §PV-10 / §6.4's spec.

## A.3 Selected Day Panel Is Empty ("0/0 Taken", "Scheduled Doses (0)")

August 22 shows **zero** scheduled doses. Either:
- The calendar isn't querying `intake_logs`/`patient_dosing_timeline` at all for this month (most likely, given #A.2 is also blank everywhere), or
- It's querying but filtering on the wrong date format/timezone (a common bug: comparing a `date` column to a `datetime` string incorrectly, silently returning zero rows).

## A.4 Reminders Are Invisible on the Calendar

Per doc 08 §5.4 / §6.4, the calendar is supposed to overlay **both** doses and staff-sent reminders on the same grid (a day with a doctor's "come in Friday" reminder should show a bell indicator alongside the dose dots). Right now there's no reminder indicator anywhere — either the overlay was never built, or the `patient_reminders` join was never added to whatever endpoint (if any) backs this screen.

## A.5 No Legend / No Empty-vs-No-Data Distinction

Even if today genuinely has zero doses, the UI can't currently tell the difference between "no prescriptions active" and "data failed to load" — both render as the same blank grid. That's a debugging and trust problem: a patient staring at an empty calendar has no way to know if that's real or broken.

---

# PART B — FULL FEATURE SPEC (What This Screen Should Actually Do)

## B.1 Day Cell — What It Should Render

| State | Visual |
|---|---|
| Has doses, all taken | Small filled green dot(s), count badge if >1 |
| Has doses, some pending | Outlined/half-filled dot, amber |
| Has doses, some missed (past due, not taken) | Red dot |
| Has a reminder (staff-sent or system) | Small bell icon, distinct from dose dots |
| No scheduled activity | Fully blank (this is the ONLY case that should look like today's screenshot) |
| Today | A ring/border around the date number (computed from real date, never hardcoded) |
| Selected | Filled background (already works correctly in the screenshot) |

## B.2 Selected Day Panel — What It Should Render

```
SELECTED DAY
August 22, 2026                          [2 / 3 TAKEN]

SCHEDULED DOSES (3)
┌─────────────────────────────────────┐
│ 08:00 AM  Noveron 500mg    ✓ Taken   │
│           Dr. Sharma · marked by you  │
├─────────────────────────────────────┤
│ 02:00 PM  Gabapin NT 100mg  ✓ Taken   │
│           Dr. Rai · marked by Priya   │
│           (caregiver)                 │
├─────────────────────────────────────┤
│ 08:00 PM  Metformin 500mg   ○ Pending │
│           Dr. Patel        [Mark Taken]│
└─────────────────────────────────────┘

REMINDERS (1)
┌─────────────────────────────────────┐
│ 🔔 Follow-up with Dr. Rai              │
│    Sent by Dr. Rai · "Please come in  │
│    Friday for a quick check"           │
└─────────────────────────────────────┘
```

## B.3 Month Navigation

Clicking `<` / `>` must trigger a fresh fetch for the new month (not slice a client-side cached array that only ever held one month), with a loading state on the grid while it loads — same pattern as every other "switch context → refetch" fix already applied elsewhere in this app.

## B.4 Empty vs. Error States (Must Be Distinguishable)

- **Genuinely no data this month** → "No doses or reminders scheduled this month." (calm, not alarming)
- **Fetch failed** → a visible retry affordance ("Couldn't load your calendar. [Retry]"), never a silently blank grid indistinguishable from "nothing scheduled."

---

# PART C — AI FEATURES FOR THE CALENDAR

| ID | Feature | What It Does | Reuses |
|---|---|---|---|
| CAL-1 | **Smart reminder-time suggestion** | Analyzes which times of day a patient most reliably marks doses taken vs. misses, and suggests shifting a dose's reminder time closer to their actual habit (e.g. "You usually take your evening dose around 9 PM, not 8 PM — shift the reminder?") | Pattern over `intake_logs.marked_at` timestamps, no new infra |
| CAL-2 | **Month-at-a-glance adherence heatmap summary** | One line above the grid: "This month: 82% adherence, your best week was Aug 10–16" — computed, not decorative | Same data already powering the day dots |
| CAL-3 | **Travel/schedule-aware reminder shift** | If a patient marks upcoming days as "traveling" (simple toggle), AI suggests adjusted reminder times for a different timezone or shifted routine, rather than silently sending reminders at the wrong local hour | Existing reminder infra + a new lightweight travel-mode flag |
| CAL-4 | **Natural-language calendar query** | "When do I take my evening pills?" or "What did I miss last week?" answered directly instead of scrolling the grid | Same RAG/search pattern as vault search (doc 18 VA-7), scoped to this patient's own schedule |
| CAL-5 | **Predictive missed-dose risk day** | Based on historical pattern (e.g. patient reliably misses Sunday evening doses), proactively surface "You've missed this dose the last 3 Sundays — want an extra reminder this week?" before it happens, not just react after | Pattern detection over `intake_logs`, feeds into existing Smart Reminders (Feature #4) rather than replacing it |

## Safety Note
All five are informational/UX conveniences, not diagnostic — CAL-5 in particular must stay framed as "here's a pattern," never "you will definitely miss this," and any suggested reminder-time change must require the patient's explicit confirmation before it's applied (never silently reschedule someone's reminders).

---

# PART D — WORKING CODE

## D.1 Backend — Month Calendar Endpoint

```python
# scaffold/backend/app/routers/patient.py

from datetime import date
import calendar as pycalendar
from fastapi import APIRouter, Query

@router.get("/patient/{patient_id}/calendar")
async def get_patient_calendar(patient_id: str, year: int = Query(...), month: int = Query(..., ge=1, le=12)):
    """
    Returns every day in the given month with dose + reminder counts,
    plus full detail for use when a day is selected client-side.
    Never returns a fake/empty result silently on error — raises so the
    frontend can show a real error state instead of a blank grid.
    """
    sb = get_supabase()

    _, days_in_month = pycalendar.monthrange(year, month)
    start = date(year, month, 1).isoformat()
    end = date(year, month, days_in_month).isoformat()

    intake_res = (
        sb.table("intake_logs")
        .select("*, prescription_items(medications(name), dosage), marked_by_role, marked_by_id")
        .eq("patient_id", patient_id)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .execute()
    )

    reminder_res = (
        sb.table("patient_reminders")
        .select("*")
        .eq("patient_id", patient_id)
        .gte("remind_at", start)
        .lte("remind_at", end)
        .execute()
    )

    days: dict[str, dict] = {}
    for log in intake_res.data:
        day = log["scheduled_at"][:10]
        bucket = days.setdefault(day, {"doses": [], "reminders": []})
        bucket["doses"].append(log)

    for rem in reminder_res.data:
        day = rem["remind_at"][:10]
        bucket = days.setdefault(day, {"doses": [], "reminders": []})
        bucket["reminders"].append(rem)

    calendar_days = []
    for d in range(1, days_in_month + 1):
        iso_day = date(year, month, d).isoformat()
        bucket = days.get(iso_day, {"doses": [], "reminders": []})
        taken = sum(1 for x in bucket["doses"] if x.get("taken"))
        total = len(bucket["doses"])
        calendar_days.append({
            "date": iso_day,
            "dose_count": total,
            "doses_taken": taken,
            "has_missed": any(
                (not x.get("taken")) and x["scheduled_at"] < date.today().isoformat()
                for x in bucket["doses"]
            ),
            "reminder_count": len(bucket["reminders"]),
        })

    return {"year": year, "month": month, "days": calendar_days}


@router.get("/patient/{patient_id}/calendar/day/{day}")
async def get_patient_calendar_day(patient_id: str, day: str):
    """Full detail for one selected day — doses + reminders with names/times."""
    sb = get_supabase()

    doses = (
        sb.table("intake_logs")
        .select("*, prescription_items(medications(name), dosage, frequency), marked_by_role, marked_by_id")
        .eq("patient_id", patient_id)
        .gte("scheduled_at", f"{day}T00:00:00")
        .lte("scheduled_at", f"{day}T23:59:59")
        .execute()
    ).data

    reminders = (
        sb.table("patient_reminders")
        .select("*")
        .eq("patient_id", patient_id)
        .gte("remind_at", f"{day}T00:00:00")
        .lte("remind_at", f"{day}T23:59:59")
        .execute()
    ).data

    return {"date": day, "doses": doses, "reminders": reminders}
```

## D.2 Frontend — Fixed Calendar Component (Real "Today", Real Data, Real Loading/Error States)

```tsx
// scaffold/frontend/apps/patient/src/app/calendar/page.tsx

"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const PATIENT_ID = "..."; // from AuthContext, never hardcoded

type CalendarDay = {
  date: string;
  dose_count: number;
  doses_taken: number;
  has_missed: boolean;
  reminder_count: number;
};

export default function CalendarPage() {
  const today = new Date(); // ← the ONLY source of "today", always live
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [dayDetail, setDayDetail] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/patient/${PATIENT_ID}/calendar?year=${year}&month=${month}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => setDays(d.days))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    fetch(`${API_BASE}/patient/${PATIENT_ID}/calendar/day/${selectedDate}`)
      .then((r) => r.json())
      .then(setDayDetail)
      .catch(() => setDayDetail(null));
  }, [selectedDate]);

  const isToday = (dateStr: string) =>
    dateStr === today.toISOString().slice(0, 10); // computed live, never hardcoded

  const dotColor = (day: CalendarDay) => {
    if (day.dose_count === 0) return null;
    if (day.has_missed) return "bg-red-500";
    if (day.doses_taken === day.dose_count) return "bg-emerald-500";
    return "bg-amber-500";
  };

  return (
    <div>
      {/* month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth((m) => (m === 1 ? (setYear(year - 1), 12) : m - 1))}>‹</button>
        <h2>{new Date(year, month - 1).toLocaleString(undefined, { month: "long", year: "numeric" })}</h2>
        <button onClick={() => setMonth((m) => (m === 12 ? (setYear(year + 1), 1) : m + 1))}>›</button>
      </div>

      {loading && <div className="grid grid-cols-7 gap-2">{Array.from({length: 35}).map((_,i)=><div key={i} className="h-20 bg-[var(--bg-muted)] animate-pulse" />)}</div>}

      {error && (
        <div className="text-center py-8 text-red-500">
          Couldn't load your calendar.{" "}
          <button onClick={() => setMonth(month)} className="underline">Retry</button>
        </div>
      )}

      {!loading && !error && days && (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`h-20 border p-2 text-left relative ${
                day.date === selectedDate ? "bg-[var(--bg-muted)]" : ""
              } ${isToday(day.date) ? "border-2 border-[var(--fg)]" : "border-[var(--border)]"}`}
            >
              <span className="font-semibold">{Number(day.date.slice(-2))}</span>
              <div className="absolute bottom-2 left-2 flex gap-1">
                {dotColor(day) && <span className={`w-2 h-2 rounded-full ${dotColor(day)}`} />}
                {day.reminder_count > 0 && <span className="text-xs">🔔</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* selected day panel */}
      <aside>
        <h3>{selectedDate}</h3>
        {dayDetail?.doses?.length === 0 && dayDetail?.reminders?.length === 0 ? (
          <p className="text-[var(--fg-muted)]">No doses or reminders scheduled this day.</p>
        ) : (
          <>
            {dayDetail?.doses?.map((d: any) => (
              <div key={d.id}>
                {d.scheduled_at.slice(11, 16)} — {d.prescription_items?.medications?.name}{" "}
                {d.taken ? "✓ Taken" : "○ Pending"}
                {d.marked_by_role === "caregiver" && " (marked by caregiver)"}
              </div>
            ))}
            {dayDetail?.reminders?.map((r: any) => (
              <div key={r.id}>🔔 {r.title} — {r.message}</div>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
```

---

# PART E — FIX PROMPT (Copy-Paste to Your Coding Agent)

```
Fix the Dosing & Reminders Calendar screen (/patient/calendar). It currently shows an
empty grid with no dose/reminder indicators on any day, and the "today" highlight is
stuck on a hardcoded date (Aug 14) instead of the real current date.

1. DELETE any hardcoded "today" date constant. The highlighted "today" cell must be
   computed from `new Date()` (or the server's date) on every render, never a fixed
   string — verify by checking the app on two different days and confirming the
   highlight moves.

2. Build/fix `GET /patient/{id}/calendar?year=&month=` to return real per-day dose
   and reminder counts by querying `intake_logs` and `patient_reminders` for the
   requested month (reference implementation provided). Confirm the date-range
   comparison uses consistent types (don't compare a `date` column against a
   `datetime` string, or a timezone-naive value against an aware one — this is the
   most likely reason the grid is currently blank even for a patient with known
   active prescriptions).

3. Render dose indicator dots on every day cell per the color rules in Part B.1
   (green = all taken, amber = pending, red = missed) and a small bell icon for any
   day with a reminder — do not leave day cells visually blank when they have real
   scheduled activity.

4. Build/fix `GET /patient/{id}/calendar/day/{date}` and wire the "Selected Day"
   panel to it, showing each dose's time/medicine/status/marked-by, and each
   reminder's title/sender, exactly as in Part B.2 — replace whatever is currently
   producing the empty "Scheduled Doses (0)" state for a day that should have real
   doses.

5. Fix month navigation (`<` / `>`) to trigger a real refetch for the new month with
   a loading skeleton, not a client-side slice of one cached month's data.

6. Add a real error state, distinguishable from "genuinely nothing scheduled" —
   never let a failed fetch render identically to an honest empty day.

7. Verify: pick a day known to have 3 scheduled doses for this patient (cross-check
   against the Dashboard's daily timeline, which already works) and confirm the
   calendar shows the same 3 doses for that date — the calendar and the dashboard
   must never disagree about what's scheduled on a given day, since they're supposed
   to be two views over the same underlying `intake_logs` data.
```