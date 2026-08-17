# Sanjeevani Healthcare Platform — Complete Ecosystem Documentation
### Master Integration Guide for All Roles, Features & Technical Specifications

**Last Updated:** August 16, 2026  
**Version:** 3.0 (Production Ready)  
**Status:** ✅ All documentation complete, ready for development

---

## 📋 TABLE OF CONTENTS

1. [Executive Overview](#executive-overview)
2. [Documentation Structure](#documentation-structure)
3. [Architecture at a Glance](#architecture-at-a-glance)
4. [Role-by-Role Feature Map](#role-by-role-feature-map)
5. [Implementation Timeline](#implementation-timeline)
6. [Getting Started](#getting-started)
7. [Development Workflow](#development-workflow)
8. [Testing & Deployment](#testing--deployment)

---

## EXECUTIVE OVERVIEW

### What is Sanjeevani?

Sanjeevani is a **multi-role, integrated healthcare platform** designed to improve medication adherence, patient safety, and clinical efficiency through:

- **Patient Portal (PWA):** Patient-friendly medication tracking, adherence monitoring, caregiver coordination
- **Doctor Portal:** Clinical decision-support, X-ray analysis, cross-doctor guardrails, prescription verification
- **Staff Portals:** Reception (intake), Pharmacy (dispensing), Lab (results), all coordinated via a single backend
- **AI-Powered Features:** Ambient voice documentation, OCR prescription reading, drug interaction checking, symptom pattern detection

### Key Innovations

| Feature | Impact | Patient Benefit | Doctor Benefit |
|---------|--------|-----------------|-----------------|
| **Refill Intelligence** | Stock-out prevention | Never runs out of meds mid-treatment | Fewer "call the clinic" refill requests |
| **Symptom Journal** | Adherence context | Doctor knows actual side effects | Better dosage decisions |
| **Caregiver Access** | Remote supervision | Family helping manage meds | Adherence data includes caregiver marking |
| **Smart Reminders** | Real-time escalation | Gentle nudge → escalate if missed | Doctor alerted to poor adherence patterns |
| **Allergy Profile** | Safety layer | No allergic reactions | Guardrails block dangerous interactions |
| **Report Explanations** | Health literacy | Understands their own lab results | Patient confidence in treatment plan |
| **Cost Awareness** | Financial empowerment | Knows what meds cost, explores generics | Fewer non-adherence due to cost |
| **Visit Prep** | Deeper conversations | Has things to discuss with doctor | Better visit efficiency |

### Expected Outcomes (Phase 1–2)

- ✅ **Adherence improvement:** 60% → 80%+ (15–20 percentage-point gain)
- ✅ **Stock-out prevention:** >95% of patients avoid running out
- ✅ **Safety:** Drug-interaction catch rate >99%
- ✅ **Doctor efficiency:** Reduced refill/admin calls by ~60%
- ✅ **Patient satisfaction:** NPS >60 among active users

---

## DOCUMENTATION STRUCTURE

All specifications are in `/mnt/user-data/outputs/` (or `/home/claude/sanjeevani-docs/`):

### Core Specifications

| Document | Purpose | Key Sections | Audience |
|----------|---------|--------------|----------|
| **06_PATIENT_ROLE_COMPLETE_SPEC.md** | Base patient portal spec | PRD, TRD, Arch, DB, Cross-Role Flows, UI | Full-stack engineers, product managers |
| **07_DOCTOR_ROLE_COMPLETE_SPEC.md** | Doctor portal (v1) | Queue, X-ray, Guardrails, Sign-off | Doctors, clinical engineers |
| **08_PATIENT_VAULT_REMINDERS_SPEC.md** | Vault + Prescription Folders + Reminders (v1 of features) | Folder organization, reminder delivery, cross-role | Product, backend engineers |
| **09_PATIENT_ADHERENCE_ECOSYSTEM_8FEATURES.md** | 8 new patient features (Features #1–8) | Refill Intelligence, Symptoms, Caregivers, Reminders, Allergies, Reports, Cost, Visit Prep | Full-stack (all features here) |
| **10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md** | Doctor portal (v2, integrated with 8 features) | Enhanced guardrails, refill approval, symptom review, caregiver visibility, alerts | Doctors, clinical UX, backend |
| **11_UNIFIED_AUTH_AND_8FEATURE_UI_COMPLETE.md** | Unified auth + detailed UI screens for all 8 features | Login/register for all roles, UI patterns for Features #1–8 | Frontend engineers, designers |

### How to Read This Documentation

**For Product Managers / Stakeholders:**
1. Read this README (overview & timelines)
2. Skim **06** for patient vision
3. Skim **10** for doctor vision
4. Review **09** for 8-feature impact

**For Full-Stack Engineers:**
1. Read this README + **Architecture** section
2. Deep-dive **06**, **10**, **09** in order
3. Start coding from **06**, then **10**, then **09**
4. Use **11** for UI component reference

**For Frontend Engineers Only:**
1. Read this README
2. Study **11** (UI + auth)
3. Reference **06**, **10** for data shapes

**For Backend / API Engineers:**
1. Read this README
2. Study **10** (doctor API + guardrail logic)
3. Study **09** (feature APIs + DB schemas)
4. Reference **06** for patient data access patterns

**For Doctors / Clinical Stakeholders:**
1. Read this README (skim overview section)
2. Review **10** (doctor portal section)
3. Skim **09** (features that impact clinical workflow)

---

## ARCHITECTURE AT A GLANCE

### System Diagram (High-Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PATIENT PWA (Next.js)                       │
│                          Light Theme, Mobile-First                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard | Vault | Calendar | Refills | Copilot | Caregiver │ │
│  │  + All 8 Features integrated (see §09 + §11)                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
         │                                                   │
         │  Direct Supabase RLS                 FastAPI (8 features)
         │  (fast reads)                        (business logic + AI)
         │                                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED AUTH (Single Login)                       │
│  Supabase Auth → Role-based Redirect → Role-Specific Dashboard      │
└─────────────────────────────────────────────────────────────────────┘
         │                       │                          │
         ▼                       ▼                          ▼
    ┌────────────┐        ┌──────────┐             ┌────────────────┐
    │  DOCTOR    │        │  STAFF   │             │   FASTAPI      │
    │  PORTAL    │        │  PORTALS │             │   BACKEND      │
    │  (React)   │        │ (Vite)   │             │   (Production) │
    │  Dark      │        │ Dark     │             │                │
    │  Theme     │        │ Theme    │             │  • Guardrail   │
    └────────────┘        └──────────┘             │  • Verify      │
                                                   │  • Refills     │
                                                   │  • Symptoms    │
                                                   │  • Caregiver   │
                                                   │  • Reminders   │
                                                   │  • Allergies   │
                                                   │  • Reports     │
                                                   │  • Dictation   │
                                                   │  • Visit Prep  │
                                                   │  (see §10+§09) │
                                                   └────────────────┘
                                                           │
                                                   ┌───────┴────────┐
                                                   ▼                ▼
                                            ┌──────────────┐  ┌──────────┐
                                            │  SUPABASE    │  │  REDIS + │
                                            │  PostgreSQL  │  │  Celery  │
                                            │              │  │  (Async) │
                                            │  All tables  │  │          │
                                            │  RLS enabled │  │  Jobs    │
                                            └──────────────┘  └──────────┘
```

### Tech Stack Summary

```
Frontend:
  - Patient PWA: Next.js 14 (App Router) + TypeScript + TailwindCSS
  - Doctor Portal: React 18 + Vite + TypeScript + TailwindCSS (dark theme)
  - Staff Portals: React 18 + Vite + TailwindCSS (dark theme)
  - Shared UI: @sanjeevani/ui component library (tokens, Button, Input, etc.)
  - State: TanStack Query (server cache) + Zustand (local state)
  - Realtime: WebSocket (doctor queue), Supabase Realtime (patient updates)

Backend:
  - Framework: FastAPI 0.115+
  - Database: Supabase PostgreSQL 16 (Auth, Storage, RLS)
  - Cache: Redis (queue, short-lived data)
  - Task Queue: Celery (async AI jobs, notifications)
  - LLM: Ollama (local BioMistral) + OpenRouter (fallback)
  - AI Models:
    - X-ray: YOLOv7-p6 ONNX (bone fracture detection)
    - OCR: TrOCR + YOLO
    - Whisper: Audio transcription
    - LLM: SOAP note generation via Llama/Gemma
```

### Data Flow (Complete Example: Sign-Off to Patient Refill)

```
Doctor Portal:
  Patient selected → Load history (includes caregiver, symptoms, allergies)
    ↓
  Guardrail check on every medication edit (Feature #5 allergy check)
    ↓
  Doctor signs off: Verify endpoint re-checks guardrails
    ↓
  Immutable verification_logs row created (medico-legal compliance)
    ↓
  Prescriptions.status = 'verified'
    ↓
  FAN-OUT (parallel, async):
    ├─→ Pharmacy: dispensing queue
    ├─→ Patient: SMS/WhatsApp + Realtime prescription update
    ├─→ Refills: Patient can request refill within N days (Feature #1)
    ├─→ Symptoms: Doctor sees patient's side effects (Feature #2)
    ├─→ Caregiver: Notified, can mark doses (Feature #3)
    └─→ Reminders: Auto-dose reminders start (Feature #4)

Patient App:
  Sees new Rx on dashboard → Taps to view (Evidence Viewer shows scan)
    ↓
  Reviews medicine info (Feature #6 explains what it's for)
    ↓
  Checks cost (Feature #7 shows generic options)
    ↓
  3 days before running out: Stock-out banner (Feature #1)
    ↓
  Requests refill: Doctor approves/denies → Pharmacy dispenses
    ↓
  Daily: Dose reminders, optional smart reminders if missed (Feature #4)
    ↓
  Weekly: Symptom log entries (Feature #2) → Doctor sees patterns
    ↓
  Before appointment: Visit prep shows things to discuss (Feature #8)
```

---

## ROLE-BY-ROLE FEATURE MAP

### PATIENT (PWA, Light Theme)
**Core (Already Built):**
- ✅ Phone OTP login
- ✅ Daily dosing timeline with adherence ring
- ✅ Dose toggle + adherence score
- ✅ Copilot chat (with guardrails)
- ✅ OTC scanner
- ✅ Health Passport QR sharing
- ✅ Vault (prescriptions, labs, X-rays organized by category)

**New in Phase 1 (Features #1–4):**
- 🔄 Refill Intelligence (RF-1 to RF-7): Running-out alerts, refill requests, approval tracking
- 🔄 Symptom Journal (SJ-1 to SJ-8): Daily well-being log, calendar, doctor feedback
- 🔄 Caregiver Access (CG-1 to CG-10): Invite caregivers, they mark doses, see alerts
- 🔄 Smart Reminders (SR-1 to SR-8): Escalating missed-dose alerts, lab reminders, weekly summary

**New in Phase 2 (Features #5–8):**
- 🔄 Allergy Profile (AE-1–2): Manage allergies, confirm with doctor
- 🔄 Report Explanations (RE-1–2): Plain-language summaries for labs & scans
- 🔄 Cost Awareness (CA-1): Estimated med costs, generic options
- 🔄 Visit Prep (VPA-1–2): Auto-generated discussion topics

### DOCTOR (React, Dark Theme)
**Core (Already Built):**
- ✅ Acuity-sorted queue
- ✅ X-ray Canvas overlay (YOLOv7-p6)
- ✅ OCR verification (side-by-side scan + fields)
- ✅ Guardrail check (live per edit)
- ✅ Verify & sign-off (hash + immutable log)

**New in Phase 1 (Integrated with Features #1–4):**
- 🔄 Refill request queue: Review, approve/deny with clinical notes
- 🔄 Symptom log review: See patient's side effects, respond with guidance
- 🔄 Caregiver visibility: Know when a caregiver marked a dose (adherence context)
- 🔄 Missed-dose alerts: See escalations, take action (send reminder)
- 🔄 Enhanced guardrails: Allergy check (Feature #5), real drug-interaction DB

**New in Phase 2:**
- 🔄 Report review: Approve plain-language summaries
- 🔄 Visit prep review: See what patient wanted to ask
- 🔄 Follow-up scheduling: Built-in appointment creation → patient reminder

### RECEPTION (Vite, Dark Theme)
**Core:**
- ✅ Patient registration
- ✅ Triage (chief complaint + severity)
- ✅ Scan upload (X-ray, OCR processing async)
- ✅ Token generation

**Phase 1–2:**
- 🔄 Refill request status dashboard (for coordination with doctor)
- 🔄 Patient notification history

### PHARMACY (Vite, Dark Theme)
**Core:**
- ✅ Dispensing queue (from verified Rx)
- ✅ Safety-lock badges (if interaction was acknowledged)
- ✅ Dispense confirmation

**Phase 1–2:**
- 🔄 Refill approval queue (doctor's approval → ready to dispense)
- 🔄 Low-stock alerts (if patient refill urgent)

### LAB (Vite, Dark Theme)
**Core:**
- ✅ Diagnostic order queue (Kanban board)
- ✅ Result entry + plain-language summary generation
- ✅ Patient notification

**Phase 1–2:**
- 🔄 Re-check reminders (system auto-generates when due)

---

## IMPLEMENTATION TIMELINE

### Phase 1: MVP + Core Features (Weeks 1–3)

#### Week 1: Foundation (Unified Auth + Refill Intelligence + Guardrail Enhancements)

**Backend:**
- [ ] Implement unified `/auth/login` and `/auth/register` endpoints
- [ ] Add `refill_requests` + `refill_request_history` tables + migrations
- [ ] Extend `prescriptions` table: `is_refillable`, `max_refills_allowed`, `refills_issued`
- [ ] Add guardrail allergy checking (extend guardrail_service.py)
- [ ] API endpoints: GET `/doctor/refill-requests`, POST `/doctor/refill-requests/{id}/approve`

**Frontend:**
- [ ] Login/Register page (unified for all roles) — §11
- [ ] Doctor Portal refill queue panel
- [ ] Patient app refill status screen
- [ ] Dashboard low-stock banner + request flow

**Testing:**
- [ ] Unit tests for guardrail allergy check
- [ ] E2E test: refill request → doctor approval → pharmacy sees it

#### Week 2: Symptom Journal + Caregiver Access

**Backend:**
- [ ] Add `symptom_logs`, `symptom_alerts` tables + migrations
- [ ] Add `caregiver_links`, `caregiver_invitations`, `caregiver_alerts` tables
- [ ] Extend `intake_logs`: `marked_by_id`, `marked_by_role`, `marked_at`
- [ ] API: POST/GET `/patient/{id}/symptoms/*`, POST `/patient/{id}/caregiver/invite`
- [ ] Background job: detect low-score streaks → notify doctor

**Frontend:**
- [ ] Patient wellness log entry screen (§4.1)
- [ ] 30-day calendar view with statistics (§4.2)
- [ ] Doctor's symptom review panel
- [ ] Caregiver invitation flow (§5.1)
- [ ] Caregiver dashboard + patient timeline (§5.2–5.3)

**Testing:**
- [ ] Symptom log CRUD + calendar rendering
- [ ] Caregiver invitation flow, permission checks
- [ ] Low-score streak alert trigger

#### Week 3: Smart Reminders + Integration Testing

**Backend:**
- [ ] Add `scheduled_reminder_jobs`, `reminder_preferences` tables
- [ ] Extend `patient_reminders`: escalation logic, caregiver notification
- [ ] Scheduled jobs: missed-dose escalation (runs every 15min), lab-due check (daily), weekly summary
- [ ] API: POST `/patient/{id}/reminders/{id}/snooze`, POST `/patient/{id}/reminder-preferences`

**Frontend:**
- [ ] Missed-dose notification flow (§6.1 — 2 escalations)
- [ ] Lab reminder screen (§6.2)
- [ ] Weekly summary card (§6.3)
- [ ] Reminder preferences settings (§6.4)

**Testing:**
- [ ] E2E: Refill → Caregiver gets alert → Caregiver marks dose
- [ ] E2E: Dose missed → Escalation after 1h → Escalation after 3h
- [ ] Missed-dose to doctor alert flow
- [ ] Full-stack integration test (patient → doctor → pharmacy → patient)

---

### Phase 2: Enhanced Features (Weeks 4–6)

#### Week 4: Allergies + Report Explanations

**Backend:**
- [ ] Add `patient_allergies` table + migrations
- [ ] Extend guardrail service: drug-allergy checking
- [ ] Add `medication_info` (reference data: uses, side effects, precautions) + LLM generation pipeline
- [ ] Report explanation LLM pipeline (X-ray, lab findings → plain language)

**Frontend:**
- [ ] Patient allergy profile screen (§7)
- [ ] Allergy confirmation flow (doctor-side)
- [ ] Lab/report plain-language display (§8)
- [ ] Doctor review + confirmation panel

**Testing:**
- [ ] Guardrail allergy flag testing (drug vs. allergy)
- [ ] Report explanation LLM validation (accuracy check)

#### Week 5: Cost Awareness + Visit Prep

**Backend:**
- [ ] Add medication cost reference data (by region, brand vs. generic)
- [ ] Visit prep pipeline: aggregate copilot refusals + symptom patterns + suggested topics
- [ ] Follow-up/appointment scheduling (linked to patient reminders)

**Frontend:**
- [ ] Patient cost awareness screen (§9)
- [ ] Doctor's appointment scheduling (within patient profile)
- [ ] Visit prep summary screen (§10)
- [ ] Export prep sheet as PDF

**Testing:**
- [ ] Cost data accuracy + generic matching
- [ ] Visit prep topic generation accuracy
- [ ] Appointment → patient reminder trigger

#### Week 6: Polish + Beta Testing

**All Teams:**
- [ ] UX polish: dark/light theme refinement, animation smoothing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (Lighthouse scores >90)
- [ ] Security audit (penetration testing, RLS verification)
- [ ] Beta cohort onboarding (10–15 doctors, 50–100 patients)
- [ ] Feedback collection + prioritization

---

## GETTING STARTED

### Prerequisites

```bash
# Required
Node.js 18+
Python 3.10+
Docker (for Supabase local)
Git

# Optional but recommended
Ollama (for local LLM inference)
Redis (for caching/queue)
Celery worker (for async jobs)
```

### Development Setup

```bash
# Clone the repo (current state)
cd /path/to/sanjeevani

# Install dependencies
npm install --workspaces  # frontend (monorepo)
pip install -r scaffold/backend/requirements.txt  # backend

# Start services
docker-compose up  # Supabase, Redis (if configured)

# Development servers
npm run dev  # frontend apps (all ports)
python -m uvicorn scaffold.backend.app.main:app --reload  # backend

# Access
# Patient: http://localhost:3000
# Doctor: http://localhost:5174
# Reception: http://localhost:5175
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Database Setup

```bash
# Supabase local (if using docker-compose)
# Tables already defined in scaffold/supabase/schema.sql
# Run migrations:
supabase migration up

# OR use the SQL directly:
psql postgresql://supabase:password@localhost:5432/postgres < scaffold/supabase/schema.sql
```

### Environment Configuration

Create `.env` files:

```bash
# scaffold/backend/.env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=sk-...
OLLAMA_HOST=http://localhost:11434
```

```bash
# scaffold/frontend/.env.local
VITE_API_BASE=http://localhost:8000/api
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## DEVELOPMENT WORKFLOW

### 1. Feature Development (Example: Feature #1, Refill Intelligence)

```bash
# Create feature branch
git checkout -b feature/refill-intelligence

# Backend
# 1. Update schema.sql + create migration
# 2. Implement guardrail_service enhancements
# 3. Add API endpoints in routers/doctor.py
# 4. Write unit tests (tests/test_refill.py)
# 5. Test locally: python -m pytest tests/test_refill.py

# Frontend (Doctor)
# 1. Add refill queue component (apps/doctor/src/pages/RefillQueue.tsx)
# 2. Add refill approval modal
# 3. Connect to API endpoints
# 4. Test in browser

# Frontend (Patient)
# 1. Add low-stock banner to dashboard
# 2. Add refill request modal
# 3. Add refill status tracker
# 4. Connect to API

# Testing
npm run test  # frontend
pytest  # backend
npm run e2e  # full-stack (if available)

# Commit + push
git add .
git commit -m "feat(refill): implement refill intelligence (Feature #1)"
git push origin feature/refill-intelligence
```

### 2. Code Review Process

- All PRs reviewed for:
  - **Security:** No hardcoded secrets, RLS policies reviewed, data validation
  - **Database:** Migrations correct, indexes added, performance acceptable
  - **API:** Error handling, consistent response format, documentation
  - **Frontend:** Accessibility (WCAG 2.1 AA), performance, responsive design
  - **Testing:** Unit + E2E coverage >70% for critical paths

### 3. Deployment Checklist

- [ ] All tests passing locally + CI
- [ ] Performance benchmarks met (<2s API calls, <1.5s UI loads)
- [ ] Database migrations tested on staging
- [ ] Secrets rotated (if needed)
- [ ] Documentation updated (README, API docs)
- [ ] Beta testers notified (if phase 1 or 2)

---

## TESTING & DEPLOYMENT

### Testing Strategy

| Level | Tool | Scope | Coverage Target |
|-------|------|-------|-----------------|
| Unit | pytest (backend), Jest (frontend) | Individual functions, components | ≥70% critical paths |
| Integration | pytest + FastAPI TestClient | API endpoints, DB interactions | ≥50% all endpoints |
| E2E | Cypress / Playwright | Full user flows (login → sign-off → patient sees Rx) | ≥3 key scenarios per feature |
| Security | OWASP ZAP, manual | SQL injection, XSS, authentication, RLS | 100% of attack vectors reviewed |
| Performance | Lighthouse, k6 | Load times, API response times, concurrent users | Targets met (see §TRD) |

### Deployment Environments

```
Local (developer):
  - Supabase local (Docker)
  - Backend: FastAPI dev server
  - Frontend: Vite dev servers
  - No auth (demo mode)

Staging:
  - Supabase staging project (cloud)
  - Backend: Docker container on staging VM
  - Frontend: Static hosting (Vercel, Netlify)
  - Full auth + real data (test cohort)

Production:
  - Supabase production (cloud)
  - Backend: Kubernetes or managed container (AWS ECS, Google Cloud Run)
  - Frontend: CDN + static hosting
  - Full auth + real patient data
  - Monitoring: Datadog, PagerDuty
  - Backups: Daily automated, 30-day retention
  - Incident response: On-call rotation
```

### CI/CD Pipeline (GitHub Actions / GitLab CI)

```yaml
# .github/workflows/test-and-deploy.yml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions/setup-python@v4
        with:
          python-version: 3.10
      
      - run: npm ci --workspaces
      - run: pip install -r scaffold/backend/requirements.txt
      
      # Frontend tests
      - run: npm run test --workspaces
      - run: npm run lint --workspaces
      
      # Backend tests
      - run: pytest scaffold/backend tests/ --cov=scaffold/backend
      - run: pylint scaffold/backend/app
      
      # Upload coverage
      - uses: codecov/codecov-action@v3

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Build + push to Docker registry
      - run: docker build -t sanjeevani-backend:${{ github.sha }} scaffold/backend/
      - run: docker push registry.example.com/sanjeevani-backend:${{ github.sha }}
      
      # Deploy frontend
      - run: npm run build --workspaces
      - run: npx vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
      
      # Notify team
      - uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment complete'

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      # Similar to staging, but with production credentials
```

---

## MONITORING & OBSERVABILITY (Post-Launch)

### Key Metrics to Track

```
Patient Engagement:
  - DAU (Daily Active Users)
  - MAU (Monthly Active Users)
  - % patients with ≥1 caregiver linked
  - Refill request volume
  - Symptom log adherence rate

Clinical Outcomes:
  - Average adherence score (target: 80%+)
  - % patients avoiding stock-outs
  - Guardrail flag accuracy (>99%)
  - Doctor approval time on refills (target: <24h)

System Health:
  - API latency p95 (target: <800ms)
  - Database query time p95
  - Error rate (<0.1%)
  - Uptime (target: 99.9%)

User Experience:
  - Page load time p95 (<1.5s)
  - NPS score
  - Feature adoption rate
  - Support ticket volume
```

### Alerting Rules

```
CRITICAL (PagerDuty on-call):
  - Database down or replication lag >5s
  - API error rate >1%
  - Doctor portal load time >3s
  - Patient data breach attempt (auth failure spike)

WARNING (Slack #engineering):
  - API latency p95 >1.5s
  - Database connection pool exhausted
  - Daily backup missed
  - Guardrail flag false-positive rate trending up

INFO (Daily digest):
  - Feature usage stats
  - Performance trends
  - Deployment logs
```

---

## FAQ & Troubleshooting

### Q: How do I add a new patient feature?
A: Follow the development workflow in §Development Workflow. Create a new feature spec following the template in the existing docs (PRD + TRD + API + UI). Implement backend first, test with curl, then frontend.

### Q: How do I integrate a new doctor/staff role?
A: Add a new role type to `app_users.role` enum, create a new frontend app in `apps/{role_name}`, add role-gated API endpoints, and add redirect mapping in `/auth/login`.

### Q: How do I handle doctor holiday/leave?
A: Not yet implemented. Future enhancement: `doctor_availability` table, reassign queue to backup doctor or queue for later.

### Q: How do I handle patient guardianship (parent managing minor)?
A: Current caregiver system (Feature #3) supports this. Parent invites as caregiver, gets full read + dose-marking access. For legal guardianship, add a `guardian_verified_at` flag to caregiver_links (doctor confirms).

### Q: How do I ensure HIPAA compliance in production?
A: See `10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md` §3.4 (Security & Compliance). Key: encryption at rest + in transit, audit logging, access controls (RLS), BAA with Supabase, regular security audits.

### Q: Can patients export their full medical record?
A: Yes, see `06_PATIENT_ROLE_COMPLETE_SPEC.md` §PT-10 (Records Vault Export). Uses client-side PDF generation (HIPAA-safe, no data sent to third party).

---

## SUPPORT & ESCALATION

**For Technical Issues:**
- GitHub Issues (for bugs)
- Slack #engineering (for questions)
- Weekly syncs (Monday 10 AM, Zoom link in pinned message)

**For Product/Feature Questions:**
- Slack #product
- Monthly roadmap review (first Friday)

**For Clinical/Safety Questions:**
- Slack #clinical-advisory (includes doctors on steering committee)
- Emergency: Call on-call doctor (number in handbook)

---

## ACKNOWLEDGMENTS

This documentation represents the work of:
- **Product & UX:** Requirements, feature prioritization, user flows
- **Clinical Team:** Safety requirements, doctor/patient feedback
- **Engineering:** Architecture design, implementation specs, code reviews
- **QA:** Testing strategy, beta coordination
- **DevOps:** Infrastructure, monitoring, security

**Last Updated by:** Claude (AI Assistant)  
**Next Review Date:** September 1, 2026  
**Questions?** See support section above or open a GitHub issue.

---

**END OF README — READY FOR DEVELOPMENT**
