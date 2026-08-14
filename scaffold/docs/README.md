# Sanjeevani — AI Prescription & Medical Document Intelligence Platform

> **Project Progress & Development Summary**

---

## 🌟 Executive Summary

**Sanjeevani** is an AI-powered healthcare intelligence platform designed to transform physical paper prescriptions, diagnostic lab reports, X-Rays, MRI scans, and hospital discharge summaries into clear, structured, digital medical records. 

Through a multi-stage hybrid extraction engine (**Tesseract LSTM OCR + Google Gemma 4 31B / NVIDIA Llama-3.1 70B Vision & Text AI**), Sanjeevani parses doctor handwriting, normalizes complex drug regimens (dosages, frequencies, durations, and clinical condition tags), extracts lab biomarker parameters, and seamlessly archives records into a categorized **Patient Vault** and **Daily Care Timeline**.

---

## 🚀 Key Features Implemented & Progress Made

### 1. Hybrid OCR & Gemma AI Clinical Extraction Engine
* **Tesseract LSTM + Image Preprocessing:** Local OpenCV/PIL grayscale and contrast enhancement pipeline (`run_ocr_on_bytes`) that processes physical prescription images and report scans.
* **Google Gemma 4 31B & NVIDIA 70B Normalization:** Raw OCR text is passed to LLM clinical prompts to convert unstructured text into standardized JSON schemas containing:
  * Clinic / Hospital Title (e.g. `MANIKANTA NEURO CENTRE`, `Yogana Hospital`, `RKP Multispeciality`).
  * Prescribing Doctor / Staff Physician (`Dr. G. Mithun`, `Attending Physician`).
  * Full Medications Array (complete extraction of all 5 prescribed drugs with dose, schedule, and duration).
  * Clinical Notes & Patient Details (`LBA with radicular pain`, `Tingling & Numbness`, `Bed rest advice`).
* **Handwritten Doctor Rules Parser (`parse_prescription_text_rules`):**
  * Robust regex matching for drug names (`Tab. Edushine MX 6`, `Tab. M-ped 16mg`, `Tab. Gabapin NT 100mg`, `Tab. Benforce CD`, `Tab. Rebote`).
  * Intelligent separation of symptom/diagnosis lines from drug lists.
  * Auto-generation of safety warnings, side effects, and precautions for digital prescription creation.

---

### 2. Universal Document & Report Intelligence Hub (`/scan-otc`)
* **Category-Wise Document Selection:**
  * 🧪 **Lab & Pathology Reports** (CBC, Lipid Panel, Metabolic Profiles, Blood Sugar)
  * 🦴 **Imaging & Scans** (X-Rays, MRI, CT Scans, Ultrasounds, Sonography)
  * 💊 **Prescriptions & Rx Sheets** (Doctor Prescriptions, OTC Medication Sheets)
  * 🏥 **Hospital Discharge Summaries** (Inpatient Records, Consultation Notes)
  * 💉 **Vaccinations & Immunity** (Immunization Certificates, Vaccine Charts)
* **Dual Intake Options:**
  * **Option A:** Upload Physical File, Scan Image, or PDF Report (Drag-and-Drop / Native File Picker).
  * **Option B:** Live Camera Scanner (Viewfinder with flash/toggle and snapshot capture).
* **Structured AI Clinical Summary & Parameter Cards:**
  * Executive plain-language clinical summary.
  * **Biomarker Parameters Table** (Parameter Name, Value, Reference Range, Status Badge: `Low`, `Normal`, `High`).
  * **Radiology Observations Table** (Anatomical Region, Findings details).
  * Physician Recommendations & Next Steps.

---

### 3. Patient Vault & Category Archive (`/vault`, `/vault/[category]`)
* **Categorized Storage:** Documents saved from the Intelligence Hub automatically land in designated vault categories (`lab-reports`, `x-rays`, `prescriptions`, `other`).
* **Interactive Digital Prescription Detail View:**
  * Interactive expandable cards for each medicine showing primary purpose, common side effects, and food timing precautions.
  * Multi-language support (Hindi, Telugu, Tamil, Kannada, Marathi, Spanish) with safety preservation of exact drug names and numeric dosages.
  * Verification status toggling and doctor sign-off simulation.
* **Seeded Initial Clinical Records:** Pre-seeded with CBC pathology lab reports and Lumbar Spine MRI radiology scans so the vault is instantly populated upon initialization.

---

### 4. Robustness, Frontend Error Boundaries & Hydration Fixes
* **Next.js App Router Error Boundaries (`error.tsx`):**
  * Created `error.tsx` and `global-error.tsx` across route segments (`src/app/`, `src/app/vault/`, `src/app/vault/[category]/`, `src/app/vault/prescription/[id]/`) to prevent `missing required error components, refreshing...` Next.js loops.
* **React Hydration Mismatch Fixes:**
  * Added `isMounted` SSR guards to `<video>` elements in `scan-otc/page.tsx` so camera viewfinders render cleanly without hydration errors.
* **Defensive Rendering Guards:**
  * Added fallback array checks (`Array.isArray(doc.sideEffects)`) and string-or-object type guards (`typeof b === "string" ? b : b.parameter`) for all biomarker tables and medicine lists to ensure the UI never crashes or turns blank.
* **Fallback Record Loading:**
  * Added fallback prescription objects so direct link access to dynamic digital prescriptions (`/vault/prescription/rx-digitized-...`) always loads gracefully.

---

### 5. Simplified 1-Click Startup System
* **1-Click Batch Launcher (`start.bat`):** Double-clicking `start.bat` in the root folder launches the Python FastAPI backend and Next.js Patient App, automatically opening `http://localhost:3000` in the browser.
* **Root `package.json` Integration:** Running `npm run dev` or `npm start` directly from the project root or from `scaffold/frontend` now executes the entire platform smoothly.

---

## 🛠️ Tech Stack Architecture

| Layer | Technologies Used |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TailwindCSS, Lucide Icons, Glassmorphism Design System |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| **OCR & AI Vision** | Pytesseract (LSTM Neural OEM 1 PSM 6), PIL / OpenCV Image Preprocessing, Pen-to-Print API |
| **LLM Clinical Engines** | Google Gemma 4 31B (`google/gemma-4-31b-it:free`), NVIDIA NIM Llama-3.1 70B Instruct |
| **Database & Services** | In-Memory Patient Service (`patient_service.py`) with Supabase schema compatibility |

---

## ⚡ How to Run the Application

### Option A: 1-Click Launcher (Recommended)
Double-click **`start.bat`** in the project root directory.

### Option B: Terminal Command
Run the following command from the root directory:
```bash
npm run dev
```

### Server Endpoints & Services:
* **Patient App Portal:** `http://localhost:3000`
* **Universal Scanner Hub:** `http://localhost:3000/scan-otc`
* **Patient Vault:** `http://localhost:3000/vault`
* **Python FastAPI Backend:** `http://localhost:8000`
* **API Documentation:** `http://localhost:8000/docs`

---

## 📝 Recent Commits & Changes Log Summary

* **Copilot & OCR Backend (`copilot.py` & `patient_service.py`):**
  * Added `/api/patient/analyze-document` and `/api/patient/save-document-to-vault` endpoints.
  * Added category-specific LLM prompts for lab reports, radiology imaging, hospital discharge, and vaccinations.
  * Added drug normalization rules for `Edushine MX 6`, `M-ped 16mg`, `Gabapin NT 100mg`, `Benforce CD`, and `Rebote`.
* **Universal Scanner Page (`scan-otc/page.tsx`):**
  * Built category selector pill bar (`prescriptions`, `lab_reports`, `imaging_scans`, `discharge_summaries`, `vaccinations`).
  * Designed dual-tile intake interface (Upload File / PDF dropzone + Live Camera Viewfinder).
  * Added AI Executive Summary Card, Biomarker Parameter Table, Radiology Findings Table, and Save to Vault button.
  * Implemented defensive type guards for biomarkers and findings maps to prevent blank screens.
* **Vault Pages (`vault/page.tsx`, `vault/[category]/page.tsx`, `vault/prescription/[id]/page.tsx`):**
  * Aligned category filters (`lab-reports`, `x-rays`, `prescriptions`, `other`).
  * Fixed patient ID fallback (`user?.id || "demo-patient"`) to eliminate 404 URL errors.
  * Added `error.tsx` components to handle route exceptions gracefully.
