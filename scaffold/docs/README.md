# Sanjeevani — Complete Documentation & Ecosystem Guide

> **Sanjeevani: AI Prescription & Multi-Document Clinical Intelligence Platform**  
> *Transforming physical medical documents, handwritten prescriptions, radiology films, and pathology reports into structured, verified, and life-saving digital healthcare records.*

---

## 📋 Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Ecosystem Architecture & Portals](#2-ecosystem-architecture--portals)
3. [Core AI/ML Pipelines & Models](#3-core-aiml-pipelines--models)
4. [The 8 Patient Adherence Ecosystem Features](#4-the-8-patient-adherence-ecosystem-features)
5. [Multi-Document Store & Doctor Full Record Access (Spec 12)](#5-multi-document-store--doctor-full-record-access-spec-12)
6. [Documentation Index & Specifications Sitemap](#6-documentation-index--specifications-sitemap)
7. [Getting Started & Local Development](#7-getting-started--local-development)
8. [Database Schema & Migrations](#8-database-schema--migrations)

---

## 1. Executive Overview

**Sanjeevani** is an enterprise-grade multi-role healthcare platform that eliminates medical transcription errors, prevents dangerous adverse drug-drug interactions, and empowers patients and caregivers with actionable, plain-language health records.

### Key Pillars:
- **Zero-Error Prescription Digitization:** Multi-engine OCR (Tesseract LSTM + Google Gemma 4 31B / NVIDIA Llama 3.1 70B Vision-Text AI) converts complex doctor handwriting into validated medication entities.
- **Active Clinical Safety Guardrails:** Instant server-side cross-checks for drug contraindications, duplicate active prescriptions, and patient allergies before sign-off.
- **Immutable Protocol Ledger:** Cryptographic `SHA-256` hashing and append-only verification logs ensure non-repudiation.
- **Universal Health Passport (QR):** Time-limited, patient-authorized QR codes granting any physician read-only access to consolidated medical histories.
- **Multi-Document Universal Vault:** Unlimited longitudinal archiving of lab reports, MRI/CT scans, discharge summaries, and vaccine charts with trend charts across repeated visits.

---

## 2. Ecosystem Architecture & Portals

Sanjeevani operates as a monorepo containing 5 distinct frontends, a shared UI token package, and a centralized Python FastAPI backend powered by Supabase PostgreSQL.

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  SANJEEVANI MONOREPO                   │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
         ┌───────────────────┬────────────────────┬───────────┴───────────┬────────────────────┬───────────────────┐
         ▼                   ▼                    ▼                       ▼                    ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ RECEPTION DESK  │ │ PHYSICIAN WORK  │ │   PATIENT PWA     │ │  PHARMACY DESK  │ │    LAB WORK     │ │  SHARED UI KIT  │
│   (Vite + TS)   │ │   (Vite + TS)   │ │   (Next.js 14)    │ │   (Vite + TS)   │ │   (Vite + TS)   │ │ (@sanjeevani/ui)│
│  Port: 5173     │ │  Port: 5174     │ │   Port: 3000      │ │  Port: 5175     │ │  Port: 5176     │ │ Tokens & Badges │
└────────┬────────┘ └────────┬────────┘ └─────────┬─────────┘ └────────┬────────┘ └────────┬────────┘ └─────────────────┘
         │                   │                    │                    │                   │
         └───────────────────┴───────────┬────────┴────────────────────┴───────────────────┘
                                         │  REST APIs & Real-time WebSockets
                                         ▼
                        ┌─────────────────────────────────┐
                        │      FASTAPI CORE BACKEND       │
                        │    (Python 3.10+ / Port 8000)   │
                        │  • Guardrail Engine             │
                        │  • OCR / AI Normalization       │
                        │  • YOLOv7 Fracture Model        │
                        │  • Full Patient Record Engine   │
                        └────────────────┬────────────────┘
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │     SUPABASE POSTGRESQL 15      │
                        │  • Row Level Security (RLS)     │
                        │  • Realtime Triggers & Auth     │
                        │  • Storage Bucket for Scans     │
                        └─────────────────────────────────┘
```

### The 5 Portals at a Glance:

| Portal | Tech Stack | Default Port | Primary Target Users | Key Capabilities |
|---|---|---|---|---|
| **Reception** | Vite + React + TS | `5173` | Receptionists, Triage Staff | Patient registration, NLP triage scoring, Scan ingestion, Live queue tokens |
| **Doctor** | Vite + React + TS | `5174` | Physicians, Specialists | Acuity queue, OCR split-verification, Guardrail engine, X-Ray canvas, Full Record |
| **Patient** | Next.js 14 (App Router) | `3000` | Patients, Family Caregivers | Dosing checklist, Universal QR Passport, 8 Adherence tools, Vault, Guarded Copilot |
| **Pharmacy** | Vite + React + TS | `5175` | Pharmacists, Dispensers | Live verified prescription feed, Safety lock badges, Dispense log, Inventory |
| **Laboratory** | Vite + React + TS | `5176` | Lab Technicians, Pathologists| Test requisition kanban, Biomarker input, Dual clinical/patient report translation |

---

## 3. Core AI/ML Pipelines & Models

| Capability | Model / Engine | Purpose & Implementation |
|---|---|---|
| **Prescription Handwriting OCR** | Tesseract LSTM (PSM 6, OEM 1) + Preprocessing | Grayscale adaptive thresholding binarizes physical prescription slips before character extraction. |
| **Clinical Entity Normalization** | Google Gemma 4 31B / NVIDIA Llama 3.1 70B | Converts raw noisy text into validated JSON schemas (drug name, dosage, frequency, duration, condition tags). |
| **Radiology Fracture Detection** | YOLOv7-p6 Bone Fracture (ONNX) | Real-time edge inference returning bounding boxes, confidence scores, and abnormality tags over X-Rays. |
| **Ambient Clinical Dictation** | OpenAI Whisper + Prompted LLM | Transcribes physician consultations and formats structured SOAP (Subjective, Objective, Assessment, Plan) notes. |
| **Acuity Triage Classification** | NLP Keyword & Semantic Classifier | Evaluates incoming complaints and automatically prioritizes urgent/critical patients to the front of the doctor's queue. |
| **Guarded AI Copilot** | BAAI bge-m3 + ChromaDB + Strict Prompting | Context-constrained patient Q&A strictly grounded in verified prescriptions with a hard no-diagnosis policy. |

---

## 4. The 8 Patient Adherence Ecosystem Features

Built into the Next.js Patient Portal (`/patient`), these 8 features address the primary causes of treatment drop-off:

1. **Refill Intelligence:** Real-time pill counter, auto-calculated supply duration, low-stock warnings, and 1-tap refill requests.
2. **Symptom Journal:** Daily wellness check-ins (feeling score 1–5, energy, sleep, mood) with automated doctor alerts on negative streaks.
3. **Caregiver Access:** Secure delegation enabling family members or nurses to view routines and mark administered doses.
4. **Smart Multichannel Reminders:** Automated medication schedules dispatched via in-app banners, WhatsApp, and SMS with snooze controls.
5. **Allergy & Interaction Profile:** Patient-reported and physician-confirmed allergy directory tied directly to prescription safety checks.
6. **Plain-Language Report Explanations:** Biomarker tables with status indicators (`Normal`, `High`, `Low`) and 2-sentence clinical summaries.
7. **Cost Awareness & Generic Analyzer:** Itemized pricing breakdown highlighting potential savings from bioequivalent generic medications.
8. **Clinical Visit Preparation:** Automated 1-page summary consolidating recent symptoms, missed doses, and patient questions for doctor visits.

---

## 5. Multi-Document Store & Doctor Full Record Access (Spec 12)

Spec 12 extends the platform beyond single-visit workflows into a **lifetime medical record archive**:

- **Unified `patient_documents` Index:** A versioned, categorized table supporting unlimited lab reports, X-Rays, MRI/CT scans, discharge summaries, and vaccine certificates.
- **Patient Self-Upload Rule:** Patients can upload outside medical documents to their Vault. These are automatically tagged `source: patient_uploaded` and display a clear warning badge (`⚠ Not clinically verified`) until reviewed and certified by a physician.
- **Doctor Full Patient Record Endpoint (`GET /api/doctor/patient/{id}/full-record`):** Single call returning a patient's cross-doctor prescription timeline, all versioned documents, and longitudinal biomarker trends (e.g. HbA1c trajectory across multiple visits).
- **Document Access Audit Trail (`document_access_log`):** Transparently records every physician document access for compliance and accountability.

---

## 6. Documentation Index & Specifications Sitemap

All project specifications and architecture documents are organized in `docs/` and `docs/files/`:

```
scaffold/docs/
├── 01_PRD.md                                    # Master Product Requirement Document (v2.0)
├── 02_ARCHITECTURE.md                           # System Architecture & Component Interactions
├── 03_DATABASE_SCHEMA.md                        # Database Schema & Entity Relationships
├── 04_API_SPEC.md                               # OpenAPI / REST Endpoint Specifications
├── 05_DESIGN_SYSTEM.md                          # Design Tokens, Theming & Component Guidelines
├── README.md                                    # This master documentation index
└── files/
    ├── README_COMPLETE_ECOSYSTEM.md             # Complete Ecosystem Architecture & Master Roadmap
    ├── 06_PATIENT_ROLE_COMPLETE_SPEC.md         # Patient Portal Base Specification
    ├── 07_DOCTOR_ROLE_COMPLETE_SPEC.md          # Doctor Portal Base Specification
    ├── 09_PATIENT_ADHERENCE_ECOSYSTEM_8FEATURES.md # 8 Patient Adherence Features Deep-Dive
    ├── 10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md # Doctor Portal v2 Production Specification
    ├── 11_UNIFIED_AUTH_AND_8FEATURE_UI_COMPLETE.md# Unified Auth, RBAC & UI Screen Guidelines
    └── 12_MULTI_DOCUMENT_DOCTOR_ACCESS_ADDENDUM.md# Multi-Document Store & Full Record Specification
```

---

## 7. Getting Started & Local Development

### Prerequisites:
- **Node.js:** v18.0.0+ (v22+ recommended)
- **Python:** v3.10+
- **Package Manager:** `npm` v10+

### Option A: 1-Click Launch (Windows)
Double-click **`run-all.bat`** (or `run-all.ps1` in PowerShell) in the root directory. This launches the FastAPI backend and all 5 frontend workspaces concurrently.

### Option B: Terminal Command
From the root directory:
```bash
npm run dev
```

### Active Local Services:
- 🏥 **Patient PWA Portal:** [http://localhost:3000](http://localhost:3000)
- 🩺 **Doctor Workspace:** [http://localhost:5174](http://localhost:5174)
- 📋 **Reception Portal:** [http://localhost:5173](http://localhost:5173)
- 💊 **Pharmacy Workbench:** [http://localhost:5175](http://localhost:5175)
- 🧪 **Laboratory Workbench:** [http://localhost:5176](http://localhost:5176)
- ⚙️ **FastAPI Backend API:** [http://localhost:8000](http://localhost:8000)
- 📖 **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 8. Database Schema & Migrations

Database definitions and SQL scripts are located in `scaffold/supabase/`:

1. `schema.sql` — Base tables (`app_users`, `patients`, `prescriptions`, `scans`, `medications`, `intake_logs`, etc.).
2. `migrations/doctor_role_extensions.sql` — Schema extensions for Refills, Caregivers, Symptoms, Allergies, and Follow-ups.
3. `migrations/20260813000000_patient_vault_folders_logs.sql` — Vault folders, translations, and reminder queues.
4. `migrations/20260821000000_multi_document_store.sql` — Generalized `patient_documents` store and `document_access_log`.

To apply all migrations to your Supabase project:
1. Open your **Supabase Dashboard → SQL Editor**.
2. Run `schema.sql` followed by the migration scripts in chronological order.

---

*© 2026 Sanjeevani Healthcare Intelligence Platform. Built for clinical excellence and patient safety.*
