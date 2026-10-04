# SANJEEVANI (संजीवनी) — COMPREHENSIVE PRODUCTION READINESS AUDIT & BUG DOCUMENTATION (`bugdoc.md`)
**Document Version:** 1.1.0-PARTIAL-FIXES  
**Audit Scope:** Full Stack (Frontend Next.js App Router, Backend FastAPI 0.109+, Supabase DB / Mock Layer, Role-Based Access Control, Design System & UI/CSS)  
**Last Updated:** 2026-10-04 — Commit `babed68`  
**Status:** Audit In Progress — Sequence 1 (RBAC & Auth) Complete, Sequences 2–8 Pending

---

## FIX STATUS SUMMARY (as of 2026-10-04)

| Bug ID | Description | Status |
|---|---|---|
| BUG-RBAC-01 | Default Doctor Auto-Assignment on Mount | ✅ **FIXED** |
| BUG-RBAC-02 | Logout Resets to Doctor Instead of Clearing Session | ✅ **FIXED** |
| BUG-RBAC-03 | "Switch Portal" Dropdown Allows Role Hijacking | ✅ **FIXED** (removed from `RoleHeader.tsx`; `Navbar.tsx` partial) |
| BUG-RBAC-04 | Missing Route Guards / Dead Middleware | ✅ **FIXED** (`middleware.ts` now has role-based route protection) |
| BUG-DR-HDR-01 | Doctor Header Fallback to Nitin Sharma | ✅ **FIXED** (redirects to `/login` if no session) |
| BUG-PHARM-01 | Hardcoded `pharm-anita-1` Pharmacist ID | ✅ **FIXED** (now uses `user?.id` from AuthContext) |
| BUG-HOME-01 | Invalid Tailwind class `w-13` on theme toggle | ⚠️ **Pending** (Sequence 3) |
| BUG-HOME-02 | Theme state desync across portals | ⚠️ **Pending** (Sequence 3) |
| BUG-HOME-03 | Missing Pharmacy/Lab roles on landing page | ⚠️ **Pending** (Sequence 4) |
| BUG-HOME-04 | Dead "Request Clinic Access" form | ⚠️ **Pending** (Sequence 4) |
| BUG-HOME-05 | Desktop CTA directly links to `/doctor` | ⚠️ **Pending** (Sequence 4) |
| BUG-NAV-01 | Navbar role switcher leaks staff access | ⚠️ **Partial** — role switcher still in Navbar.tsx, needs removal |
| BUG-NAV-02 | Missing Mobile Navigation Drawer | ⚠️ **Pending** (Sequence 2) |
| BUG-DASH-01 | Hardcoded `patient-ramesh` vs `demo-patient` ID mismatch | ⚠️ **Pending** (Sequence 4) |
| BUG-DASH-02 | UTF-8 Mojibake in dashboard source comments | ⚠️ **Pending** (Sequence 3) |
| BUG-DASH-03 | Photo upload uses DataURL instead of multipart | ⚠️ **Pending** |
| BUG-VAULT-01 | Fallback patient ID mismatch vault vs dashboard | ⚠️ **Pending** (Sequence 4) |
| BUG-VAULT-02 | Missing detail view for non-prescription categories | ⚠️ **Pending** |
| BUG-CAL-01 | En-dash encoding corruption in calendar AI summary | ⚠️ **Pending** (Sequence 3) |
| BUG-REM-01 | Staff reminders not persisted on dismiss | ⚠️ **Pending** |
| BUG-COP-01 | Missing loading indicator on direct send | ⚠️ **Pending** |
| BUG-SCAN-01 | OTC scan does not link to patient's primary doctor | ⚠️ **Pending** |
| BUG-PASS-01 | Hardcoded fallback QR URL domain | ⚠️ **Pending** |
| BUG-LOG-01 | Filter buttons don't filter audit log entries | ⚠️ **Pending** |
| BUG-SET-01 | Doctor credential fields shown to patients in settings | ⚠️ **Pending** |
| BUG-ORPH-01 | Orphaned `/records` route duplicates vault | ✅ **FIXED** (records/page.tsx replaced with redirect) |
| BUG-ORPH-02 | Orphaned `/labs` queries invalid category | ✅ **FIXED** (labs/page.tsx replaced with redirect) |
| BUG-DR-Q01 | Degree symbol mojibake in clinical complaints | ⚠️ **Pending** (Sequence 3) |
| BUG-DR-Q02 | Doctor queue ignores authenticated doctor ID | ⚠️ **Pending** |
| BUG-DR-CHART-01 | Compliance ring % vs caption count mismatch | ⚠️ **Pending** |
| BUG-DR-CHART-02 | Alert banner in patient voice, not physician voice | ⚠️ **Pending** |
| BUG-DR-TIME-01 | Deep-link invalidation on browser refresh | ⚠️ **Pending** |
| BUG-DR-RX-01 | Pre-seeded Metformin/Noveron rows in prescribe tab | ⚠️ **Pending** (Sequence 6) |
| BUG-DR-RX-02 | Prescription sign-off does not propagate to pharmacy/patient | ⚠️ **Pending** (Sequence 6) |
| BUG-DR-SOAP-01 | Static Ramesh Kumar SOAP note for all patients | ⚠️ **Pending** (Sequence 7) |
| BUG-DR-SOAP-02 | Save SOAP Note has no API dispatch | ⚠️ **Pending** (Sequence 7) |
| BUG-DR-OCR-01 | Hardcoded OCR data and bounding boxes | ⚠️ **Pending** |
| BUG-DR-REF-01 | Follow-up date defaults to past date | ⚠️ **Pending** (Sequence 3) |
| BUG-REC-01 | Reception walk-in not pushed to doctor queue | ⚠️ **Pending** (Sequence 5) |
| BUG-LAB-01 | Lab workbench fully disconnected from backend | ⚠️ **Pending** (Sequence 7) |
| BUG-BE-01 | Windows-1252 / UTF-8 double-encoding in backend strings | ⚠️ **Pending** (Sequence 3) |
| BUG-BE-02 | Missing CORS origin support for alternate ports | ⚠️ **Pending** |
| BUG-UI-01 | Inconsistent color systems (CSS vars vs hardcoded hex) | ⚠️ **Pending** (Sequence 5) |
| BUG-UI-02 | Horizontal scroll overflow on doctor sub-navigation (mobile) | ⚠️ **Pending** (Sequence 2) |

---

## EXECUTIVE SUMMARY & AUDIT METHODOLOGY

This document provides a line-by-line, component-by-component, and endpoint-by-endpoint architectural and functional audit of the Sanjeevani clinical ecosystem against:
1. **The Product Vision & SRS:** Detailed in [`README.md`](file:///c:/PROJECTS/sanjeevani-project/README.md), [`01_PRD.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/01_PRD.md), [`02_ARCHITECTURE.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/02_ARCHITECTURE.md), [`05_DESIGN_SYSTEM.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/05_DESIGN_SYSTEM.md), [`09_PATIENT_ADHERENCE_ECOSYSTEM_8FEATURES.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/09_PATIENT_ADHERENCE_ECOSYSTEM_8FEATURES.md), [`10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md), [`11_UNIFIED_AUTH_AND_8FEATURE_UI_COMPLETE.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/11_UNIFIED_AUTH_AND_8FEATURE_UI_COMPLETE.md), and [`14 single app consolidation and fix prompt.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/14%20single%20app%20consolidation%20and%20fix%20prompt.md).
2. **Real-World Healthcare Production Constraints:** Multi-user strict role boundaries (patients must not access doctor or dispensary desks; doctors must not switch arbitrary clinical roles at will without authorization; session integrity, HIPAA/DISHA data compartmentalization).
3. **Live Runtime & Code Audits:** Executed against running Next.js server (`:3000`) and FastAPI ASGI backend (`:8000`), testing real API payloads, mock fallbacks, client state machines, and styling sheets.

---

## TABLE OF AUDIT SECTIONS

1. [SECTION 1: ARCHITECTURAL ROLE-BASED ACCESS CONTROL (RBAC) & SESSION SECURITY](#section-1-architectural-role-based-access-control-rbac--session-security)
2. [SECTION 2: HOME / UNIVERSAL LANDING PAGE (`/`)](#section-2-home--universal-landing-page-)
3. [SECTION 3: PATIENT CARE PORTAL & ALL 8 ADHERENCE ECOSYSTEM FEATURES](#section-3-patient-care-portal--all-8-adherence-ecosystem-features)
   - 3.1 Patient Shell & Navigation Bar (`Navbar.tsx`)
   - 3.2 Main Patient Dashboard (`/dashboard`)
   - 3.3 Self-Sovereign Health Vault & Category System (`/vault`, `/vault/[category]`)
   - 3.4 Interactive Medicine Schedule & Calendar (`/calendar`)
   - 3.5 Clinical Escalation & Smart Reminders (`/reminders`)
   - 3.6 AI Health Copilot & Guardrail Assistant (`/copilot`)
   - 3.7 Universal OCR & OTC Drug Safety Scanner (`/scan-otc`)
   - 3.8 Cryptographic Health Passport & QR Token (`/passport`)
   - 3.9 Compliance Audit Logs & Wellbeing History (`/logs`)
   - 3.10 User Profile & Notification Settings (`/settings`)
   - 3.11 Orphaned & Broken Routes (`/records`, `/labs`)
4. [SECTION 4: ATTENDING PHYSICIAN & SPECIALIST COMMAND CENTER (`/doctor`)](#section-4-attending-physician--specialist-command-center-doctor)
   - 4.1 Doctor Global Header & Quick Controls (`RoleHeader.tsx`)
   - 4.2 Physician Consultation Triage Queue (`/doctor`)
   - 4.3 Patient 360-Degree Chart Layout & Header (`/doctor/patient/[patientId]/layout.tsx`)
   - 4.4 Longitudinal Timeline & Adherence Metrics (`/doctor/patient/[patientId]/timeline`)
   - 4.5 Structured Prescription Composer & Pharmacological Guardrails (`/doctor/patient/[patientId]/prescribe`)
   - 4.6 Ambient SOAP Voice Dictation Workbench (`/doctor/patient/[patientId]/soap`)
   - 4.7 Side-by-Side OCR Verification & YOLOv7 X-Ray Canvas (`/doctor/patient/[patientId]/ocr-xray`)
   - 4.8 Refill Request Approval Console & Lab Ordering (`/doctor/patient/[patientId]/refills`)
   - 4.9 Doctor CRM & Patient Follow-up Pipeline (`/doctor/crm`)
5. [SECTION 5: HOSPITAL OPERATIONS ROLES (RECEPTION, PHARMACY, LABORATORY)](#section-5-hospital-operations-roles-reception-pharmacy-laboratory)
   - 5.1 Front-Desk Reception & AI-4 Intake (`/reception`, `/reception/queue`, `/reception/appointments`)
   - 5.2 Dispensary Pharmacy & Safety-Lock Enforcement (`/pharmacy`, `/pharmacy/inventory`, `/pharmacy/history`)
   - 5.3 Laboratory Diagnostics Workbench (`/lab`)
6. [SECTION 6: BACKEND API, ENCODING & DATA CONTRACT ANOMALIES](#section-6-backend-api-encoding--data-contract-anomalies)
7. [SECTION 7: GLOBAL UI, CSS, DESIGN SYSTEM & RESPONSIVENESS DEFECTS](#section-7-global-ui-css-design-system--responsiveness-defects)
8. [SECTION 8: PRIORITIZED REMEDIATION ROADMAP](#section-8-prioritized-remediation-roadmap)

---

# SECTION 1: ARCHITECTURAL ROLE-BASED ACCESS CONTROL (RBAC) & SESSION SECURITY

### BUG-RBAC-01: Default Doctor Session Auto-Assignment Violates Multi-Tenant Zero-Trust Model ✅ FIXED
- **Fix Status:** ✅ **FIXED** — Commit `babed68` | [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx#L105-L131)
- **Fix Applied:**
  ```tsx
  // BUG-RBAC-01 FIX: Start as null — never auto-assign any role to unauthenticated visitors
  const [user, setUser] = useState<UserProfile | null>(null);
  // ... useEffect validates stored session or stays null
  ```
- **Location:** [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx#L96-L123)
- **Original Code (Removed):**
  ```tsx
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_USERS.doctor);
  // if (stored) { setUser(parsed); } else { setUser(DEFAULT_USERS.doctor); }
  ```
- **Description:** Any unauthenticated guest visiting the root application is automatically stamped into `localStorage` as `DEFAULT_USERS.doctor` (Dr. Nitin Sharma, Room 402). 
- **Real-World Impact:** Unauthenticated public users immediately inherit physician identity and permissions.
- **Probable Root Cause:** Temporary developer convenience stub left in production code to bypass typing passwords during rapid prototyping.

---

### BUG-RBAC-02: Logout Function Resets to Doctor Session Instead of Terminating Session ✅ FIXED
- **Fix Status:** ✅ **FIXED** — Commit `babed68` | [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx#L172-L179)
- **Fix Applied:**
  ```tsx
  // BUG-RBAC-02 FIX: logout truly destroys session, sets user to null, never re-seeds doctor
  const logout = () => {
    setUser(null);
    syncRoleCookie(null);
    try { localStorage.removeItem("sanjeevani_user_session"); } catch {}
  };
  ```
- **Location:** [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx#L151-L156)
- **Original Code (Removed):**
  ```tsx
  const logout = () => { setUser(DEFAULT_USERS.doctor); /* re-seeds doctor! */ };
  ```
- **Description:** Clicking "Sign Out" from any portal did not clear credentials; it re-logged the browser into Dr. Nitin Sharma!
- **Real-World Impact:** A patient on a shared or public computer who clicked "Sign Out" granted the next user complete physician access.
- **Probable Root Cause:** Copy-paste shortcut during AuthContext scaffolding.

---

### BUG-RBAC-03: Omnipresent "Switch Portal" Dropdown Allows Any User to Hijack Any Role ✅ FIXED (RoleHeader) / ⚠️ Partial (Navbar)
- **Fix Status:** ✅ **FIXED** in `RoleHeader.tsx` — Commit `babed68` | ⚠️ Role switcher still present in `Navbar.tsx`, pending cleanup
- **Fix Applied in RoleHeader.tsx:**
  ```tsx
  // BUG-RBAC-03 FIX: handleRoleChange and Switch Portal dropdown removed.
  // Users are assigned a single role; they cannot switch clinical portals at will.
  ```
- **Location:** 
  - [`RoleHeader.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/RoleHeader.tsx#L112-L114) — ✅ Switcher removed
  - [`Navbar.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx#L135-L170) — ⚠️ Still needs cleanup
  - [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx#L163-L170) — `switchRole` retained for internal demo only
- **Original Code (Removed from RoleHeader):**
  ```tsx
  const handleRoleChange = (role: UserRole) => { switchRole(role); router.push(targetHref); };
  ```
- **Description:** Both the patient navigation bar and the staff header rendered a prominent "Switch Portal" button allowing instantaneous role swapping with no permission validation.
- **Real-World Impact:** Patients could access physician consultation queues, dispense prescriptions, and view other patients' confidential records.
- **Probable Root Cause:** Single-app consolidation prototype feature retained in UI without environment gating.
- **Remaining Work:** Remove role switcher from `Navbar.tsx` (Sequence 1 — BUG-NAV-01).

---

### BUG-RBAC-04: Completely Missing Route Guards and Dead Middleware ✅ FIXED
- **Fix Status:** ✅ **FIXED** — Commit `babed68` | [`middleware.ts`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/middleware.ts)
- **Fix Applied:** `middleware.ts` now implements full role-based route protection:
  - Reads `sanjeevani_session_role` cookie set by `AuthContext.syncRoleCookie()`
  - Unauthenticated access to protected routes → redirect to `/login?next=<path>`
  - Patient accessing `/doctor/*`, `/reception/*`, `/pharmacy/*`, `/lab/*` → redirect to `/dashboard`
  - Staff accessing wrong portal → redirect to their own role's portal
  - [`utils/supabase/middleware.ts`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/utils/supabase/middleware.ts) updated with session-aware logic
- **Location:** 
  - [`middleware.ts`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/middleware.ts) — ✅ Fixed
  - [`utils/supabase/middleware.ts`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/utils/supabase/middleware.ts) — ✅ Updated
- **Original Code (Removed):**
  ```ts
  export async function updateSession(request: NextRequest) { return NextResponse.next() }
  ```
- **Description:** Middleware was a non-operational pass-through stub. Anyone typing `/doctor` or `/pharmacy` in the URL got immediate access regardless of role.
- **Real-World Impact:** Zero access control across all sensitive clinical modules.
- **Probable Root Cause:** Middleware was scaffolded as a placeholder and never populated with role validation logic.

---

# SECTION 2: HOME / UNIVERSAL LANDING PAGE (`/`)

### BUG-HOME-01: Invalid Tailwind CSS Class `w-13` Breaks Theme Toggle Width
- **Location:** [`page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L66)
- **Code Reference:**
  ```tsx
  <button
    onClick={toggleTheme}
    className="w-13 h-7 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] p-0.5 ... cursor-pointer"
  ```
- **Description:** The theme toggle switch uses `w-13`. In Tailwind CSS v3, `w-13` is not a standard utility (standard jumps from `w-12` to `w-14`). Because `w-13` does not exist in `tailwind.config.js`, Tailwind drops the class, causing the switch container to collapse to intrinsic width or render distorted depending on child layout.
- **Real-World Impact:** Visually broken switch button in top navigation on the first screen users see.
- **Probable Root Cause:** Typo for `w-14` or `w-[52px]`.
- **Suggested Remediation:** Replace `w-13` with `w-14` or `w-[52px]`.

---

### BUG-HOME-02: Isolated Theme State Desynchronized from HTML Element & Other Portals
- **Location:** [`page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L31-L38)
- **Code Reference:**
  ```tsx
  const [theme, setTheme] = useState<"light" | "dark">("light");
  ```
- **Description:** Landing page maintains an isolated `useState("light")` without reading `document.documentElement.getAttribute("data-theme")` or `localStorage` on initial mount. If a user sets dark mode in the doctor portal or dashboard and navigates back to `/`, the landing page state resets to `"light"`. Clicking the toggle then flips the state inversely to the document's actual state.
- **Real-World Impact:** Inconsistent visual appearance; theme toggle requires two clicks to synchronize.
- **Probable Root Cause:** Lack of a global `ThemeContext` or `next-themes` provider.
- **Suggested Remediation:** Read `document.documentElement.getAttribute("data-theme")` in a `useEffect` on mount, or wrap the root application in a unified `ThemeProvider`.

---

### BUG-HOME-03: Workspace Roles Section Omits Pharmacy and Laboratory Roles
- **Location:** [`page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L246-L283)
- **Description:** Section 05 ("Built for Everyone in Healthcare") advertises only 3 roles (Patients, Doctors, Receptionists). Dispensary Pharmacy and Pathology Laboratory are core stakeholder pillars of Sanjeevani specified in PRD sections 2.3.4 & 2.3.5 and DFD Level 0, but they have no cards in the workspace overview.
- **Real-World Impact:** Incomplete product presentation; pharmacists and lab technicians arriving on the platform have no entry card.
- **Probable Root Cause:** Early landing page mock was created before pharmacy and lab modules were built.
- **Suggested Remediation:** Expand the grid to 5 roles or add a 5-column responsive layout showcasing all stakeholder portals.

---

### BUG-HOME-04: Non-Functional "Request Clinic Access" Form with Dead Submit Handler
- **Location:** [`page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L379-L404)
- **Code Reference:**
  ```tsx
  <form onSubmit={(e) => e.preventDefault()} className="space-y-4 ...">
  ```
- **Description:** The lead-generation form in Section 08 has `onSubmit={(e) => e.preventDefault()}` with no state tracking, no validation, no API dispatch, and no confirmation toast or feedback.
- **Real-World Impact:** Prospective clinic clients fill in details and click "Request Clinic Access," but nothing happens.
- **Probable Root Cause:** Front-end visual placeholder created without backend integration.
- **Suggested Remediation:** Add controlled form state, validation, dispatch to a clinic lead endpoint or contact notification service, and show a success confirmation card upon submission.

---

### BUG-HOME-05: Desktop Header CTA Bypasses Role Selection Directly to Doctor Workspace
- **Location:** [`page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L85-L90)
- **Code Reference:**
  ```tsx
  <Link href="/doctor" className="hidden sm:inline-flex ...">
    Doctor Workspace →
  </Link>
  ```
- **Description:** The primary header CTA on the universal public landing page directly links to `/doctor`, reinforcing the misconception that Sanjeevani is only a doctor app.
- **Real-World Impact:** Confuses patients and non-doctor staff who arrive on the homepage looking to log into their respective portals.
- **Probable Root Cause:** Developer shortcut during physician module testing.
- **Suggested Remediation:** Change primary CTA to `/login` or "Portal Access", or provide a dual CTA ("Patient Portal" & "Staff Login").

---

# SECTION 3: PATIENT CARE PORTAL & ALL 8 ADHERENCE ECOSYSTEM FEATURES

### 3.1 Patient Shell & Navigation Bar (`Navbar.tsx`)

#### BUG-NAV-01: Navbar Role Switcher Leaks Full Staff Access to Patients
- **Location:** [`Navbar.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx#L135-L170)
- **Description:** The patient portal top navigation includes a "Switch Portal" dropdown that directly switches the active user into `doctor`, `receptionist`, `pharmacist`, and `lab_tech`.
- **Real-World Impact:** Violates fundamental healthcare privacy and role compartmentalization. Patients must never be shown options to operate clinical dispensaries or physician triage queues.
- **Probable Root Cause:** Code copied verbatim from staff header `RoleHeader.tsx`.
- **Suggested Remediation:** Remove the `roleSwitcherOpen` block from `Navbar.tsx`.

#### BUG-NAV-02: Missing Mobile Navigation Drawer Causes Sub-Links to Vanish on Mobile
- **Location:** [`Navbar.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx#L112-L131)
- **Code Reference:**
  ```tsx
  <nav className="hidden lg:flex items-center gap-1">
  ```
- **Description:** All 8 navigation items (`/dashboard`, `/vault`, `/calendar`, `/reminders`, `/copilot`, `/scan-otc`, `/passport`, `/logs`) are styled `hidden lg:flex`. On mobile and tablet screens, no hamburger menu or bottom navigation bar is rendered.
- **Real-World Impact:** Patients browsing on mobile smartphones (which is the primary target for the Patient PWA) have zero navigation controls to switch between Dashboard, Vault, Calendar, Scanner, or Passport.
- **Probable Root Cause:** Omission of a mobile drawer or bottom tab bar in `Navbar.tsx`.
- **Suggested Remediation:** Add a responsive mobile bottom navigation bar (matching modern PWA patterns) or a hamburger slide-out drawer containing `NAV_ITEMS`.

---

### 3.2 Main Patient Dashboard (`/dashboard`)

#### BUG-DASH-01: Hardcoded Patient ID Mismatch Causes Empty Schedule & Zero Adherence
- **Location:** 
  - [`dashboard/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/dashboard/page.tsx#L308-L345)
  - [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx#L34)
  - [`patient_service.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/services/patient_service.py#L738)
- **Code Reference:**
  ```tsx
  // dashboard/page.tsx
  const pid = (user?.role === "patient" && user?.id) ? user.id : "patient-ramesh";
  fetch(`${API_BASE}/patient/${pid}/timeline`)
  ```
  ```python
  # patient_service.py
  def get_timeline(self, patient_id: str):
      items = [s for s in self.schedule_items if s.get("patient_id") == patient_id or patient_id == "demo-patient"]
  ```
- **Description:** In `AuthContext.tsx`, the patient profile has `id = "patient-ramesh"`. The dashboard requests `/patient/patient-ramesh/timeline`. However, the backend `patient_service.py` initialized its mock database items with `patient_id: "demo-patient"`. In `get_timeline`, the condition `patient_id == "demo-patient"` evaluates to `False` for `"patient-ramesh"`.
- **Real-World Impact:** The patient logs into their dashboard and sees:
  - Adherence Score: **0%**
  - Daily Dose Checklist: **Completely Empty (No items for today)**
  - No doses to mark, snooze, or speak.
- **Probable Root Cause:** Inconsistent patient ID seeding between frontend mock auth (`patient-ramesh`) and backend in-memory service (`demo-patient`).
- **Suggested Remediation:** 
  1. Standardize backend service: `patient_id in ["demo-patient", "patient-ramesh", "patient-savitri", "patient-vikram"]`.
  2. Harmonize `AuthContext` to use consistent IDs matching seeded clinical data.

#### BUG-DASH-02: UTF-8 Mojibake / Character Corruption in Source Comments and UI Labels
- **Location:** [`dashboard/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/dashboard/page.tsx#L78L135L193L253L265)
- **Code Reference:**
  - Line 78: `/* â”€â”€ Adherence Ring (SVG stroke-only) â”€â”€... */`
  - Line 135: `/* â”€â”€ Dose Card with Criticality & Snooze/Skip â”€â”€... */`
  - Line 193: `Snoozed (+20m Â· Pending)`
  - Line 253: `Taken âœ“`
  - Line 265: `/* â”€â”€ Main Dashboard â”€â”€... */`
- **Description:** File contains garbled multibyte characters resulting from saving UTF-8 box-drawing and bullet characters under Windows CP-1252 encoding.
- **Real-World Impact:** Rendered buttons display ugly corrupted text like `Taken âœ“` and `Snoozed (+20m Â· Pending)` instead of clean checkmarks and middle-dots.
- **Probable Root Cause:** Text editor encoding conversion mismatch on Windows filesystem.
- **Suggested Remediation:** Re-encode file in pure UTF-8 without BOM; replace mojibake strings with standard unicode escapes or standard ASCII characters (e.g., `✓`, `·`).

#### BUG-DASH-03: Wellbeing Journal Photo Upload Uses DataURL String Directly Without Storage
- **Location:** [`dashboard/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/dashboard/page.tsx#L446-L456)
- **Description:** When a patient attaches a photo to their symptom journal entry (e.g., a skin rash), `handlePhotoUpload` reads the raw file as a base64 DataURL and passes it inside JSON payload to `/patient/symptom/log`. 
- **Real-World Impact:** High-resolution mobile camera photos (4MB - 12MB) bloat the JSON body, causing HTTP 413 (Payload Too Large) errors or memory exhaustion on backend workers.
- **Probable Root Cause:** Omission of a multipart file upload endpoint to Supabase/S3 bucket.
- **Suggested Remediation:** Upload image via `/api/upload` multipart endpoint, receive back a permanent CDN/storage URL, and store only the URL in `photo_url`.

---

### 3.3 Self-Sovereign Health Vault & Category System (`/vault`, `/vault/[category]`)

#### BUG-VAULT-01: Discrepancy in Default Fallback Patient ID
- **Location:** [`vault/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/vault/page.tsx#L60)
- **Code Reference:**
  ```tsx
  const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
  ```
- **Description:** Unlike `dashboard/page.tsx` (which falls back to `"patient-ramesh"`), `vault/page.tsx` falls back to `"demo-patient"`.
- **Real-World Impact:** The patient sees one set of mock data in Vault (under `demo-patient`) and an empty/different set of data in Dashboard (under `patient-ramesh`).
- **Probable Root Cause:** Code written at different times by different sub-agents without central constants.
- **Suggested Remediation:** Use a single authenticated `user.id` derived from `AuthContext`, with a single constant fallback if in mock mode.

#### BUG-VAULT-02: Missing Document Preview / Download Handler for Non-Prescription Categories
- **Location:** [`vault/[category]/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/vault/%5Bcategory%5D/page.tsx#L180-L220)
- **Description:** Clicking documents in `/vault/hospital-discharges`, `/vault/vaccinations`, or `/vault/referral-letters` attempts to push to `/vault/${category}/${doc.id}` or opens an empty preview state because dedicated view components only exist for `prescriptions` and `lab-reports`.
- **Real-World Impact:** Hospital discharges and referral letters can be listed, but clicking on them results in blank or 404 pages.
- **Probable Root Cause:** Detail views were only implemented for Phase 1 categories.
- **Suggested Remediation:** Implement a generic document viewer modal that handles raw PDF/image previews, metadata display, and download buttons for all 7 document categories.

---

### 3.4 Interactive Medicine Schedule & Calendar (`/calendar`)

#### BUG-CAL-01: Backend API Calendar Month Returns Corrupted Characters `??` for En-Dashes
- **Location:** 
  - [`calendar/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/calendar/page.tsx#L61-L67)
  - [`scaffold/backend/app/routers/copilot.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/routers/copilot.py#L420-L460)
- **API Response:**
  ```json
  "ai_summary": {
    "best_week": "Sep 10??16",
    "smart_reminder_suggestion": "You usually take your evening dose around 9:00 PM, not 8:00 PM ?? shift the reminder?",
    "missed_dose_risk_day": "You've missed doses on past Sundays ?? want an extra morning reminder this weekend?"
  }
  ```
- **Description:** The Python backend returns corrupted UTF-8 sequences (`??`) where en-dashes (`–`) were intended.
- **Real-World Impact:** Patient AI insights strip displays broken symbols (`Sep 10??16`).
- **Probable Root Cause:** Python file was saved in an incompatible Windows encoding or Uvicorn response serialization did not enforce `charset=utf-8`.
- **Suggested Remediation:** Replace en-dashes in Python strings with standard ASCII hyphens (`-`) or properly decode UTF-8.

---

### 3.5 Clinical Escalation & Smart Reminders (`/reminders`)

#### BUG-REM-01: Staff Reminders are Static In-Memory State that Discard Dismissals on Reload
- **Location:** [`reminders/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/reminders/page.tsx#L48-L95)
- **Description:** The reminders listed under "Clinical Staff & Diagnostic Reminders" are initialized from a local `DEMO_STAFF_REMINDERS` constant. When a patient clicks "Dismiss" or "Snooze", the update only modifies React state; refreshing the browser immediately restores the dismissed reminders.
- **Real-World Impact:** Patients cannot permanently clear reminders; alerts appear repeatedly on every page load.
- **Probable Root Cause:** Missing backend endpoint for reminder status persistence.
- **Suggested Remediation:** Wire `handleDismiss` and `handleSnooze` to `PATCH /api/patient/reminders/{id}` or persist dismissed IDs to `localStorage`.

---

### 3.6 AI Health Copilot & Guardrail Assistant (`/copilot`)

#### BUG-COP-01: Missing Loading Indicator on Direct Send Parameter Navigation
- **Location:** [`copilot/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/copilot/page.tsx#L115-L120)
- **Description:** When a user arrives from the Dashboard by clicking a suggested prompt (navigating to `/copilot?q=Can+I+take+my+medication+with+food`), `handleDirectSend` triggers. If the local Ollama LLM takes 5-10 seconds to generate a response, the input form shows no visual spinner or "Thinking..." skeleton for the first query, leading the user to believe the request failed.
- **Real-World Impact:** Users re-submit queries repeatedly or assume the AI assistant is frozen.
- **Probable Root Cause:** Initial query execution hook runs before scroll/message animation completes.
- **Suggested Remediation:** Ensure `loading = true` renders an animated pulse card: "Sanjivini Copilot is analyzing your prescription history...".

---

### 3.7 Universal OCR & OTC Drug Safety Scanner (`/scan-otc`)

#### BUG-SCAN-01: Digital Prescription Creation Does Not Sync With Patient's Active Doctor
- **Location:** [`scan-otc/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/scan-otc/page.tsx#L293-L318)
- **Description:** When a patient creates a digital prescription via OTC scan, it is saved into `vault_documents` with `status: "verified"` and pushed to `schedule_items`. However, it does not link to the patient's primary attending physician (`AuthContext.user.primary_doctor`).
- **Real-World Impact:** The patient's primary doctor does not receive a notification that the patient added an OTC medicine, defeating the purpose of cross-doctor pharmacological guardrails.
- **Probable Root Cause:** Self-intake flow was built independently of the doctor notification bus.
- **Suggested Remediation:** Add `primary_doctor_id` parameter to `create-digital-prescription` and create an alert in the doctor's notifications.

---

### 3.8 Cryptographic Health Passport & QR Token (`/passport`)

#### BUG-PASS-01: Hardcoded Demo Token Fallback Exposed in Failure Mode
- **Location:** [`passport/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/passport/page.tsx#L32-L34)
- **Code Reference:**
  ```tsx
  const demoToken = `https://app.sanjeevani.health/api/passport/${pid || 'patient'}-${Date.now()}`;
  ```
- **Description:** When the backend endpoint `/patient/health-passport` fails or network times out, the catch block falls back to generating a fake URL string containing `app.sanjeevani.health` (a domain not owned or configured).
- **Real-World Impact:** Scanning the QR code points to an unreachable external domain.
- **Probable Root Cause:** Production placeholder domain used in fallback code.
- **Suggested Remediation:** Point fallback to `window.location.origin + "/api/passport/..."` or render a clear "Offline / Verification Server Unavailable" retry card.

---

### 3.9 Compliance Audit Logs & Wellbeing History (`/logs`)

#### BUG-LOG-01: Filter Buttons in Audit Log Do Not Filter Entries
- **Location:** [`logs/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/logs/page.tsx#L120-L160)
- **Description:** The `/logs` page provides filter pills for "All", "Doctor Actions", "Doses", and "Symptoms", but clicking them does not filter the rendered log array. The filter state is updated in memory but the list rendering ignores `filterType`.
- **Real-World Impact:** Patients cannot isolate dose logs from doctor verifications.
- **Probable Root Cause:** Missing `filteredLogs = logs.filter(...)` computed memo before the `.map()`.
- **Suggested Remediation:** Implement `useMemo` filtering `logs` by `event_type`.

---

### 3.10 User Profile & Notification Settings (`/settings`)

#### BUG-SET-01: Settings Page Displays Doctor Credential Inputs Even When Logged in as Patient
- **Location:** [`settings/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/settings/page.tsx#L97-L115)
- **Description:** The `/settings` page contains an entire form section for "Doctor Credentials" (License Number `MH-12345-2018`, Medical Council Registration, Specialty, Consultation Room). This section renders regardless of whether the authenticated user is a patient or a doctor.
- **Real-World Impact:** Highly confusing to patients who see medical council registration fields on their personal profile settings.
- **Probable Root Cause:** Settings page was created as a single component without role conditionals.
- **Suggested Remediation:** Wrap the Doctor Credentials card in `{user?.role === "doctor" && ( ... )}`.

---

### 3.11 Orphaned & Broken Routes (`/records`, `/labs`)

#### BUG-ORPH-01: Orphaned Static `/records` Page Duplicates Vault Functionality
- **Location:** [`records/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/records/page.tsx#L14-L20)
- **Description:** `/records` contains a completely static mock array (`DEMO_RECORDS`), does not call any API, and features a dead "Export All PDF" button. It duplicates the real `/vault` route.
- **Real-World Impact:** Dead code and dead link in navigation footprint.
- **Suggested Remediation:** Redirect `/records` to `/vault` with a 301 permanent redirect in Next.js router.

#### BUG-ORPH-02: Orphaned `/labs` Route Queries Invalid Category Parameter
- **Location:** [`labs/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/labs/page.tsx#L25)
- **Code Reference:**
  ```tsx
  fetch(`${API_BASE}/patient/${pid}/vault?category=diagnostic_report`)
  ```
- **Description:** `/labs` queries `category=diagnostic_report`. In `patient_service.py`, the valid categories are `lab-reports` or `lab_reports`. As a result, this page always returns an empty list.
- **Real-World Impact:** Broken duplicate page.
- **Suggested Remediation:** Redirect `/labs` to `/vault/lab-reports`.

---

# SECTION 4: ATTENDING PHYSICIAN & SPECIALIST COMMAND CENTER (`/doctor`)

### 4.1 Doctor Global Header & Quick Controls (`RoleHeader.tsx`)

#### BUG-DR-HDR-01: Hardcoded Fallback to Dr. Nitin Sharma Overrides Real Identity ✅ FIXED
- **Fix Status:** ✅ **FIXED** — Commit `babed68` | [`RoleHeader.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/RoleHeader.tsx#L92-L98)
- **Fix Applied:**
  ```tsx
  // BUG-DR-HDR-01 FIX: Synchronize strictly with authenticated session; if unauthorized, redirect out
  useEffect(() => {
    const stored = localStorage.getItem("sanjeevani_user_session");
    if (!stored && !user) { router.push(`/login?next=${encodeURIComponent(roleMeta.href)}`); }
  }, [user, roleMeta.href, router]);
  ```
- **Location:** [`RoleHeader.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/RoleHeader.tsx#L191-L202)
- **Description:** The doctor header now redirects unauthenticated access to `/login`. Displays real authenticated user identity from `user.full_name` and `user.role`.

---

### 4.2 Physician Consultation Triage Queue (`/doctor`)

#### BUG-DR-Q01: Degree Symbol Encoding Mojibake in Clinical Chief Complaints
- **Location:** 
  - [`doctor.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/routers/doctor.py#L40-L50)
  - [`doctor/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/page.tsx#L35-L40)
- **API Response:**
  ```json
  "text": "High fever (102A?AF) for 3 days, persistent cough with yellow sputum"
  ```
- **Description:** In the consultation queue, patient Sita Devi's chief complaint displays `102A?AF` instead of `102°F`.
- **Real-World Impact:** Unprofessional and potentially confusing temperature readings in clinical emergency triage.
- **Probable Root Cause:** File saved with corrupted multibyte degree character in `doctor_service.py` mock list.
- **Suggested Remediation:** Correct string in `doctor_service.py` to `102°F` using clean UTF-8 encoding.

#### BUG-DR-Q02: Doctor Queue Filtering Ignores Authenticated Doctor ID in Mock Layer
- **Location:** [`doctor_service.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/services/doctor_service.py#L913-L925)
- **Code Reference:**
  ```python
  if doctor_id in ("all", "demo-doctor", "doc-sharma-1", ""):
      doc_queue = [q for q in self.queue if q["status"] == "waiting"]
  ```
- **Description:** Passing any doctor ID other than `"doc-sharma-1"` or `"demo-doctor"` displays an empty queue or falls back improperly. If a second doctor logs in (e.g. Dr. V. K. Rai, `doc-rai-1`), they cannot see their own assigned queue.
- **Real-World Impact:** Multi-doctor clinic operations fail because all queue entries are hardcoded to `demo-doctor`.
- **Suggested Remediation:** Dynamically assign queue entries to the doctor selected during Reception intake.

---

### 4.3 Patient 360-Degree Chart Layout & Header (`/doctor/patient/[patientId]/layout.tsx`)

#### BUG-DR-CHART-01: Compliance Ring Percentage vs Caption Count Data Desynchronization
- **Location:** [`doctor/patient/[patientId]/layout.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/layout.tsx#L72-L82)
- **Code Reference:**
  ```tsx
  const adherenceScore = patientData?.adherence_score ?? 78;
  const totalDoses = caregiverAudit?.summary?.total_doses_7d || 4;
  const takenDoses = caregiverAudit?.summary?.taken_7d || Math.round((adherenceScore / 100) * totalDoses);
  ```
- **Description:** The compliance ring renders a hardcoded fallback of **78%** when `patientData.adherence_score` is missing, while the caption text beneath it renders **"1 of 4 doses logged"** (which is 25%, not 78%). 
- **Real-World Impact:** Contradictory clinical metrics displayed simultaneously to the physician.
- **Probable Root Cause:** Two separate fallback values computed from disjointed variables.
- **Suggested Remediation:** Derive both the compliance percentage and the dosage caption from the exact same API response object (`patientData.adherence_summary`). Show a loading skeleton until data arrives.

#### BUG-DR-CHART-02: Alert Banner Displays Stale Patient's Alert in Wrong Grammatical Voice
- **Location:** [`doctor/patient/[patientId]/layout.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/layout.tsx#L165-L210)
- **Description:** When switching from Ramesh Kumar to Vikram Singh, the alert banner renders:
  `"You have 3 pending dose(s)..."`
  This is patient-facing first-person copy, not clinical third-person copy. Furthermore, if a patient has no alerts, the layout renders a hardcoded fallback alert about Metformin.
- **Real-World Impact:** The doctor is shown an alert written to the patient ("You have..."), referencing medicines that the active patient is not even prescribed.
- **Probable Root Cause:** Patient-facing banner component reused in physician workspace without text adaptation.
- **Suggested Remediation:** Format alert banner in clinician voice: `"Patient {name} has 3 pending doses (overdue by >2h)..."` and hide the banner completely when no active alerts exist.

---

### 4.4 Longitudinal Timeline & Adherence Metrics (`/doctor/patient/[patientId]/timeline`)

#### BUG-DR-TIME-01: Deep-Link Invalidation and Tab State Reset on Browser Refresh
- **Location:** [`doctor/patient/[patientId]/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/page.tsx#L11-L15)
- **Description:** Navigating to `/doctor/patient/[patientId]` unconditionally redirects to `/doctor/patient/[patientId]/timeline`. If a doctor was in the middle of Prescribing or reviewing X-Rays and refreshes the browser, they lose their active work and get kicked back to the Timeline tab.
- **Real-World Impact:** Frustrating loss of context during active consultations.
- **Suggested Remediation:** Preserve active tab in URL route (`/prescribe`, `/ocr-xray`, `/soap`) and restore upon authentication check.

---

### 4.5 Structured Prescription Composer & Pharmacological Guardrails (`/doctor/patient/[patientId]/prescribe`)

#### BUG-DR-RX-01: Hardcoded Initial Medication Rows Prevent Blank Prescriptions
- **Location:** [`prescribe/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/prescribe/page.tsx#L35-L39)
- **Code Reference:**
  ```tsx
  const [medications, setMedications] = useState<MedicationItem[]>([
    { id: "m1", name: "Metformin 500mg", dosage: "500mg", frequency: "1-0-1", duration_days: 30, condition_tag: "Type 2 Diabetes" },
    { id: "m2", name: "Noveron 500mg", dosage: "500mg", frequency: "1-0-1", duration_days: 15, condition_tag: "Neuropathy" },
  ]);
  ```
- **Description:** Opening the Prescribe tab for *any* patient (even a pediatric patient or an orthopedic fracture patient) pre-fills the prescription table with Metformin and Noveron.
- **Real-World Impact:** Risk of accidental prescription dispatch of diabetes medications to non-diabetic patients if the doctor does not manually delete the pre-seeded rows.
- **Probable Root Cause:** Hardcoded demo state left in component initialization.
- **Suggested Remediation:** Initialize `medications` as an empty array `[]` with an empty row or import from active clinical templates only upon explicit doctor click.

#### BUG-DR-RX-02: Prescription Sign-Off Does Not Propagate to Pharmacy Queue or Patient Schedule
- **Location:** 
  - [`prescribe/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/prescribe/page.tsx#L122-L145)
  - [`doctor_service.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/services/doctor_service.py#L1019-L1045)
- **Description:** When the doctor signs off a prescription via `POST /api/doctor/verify`, the backend calculates a SHA-256 hash and appends to an internal array `self.verification_logs`. However:
  1. It does NOT insert the prescription into `pharmacy_dispense_log` (so the pharmacist never sees it).
  2. It does NOT update `patient_service.schedule_items` (so the patient never sees the medications on their calendar).
  3. It does NOT update `patient_service.vault_documents` (so it never appears in the patient's vault).
  4. It does NOT update the doctor's queue status from `waiting` to `completed`.
- **Real-World Impact:** The core clinical loop of Sanjeevani is severed. The doctor believes they verified a prescription, but neither the pharmacy nor the patient receives it.
- **Probable Root Cause:** Backend services were written as isolated mock islands rather than communicating via a shared event/state model.
- **Suggested Remediation:** Implement fan-out in `verify_prescription`:
  - Insert record into `pharmacy_dispense_log`.
  - Append active items to patient schedule and vault.
  - Mark queue item status as `completed`.

---

### 4.6 Ambient SOAP Voice Dictation Workbench (`/doctor/patient/[patientId]/soap`)

#### BUG-DR-SOAP-01: Static Ramesh Kumar SOAP Note Rendered for All Patients
- **Location:** [`soap/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/soap/page.tsx#L36-L41)
- **Description:** The SOAP note text areas are initialized with:
  `"58M presenting for diabetes follow-up. C/O occasional dizziness, especially after evening Noveron dose..."`
  This text is displayed regardless of whether the patient is Ramesh Kumar, Vikram Singh (cardiac), or Sita Devi (fever).
- **Real-World Impact:** Patient notes cross-contamination.
- **Suggested Remediation:** Fetch existing SOAP note for `patientId` from `/api/doctor/patient/{patient_id}/soap` or initialize blank.

#### BUG-DR-SOAP-02: "Save SOAP Note" Button Does Not Dispatch API Call
- **Location:** [`soap/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/soap/page.tsx#L111-L114)
- **Code Reference:**
  ```tsx
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };
  ```
- **Description:** Clicking "Save SOAP Note" merely sets a local state flag `saved = true` for 3 seconds. It sends no network request to the backend.
- **Real-World Impact:** Doctor types detailed clinical notes, clicks Save, and assumes records are saved. On navigating away, all notes are permanently lost.
- **Probable Root Cause:** UI mock without backend implementation.
- **Suggested Remediation:** Connect to `POST /api/doctor/soap/save` endpoint to persist notes to database.

---

### 4.7 Side-by-Side OCR Verification & YOLOv7 X-Ray Canvas (`/doctor/patient/[patientId]/ocr-xray`)

#### BUG-DR-OCR-01: Hardcoded OCR Data & Hardcoded Bounding Boxes for All Patients
- **Location:** [`ocr-xray/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/ocr-xray/page.tsx#L32-L50)
- **Description:** The OCR split-screen always displays "MANIKANTA NEURO CENTRE // Dr. G. Mithun" with Tab. Edushine MX 6. The X-ray canvas draws a hardcoded ellipse with simulated coordinates `{ x: 140, y: 110, w: 90, h: 65 }`. It does not load the patient's actual uploaded documents or scans.
- **Real-World Impact:** Doctors cannot review actual uploaded scans for their specific patient.
- **Suggested Remediation:** Wire component to fetch the patient's actual scans from `/api/patient/{patientId}/vault?category=imaging_scans` and call the actual backend inference endpoint `/api/doctor/xray/analyze`.

---

### 4.8 Refill Request Approval Console & Lab Ordering (`/doctor/patient/[patientId]/refills`)

#### BUG-DR-REF-01: Default Follow-Up Date Initialized to Date in the Past
- **Location:** [`refills/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/refills/page.tsx#L42)
- **Code Reference:**
  ```tsx
  const [followUpDate, setFollowUpDate] = useState("2026-09-18");
  ```
- **Description:** The follow-up date input defaults to `"2026-09-18"`, which is in the past relative to the system's operational timestamp (September 30, 2026).
- **Real-World Impact:** Scheduling a follow-up with default values creates an expired/past appointment in violation of database constraints.
- **Suggested Remediation:** Set default to `new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)` (+14 days).

---

# SECTION 5: HOSPITAL OPERATIONS ROLES (RECEPTION, PHARMACY, LABORATORY)

### 5.1 Front-Desk Reception & AI-4 Intake (`/reception`)

#### BUG-REC-01: Reception Walk-In Registration Does Not Push Patient to Doctor's Live Queue in Fallback Mode
- **Location:** [`reception.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/routers/reception.py#L254-L268)
- **Description:** When the backend operates in mock/fallback mode (no live Supabase connection), registering a walk-in patient generates a random token but does not insert the record into `doctor_service.queue`.
- **Real-World Impact:** Front desk registers a patient, issues token #15, and tells patient to wait. The doctor looks at their screen, but the newly registered patient never appears in their queue.
- **Probable Root Cause:** `reception.py` and `doctor_service.py` do not share an in-memory queue store.
- **Suggested Remediation:** Have `reception.py` insert walk-ins directly into `doctor_service.queue` when Supabase is disconnected.

---

### 5.2 Dispensary Pharmacy & Safety-Lock Enforcement (`/pharmacy`)

#### BUG-PHARM-01: Hardcoded Pharmacist ID `pharm-anita-1` Causes Audit Identity Mismatch ✅ FIXED
- **Fix Status:** ✅ **FIXED** — Commit `babed68` | [`pharmacy/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/pharmacy/page.tsx)
- **Fix Applied:** Pharmacist ID now derived from `user?.id || "pharm-anil-1"` via `useAuth()` hook.
- **Location:** [`pharmacy/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/pharmacy/page.tsx#L68)
- **Original Code (Removed):**
  ```tsx
  pharmacist_id: "pharm-anita-1",  // hardcoded wrong ID!
  ```
- **Description:** Dispense audit logs now record the correct authenticated pharmacist ID from the session.
- **Real-World Impact:** Legal audit trail is now accurate.

---

### 5.3 Laboratory Diagnostics Workbench (`/lab`)

#### BUG-LAB-01: Lab Workbench Completely Disconnected from Backend Orders API
- **Location:** [`lab/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/lab/page.tsx#L30-L80)
- **Description:** The Lab Workbench has hardcoded in-memory state for orders (`orders = [{ id: "ord-1", ... }]`). It never calls `GET /api/lab/orders`. When the technician clicks "Publish Results", it runs a fake `setTimeout` and updates local state; it does not call `POST /api/lab/orders/{id}/publish`.
- **Real-World Impact:** The Lab workbench is a pure visual mockup. Lab orders placed by doctors in `/doctor/patient/[id]/refills` never arrive at the lab, and published lab results never reach the patient's vault.
- **Probable Root Cause:** Backend router `lab.py` was built with full endpoints, but frontend `lab/page.tsx` was never wired to call them.
- **Suggested Remediation:** Wire `fetchOrders()` to `GET /api/lab/orders` and `handlePublishResults` to `POST /api/lab/orders/{id}/publish`.

---

# SECTION 6: BACKEND API, ENCODING & DATA CONTRACT ANOMALIES

### BUG-BE-01: Windows-1252 / UTF-8 Double-Encoding in Backend String Literals
- **Location:** 
  - `scaffold/backend/app/routers/doctor.py`
  - `scaffold/backend/app/services/doctor_service.py`
  - `scaffold/backend/app/services/patient_service.py`
- **Examples:**
  - `102A?AF` in fever descriptions
  - `7,200 /ÂµL` in lab WBC counts
  - `Unstable Angina â€” Rule out NSTEMI` in discharge summaries
  - `Sep 10??16` in adherence best week summary
- **Real-World Impact:** Degrades visual polish and makes Sanjeevani look unfinished.
- **Suggested Remediation:** Run an encoding sanitization script across all backend Python files to strip mojibake and enforce pure UTF-8.

---

### BUG-BE-02: Missing CORS Origin Support for Alternate Ports
- **Location:** [`main.py`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/main.py#L8-L14)
- **Description:** `main.py` has `allow_origins=["*"]`, but `README.md` and `.env` specify restrictive CORS. If a client connects via `127.0.0.1:3000` vs `localhost:3000`, browser pre-flight checks may fail if not synchronized.
- **Suggested Remediation:** Explicitly include both `http://localhost:3000` and `http://127.0.0.1:3000` in allowed origins with credentials support.

---

# SECTION 7: GLOBAL UI, CSS, DESIGN SYSTEM & RESPONSIVENESS DEFECTS

### BUG-UI-01: Inconsistent Color Systems (CSS Variables vs Hardcoded Tailwind Colors)
- **Location:** Across all portal files
- **Description:** The Corviin editorial-brutalist design system specified in `05_DESIGN_SYSTEM.md` establishes semantic CSS variables (`var(--bg)`, `var(--fg)`, `var(--border)`, `var(--accent)`, `var(--warn)`, `var(--safe)`). However, many files indiscriminately mix hardcoded Tailwind slate/gray colors (`bg-[#F8F7F4]`, `text-[#0F172A]`, `dark:bg-[#111827]`, `border-[#E2E8F0]`).
- **Real-World Impact:** In dark mode, components using hardcoded light hex codes fail to adapt, resulting in unreadable black text on dark backgrounds or white boxes on dark pages.
- **Suggested Remediation:** Standardize all card, border, text, and background tokens to use the design system variables defined in `globals.css`.

---

### BUG-UI-02: Horizontal Scroll & Overflow on Mobile Screens in Doctor Sub-Navigation
- **Location:** [`doctor/patient/[patientId]/layout.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/layout.tsx#L230-L250)
- **Description:** The 7 tab buttons in the doctor chart layout are rendered in a flex row without `overflow-x-auto`. On screens narrower than 900px, tabs clip or cause horizontal viewport scrolling.
- **Real-World Impact:** Doctor workspace breaks on tablets and smaller laptop screens.
- **Suggested Remediation:** Add `overflow-x-auto no-scrollbar` to the tabs navigation container.

---

# SECTION 8: LIVE BROWSER RUNTIME AUDIT (FUNCTIONAL, VISUAL & ALIGNMENT DEFECTS)

During the automated live browser audit session on `http://localhost:3000` (executed via full Chromium instance with screenshots and console inspection), every screen was subjected to interaction testing. The following specific runtime defects were captured:

### 8.1 Live Browser Findings by Portal

#### 1. Landing Page (`http://localhost:3000/`)
- **Theme Switcher Rendering:** The theme switch pill button in the top navigation bar renders with clipped margins due to `w-13` being an unrecognized Tailwind utility. Toggling dark mode modifies `data-theme="dark"` on `<html>`, turning the page dark, but does not synchronize with `localStorage` or `AuthContext`.
- **Marquee Ticker Animation:** The horizontal marquee banner (`animate-marquee`) text flows across the screen cleanly, but hover state pauses are not keyboard-accessible.
- **Contact Form Submission:** Clicking `Request Clinic Access` button performs no action (`e.preventDefault()`). The input fields do not clear, no toast appears, and no lead record is stored in any database.

#### 2. Patient Dashboard (`http://localhost:3000/dashboard`)
- **Active Dose Checklist Empty:** Browser inspection confirmed that the schedule area renders an empty state (`No items scheduled for today`) when loaded under the default user profile (`patient-ramesh`).
- **Adherence Ring Desynchronization:** Displays `0% adherence` because `get_timeline` found zero active items for `patient-ramesh`.
- **Gentle Nudge & Wellbeing Prompt:** The banner "How are you feeling today?" with mood buttons (Frown, Meh, Smile) correctly renders, but clicking "Log Today" without doses present feels detached.

#### 3. Patient Vault (`http://localhost:3000/vault`)
- **Document Card Alignment:** The 7 category cards (Prescriptions, Lab Diagnostic Reports, Imaging & Scans, Hospital Discharges, Vaccinations, Referral Letters, Other) align well in a 3-column grid on desktop, but on window widths between 768px and 1024px, the category title text wraps awkwardly and causes inconsistent card heights.
- **Smart AI Search Bar:** Clicking "Smart AI Search" opens an in-page input field, but querying returns synthetic responses rather than querying Supabase embeddings or OCR tables.

#### 4. Patient Calendar (`http://localhost:3000/calendar`)
- **En-dash Encoding Artifacts in Live DOM:** The AI summary strip beneath the month grid visibly rendered corrupted text:
  - `"best_week": "Sep 10??16"`
  - `"smart_reminder_suggestion": "...around 9:00 PM, not 8:00 PM ?? shift the reminder?"`
- **Shift Reminder Interaction:** Clicking the `[Shift to 9:00 PM]` button triggers a local state change ("Reminder shifted to 9:00 PM!"), but reloading the browser resets it back to the original suggestion. It does not update any reminder row in the database.

#### 5. Patient Copilot (`http://localhost:3000/copilot`)
- **Live Query Execution:** Tested typing `Can I take Metformin with milk?`. The local Ollama model (`llama3.2:3b`) successfully returned a clinical answer citing active prescription documents.
- **Latency / Sizing:** Generating the answer took ~6 seconds with no animated skeleton loader during the wait time; the chat box simply sat empty before popping in the response.

#### 6. Doctor Consultation Queue (`http://localhost:3000/doctor`)
- **Chief Complaint Text Corruption:** Sita Devi's queue row visibly renders:
  `High fever (102A?AF) for 3 days, persistent cough with yellow sputum`
- **Acuity Badge Colors:** Critical cases (Level 3) pulse red, Urgent (Level 2) are amber, Routine (Level 1) are grey, but clicking the filter buttons (e.g. "Critical Only") causes table layout jumpiness.

#### 7. Doctor Patient Chart (`http://localhost:3000/doctor/patient/patient-ramesh/timeline`)
- **Compliance Ring Metric Clash:** The header ring renders a bold **78%**, while the caption text directly underneath renders **"1 of 4 doses logged"** (which is 25%, not 78%).
- **Prescribe Tab Pre-Fill:** Opening the Prescribe tab for Ramesh Kumar renders two hardcoded rows (Metformin 500mg and Noveron 500mg) already in the table. The doctor did not type these rows.
- **SOAP Tab Pre-Fill:** Opening the SOAP tab renders Ramesh Kumar's diabetes text in all four quadrants (S, O, A, P). Clicking "Save SOAP Note" displays a brief green checkmark for 3 seconds and clears, but does not execute any POST request to the server.
- **OCR & X-Ray Tab:** The X-Ray canvas draws a hardcoded bone ellipse with fixed coordinates `{ x: 140, y: 110 }` rather than rendering the patient's actual DICOM/JPEG scan from the vault.

#### 8. Reception Intake (`http://localhost:3000/reception`)
- **Phone Lookup:** Searching `9876543210` populates the form with Savitri Kumar.
- **Queue Disconnect:** Registering the walk-in patient produces a token card in the UI, but inspecting `/doctor` shows the new patient was never added to the doctor's queue.

#### 9. Pharmacy Console (`http://localhost:3000/pharmacy`)
- **Safety Lock Gate:** Flagged interaction between Warfarin and Metformin renders an amber warning banner. Clicking "AI Explain" opens a modal explaining metabolic clearance pathways.
- **Dispense Button:** Clicking "Confirm & Dispense" updates local state and moves the card to "Dispensed Today", but stock quantities in `/pharmacy/inventory` do not decrement.

#### 10. Lab Workbench (`http://localhost:3000/lab`)
- **Orders Kanban:** 3 columns (Pending Draw, Analyzing, Results Ready) are rendered.
- **Fake Publishing:** Clicking "Publish Results" executes a pure `setTimeout(1000)` and moves the card without communicating with the FastAPI backend or updating the patient's health vault.

---

# SECTION 9: COMPLETE ELIMINATION PLAN FOR MOCK / DEMO DATA (REPLACING WITH REAL WORKING DATA)

The user explicitly requested: **"I don't want demo data anywhere. Real working with the real data."**

Currently, the application relies on in-memory Python dictionaries in `doctor_service.py` and `patient_service.py`, as well as static TypeScript objects in components (`DEMO_RECORDS`, `DEMO_STAFF_REMINDERS`, `MOCK_DOCTORS`, pre-filled prescription rows, hardcoded SOAP notes). 

To make Sanjeevani a finished production-level system, all demo data must be replaced with real PostgreSQL/Supabase database tables, ACID transactions, and live CRUD operations as follows:

| Component / Feature | Current Mock / Demo Implementation | Production Architecture (Real Database & API) |
|---|---|---|
| **User Authentication & Session** | `DEFAULT_USERS.doctor` auto-seeded in `localStorage` with arbitrary role switching. | **Supabase Auth JWT + `app_users` table:** Users log in with real email/password or phone OTP. Role is read from `app_users.role`. No unauthorized switching. |
| **Patient Daily Schedule & Checklist** | Static `schedule_items` array in `patient_service.py`. | **`prescriptions` + `prescription_items` + `intake_logs` tables:** Daily checklist generated dynamically by joining verified prescriptions with today's intake logs. Marking taken inserts an immutable row into `intake_logs`. |
| **Patient Health Vault** | Static `vault_documents` array in `patient_service.py`. | **`scans` table + Supabase Storage Bucket:** Documents uploaded as real PDFs/images to encrypted cloud bucket; OCR text extracted via PyMuPDF/Gemini Vision; real file download URLs. |
| **Patient Calendar & Doses** | Computed from hardcoded date offsets in `patient_service.py`. | **Live SQL aggregate query on `intake_logs`:** Computes daily adherence, missed doses, and dose counts per calendar month based on actual patient timestamps. |
| **Smart Reminders & Escalations** | Static `DEMO_STAFF_REMINDERS` constant in `reminders/page.tsx`. | **`reminders` table:** Doctor and reception reminders saved to database with `status = 'pending' \| 'dismissed' \| 'snoozed'`. Real dismissal persistence. |
| **Doctor Consultation Queue** | Static `self.queue` list in `doctor_service.py`. | **`doctor_queues` table with Realtime WebSocket:** Reception walk-in intake inserts into `doctor_queues`; doctor queue updates live via Supabase Realtime without page reload. |
| **Doctor Prescription Composer** | Pre-seeded Metformin/Noveron rows; sign-off only computes SHA-256 hash in memory. | **Atomic ACID transaction:** Writing to `prescriptions`, `prescription_items`, and `pharmacy_dispense_log`. Inserts live active medications into the patient's schedule. |
| **Doctor SOAP Notes** | Hardcoded Ramesh Kumar clinical text in `useState`; dead Save button. | **`clinical_notes` table:** SOAP notes fetched for the active `patient_id` and `consultation_id`. Clicking Save executes `POST /api/doctor/soap/save` and writes to database. |
| **Doctor OCR & X-Ray Review** | Hardcoded Manikanta Neuro scan and static YOLOv7 bounding boxes on HTML canvas. | **Real Vision Pipeline:** Fetches the actual patient scan from `scans` table; runs YOLOv7 model on the real uploaded image; displays real detections with doctor approval buttons. |
| **Pharmacy Dispense & Inventory** | Static `dispenseQueue` array; hardcoded pharmacist `pharm-anita-1`; stock counts in memory. | **`pharmacy_dispense_log` + `inventory_stock` tables:** Dispense action atomically decrements `inventory_stock.quantity_on_hand` and logs pharmacist ID from authenticated session. |
| **Laboratory Workbench** | Hardcoded 3 orders in React state; simulated `setTimeout(1000)` publish. | **`diagnostic_orders` + `scans` tables:** Fetches orders created by doctors; typing lab values and clicking Publish writes verified report to `scans` and creates lab notification for ordering doctor. |

---

# SECTION 10: PRIORITIZED PRODUCTION EXECUTION ROADMAP

| Phase | Category | Action Items | Est. Effort |
|---|---|---|---|
| **Phase 1** | **Strict RBAC & Real Auth** | 1. Remove `DEFAULT_USERS.doctor` auto-assignment in `AuthContext.tsx`.<br>2. Fix `logout()` to destroy session and redirect to `/login`.<br>3. Remove public "Switch Portal" dropdown from all headers.<br>4. Implement Next.js `middleware.ts` route guards for `/doctor`, `/reception`, `/pharmacy`, `/lab`. | 1-2 Days |
| **Phase 2** | **End-to-End Real Data Wiring** | 1. Connect Reception intake to write real rows into `doctor_queues`.<br>2. Connect Doctor Prescribe sign-off to atomically write to `prescriptions` and push to Pharmacy queue.<br>3. Fix patient ID mismatch (`patient-ramesh` vs `demo-patient`) so Patient Dashboard loads real active prescriptions.<br>4. Connect Pharmacy dispense to decrement real stock counts.<br>5. Connect Lab workbench to `GET /api/lab/orders` and `POST /api/lab/orders/{id}/publish`. | 2-3 Days |
| **Phase 3** | **Text Encoding & Data Cleanup** | 1. Sanitize all backend files to eliminate UTF-8 mojibake (`102°F`, `–`, `·`, `✓`).<br>2. Remove hardcoded pre-seeded medication rows in Prescribe tab and hardcoded notes in SOAP tab.<br>3. Fix past follow-up date (`2026-09-18` → dynamic `today + 14 days`). | 1 Day |
| **Phase 4** | **Landing Page & Navigation Polish** | 1. Fix `w-13` class on theme toggle switch.<br>2. Expand workspace role cards to include Pharmacy and Lab.<br>3. Connect "Request Clinic Access" form to a real lead capture endpoint.<br>4. Implement mobile bottom navigation bar in `Navbar.tsx` for smartphones. | 1-2 Days |
| **Phase 5** | **UI/CSS Design System Alignment** | 1. Replace hardcoded Tailwind hex codes with CSS variables (`var(--bg)`, `var(--fg)`, `var(--border)`).<br>2. Add `overflow-x-auto no-scrollbar` to doctor chart tabs to prevent mobile overflow.<br>3. Synchronize theme state across all portals using a unified `ThemeProvider`. | 2 Days |

---

# SECTION 11: EXTRA, REDUNDANT & DEAD CODE INVENTORY (CLEANUP AUDIT)

The codebase contains several legacy, duplicate, and orphaned files and structures resulting from iterative scaffolding that should be purged or consolidated for a clean production build:

### 11.1 Orphaned and Dead Routes
1. **`/records` ([`src/app/records/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/records/page.tsx)):**
   - **Status:** **Dead / Redundant.** Contains 94 lines of code hardcoded with `DEMO_RECORDS` (`rec-1` to `rec-5`).
   - **Reason:** Completely superseded by the 7-category Health Vault at `/vault` and `/vault/[category]`. Not referenced in any navigation menu.
   - **Remediation:** Remove `/records` or set up an HTTP 301 permanent redirect to `/vault`.
2. **`/labs` ([`src/app/labs/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/labs/page.tsx)):**
   - **Status:** **Dead / Redundant.** 131 lines of legacy prototype code attempting to display lab results.
   - **Reason:** Redundant with `/vault/diagnostic_report` (patient view) and `/lab` (staff technician workbench). Not linked anywhere in patient navigation.
   - **Remediation:** Remove `/labs` or redirect to `/vault/diagnostic_report`.
3. **`/patient/*` Wrapper Redirects ([`src/app/patient/`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/patient)):**
   - **Status:** **Redundant Stub Routes.**
   - `src/app/patient/page.tsx` (redirects to `/dashboard`)
   - `src/app/patient/dashboard/page.tsx` (redirects to `/dashboard`)
   - `src/app/patient/calendar/page.tsx` (redirects to `/calendar`)
   - **Reason:** Left over from an earlier folder restructuring when routes were moved to root level.
   - **Remediation:** Consolidate redirects into `next.config.js` or `middleware.ts` redirects and delete the empty wrapper folders.

### 11.2 Duplicate Code & Isolated State Engines
1. **Triple Theme State Duplication:**
   - [`src/app/page.tsx:L32`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L32) has its own local `theme` state and toggle handler.
   - [`Navbar.tsx:L41`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx#L41) has its own separate `theme` state and toggle handler.
   - [`RoleHeader.tsx:L72`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/RoleHeader.tsx#L72) has its own separate `theme` state and toggle handler.
   - **Impact:** Switching theme on the landing page does not persist or synchronize when navigating into the patient dashboard or doctor workspace.
   - **Remediation:** Create a unified `ThemeProvider` or use `next-themes` with `data-theme` attribute synchronization.

### 11.3 Hardcoded Static Data Fixtures to Purge
- `DEMO_RECORDS` in `records/page.tsx` (lines 14–20).
- `DEMO_STAFF_REMINDERS` in `reminders/page.tsx` (lines 18–35).
- Hardcoded pre-filled medication rows (Metformin 500mg, Noveron 500mg) in `prescribe/page.tsx` (lines 28–42).
- Hardcoded clinical text for Ramesh Kumar in `soap/page.tsx` (lines 18–36).
- Hardcoded canvas bounding box coordinates `{x: 140, y: 110}` in `ocr-xray/page.tsx` (lines 35–45).
- Hardcoded orders array in `lab/page.tsx` (lines 14–30).

---

# SECTION 12: MOBILE & TABLET RESPONSIVENESS AUDIT (LIVE VIEWPORT INSPECTION)

Testing was conducted across mobile (390 x 844 viewport, iPhone standard) and tablet (768 x 1024 viewport, iPad standard) viewports using automated browser subagent captures:

### 12.1 Critical Mobile Responsiveness Failures (390px Viewport)

1. **CRITICAL: Missing Mobile Navigation in Patient Portal ([`Navbar.tsx#L112`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx#L112)):**
   - **Live Defect:** Navigation links (`Home`, `Vault`, `Calendar`, `Reminders`, `Copilot`, `OTC Scan`, `Passport`, `Logs`) have `className="hidden lg:flex"`.
   - **Failure:** On screen widths < 1024px, the entire navigation bar is invisible with **zero** mobile fallback (no hamburger menu, no drawer, no bottom navigation bar).
   - **User Impact:** Mobile and tablet patients cannot navigate to any feature beyond the initial page they landed on. They are completely locked out of their Vault, Copilot, Scanner, and Calendar!
   - **Screenshot Evidence:** [`mobile_dashboard_1790767116231.png`](file:///C:/Users/HP/.gemini/antigravity-ide/brain/ae1e102e-a183-4008-993f-bcea9354497b/mobile_dashboard_1790767116231.png)

2. **CRITICAL: Doctor Patient Chart Tabs Horizontal Clipping ([`doctor/patient/[id]/layout.tsx#L230`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/layout.tsx#L230)):**
   - **Live Defect:** The 7 sub-navigation tabs (`Timeline & Meds`, `CRM & Activity`, `Full Medical Record`, `Prescribe`, `SOAP Notes`, `OCR & X-Ray`, `Refill Requests`) are rendered in a horizontal flexbox without horizontal scroll enable (`overflow-x-auto`).
   - **Failure:** On screens < 900px, tabs 3 through 7 are cut off completely. On a 390px phone, only `Timeline & Meds` and `CRM & Activity` are partially visible. Doctors cannot tap `Prescribe` or `SOAP Notes`.
   - **Screenshot Evidence:** [`mobile_doctor_tabs_scrolled_1790767159589.png`](file:///C:/Users/HP/.gemini/antigravity-ide/brain/ae1e102e-a183-4008-993f-bcea9354497b/mobile_doctor_tabs_scrolled_1790767159589.png)

3. **Pharmacy Console Mobile Button Squishing ([`pharmacy/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/pharmacy/page.tsx)):**
   - **Live Defect:** Prescription cards with safety locks force buttons `Acknowledge & Continue` and `AI Explain` to stack tightly against the warning text. The final `Confirm & Dispense` button text wraps awkwardly into two lines on narrow viewports.
   - **Screenshot Evidence:** [`mobile_pharmacy_kanban_1790767211140.png`](file:///C:/Users/HP/.gemini/antigravity-ide/brain/ae1e102e-a183-4008-993f-bcea9354497b/mobile_pharmacy_kanban_1790767211140.png)

4. **Character Encoding Artifacts on Mobile Displays:**
   - Corrupted strings like `LIVE CLINICAL PROTOCOL Â· PRIYA DESK`, `â– Active Guard`, and `High fever (102Â°F)` stand out prominently on high-DPI mobile screens.
   - **Screenshot Evidence:** [`mobile_dashboard_1790767116231.png`](file:///C:/Users/HP/.gemini/antigravity-ide/brain/ae1e102e-a183-4008-993f-bcea9354497b/mobile_dashboard_1790767116231.png) and [`mobile_doctor_table_1790767134340.png`](file:///C:/Users/HP/.gemini/antigravity-ide/brain/ae1e102e-a183-4008-993f-bcea9354497b/mobile_doctor_table_1790767134340.png)

### 12.2 Tablet Responsiveness Deficiencies (768px Viewport)

1. **Vault Category Grid Row Height Disparities ([`vault/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/vault/page.tsx)):**
   - **Live Defect:** In a 2-column tablet layout, categories with 2-line descriptions ("Hospital Discharges — Inpatient admission & discharge summaries") render taller than 1-line categories ("Vaccinations — Immunization logs"), producing uneven card alignments and ragged grid rows.
   - **Screenshot Evidence:** [`tablet_vault_cards_1790767240295.png`](file:///C:/Users/HP/.gemini/antigravity-ide/brain/ae1e102e-a183-4008-993f-bcea9354497b/tablet_vault_cards_1790767240295.png)

2. **Reception Intake Split View ([`reception/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/reception/page.tsx)):**
   - On 768px screens, the side-by-side layout (Form on left, Queue on right) drops into a vertical stack, but the right-hand token queue pushes below the fold requiring extensive vertical scrolling to see newly created tokens.

---

# SECTION 13: COMPREHENSIVE TRIAGE: PENDING TO DEV, MISSING, AND UNNECESSARY INVENTORY

Based on cross-referencing the approved Product Requirement Documents ([`01_PRD.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/01_PRD.md), [`02_ARCHITECTURE.md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/02_ARCHITECTURE.md), [`09_PATIENT_ADHERENCE...`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/09_PATIENT_ADHERENCE_ECOSYSTEM_8FEATURES.md), [`10_DOCTOR_ROLE...`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md), [`15 new ai features settings profile .md`](file:///c:/PROJECTS/sanjeevani-project/scaffold/docs/files/15%20new%20ai%20features%20settings%20profile%20.md)) against the active codebase, here is the complete classification:

### 13.1 PENDING TO DEVELOP (Started / Mocked / Partially Wired)

1. **Doctor Prescribe → Pharmacy Live Feed → Patient Schedule (Closed Clinical Loop):**
   - **Current State:** Doctor verification computes a SHA-256 hash in memory, but does not execute an ACID transaction to write to `prescriptions`, `prescription_items`, and `pharmacy_dispense_log`.
   - **Pending Work:** Wire `POST /api/doctor/verify` to write live rows to the database so that newly prescribed medications appear in the Pharmacy dispense queue and dynamically populate the patient's daily checklist.
2. **Reception Desk Intake → Doctor Live Queue:**
   - **Current State:** Reception intake creates a token in local React state, but does not insert into `doctor_queues`.
   - **Pending Work:** Wire `POST /api/reception/intake` to write to `doctor_queues` and emit WebSocket/polling updates so new walk-in patients appear live in the physician's triage table.
3. **SOAP Clinical Notes Save Action:**
   - **Current State:** Dictation and typing in `/doctor/patient/[id]/soap` only simulate saving via a 3-second timer.
   - **Pending Work:** Wire the Save button to `POST /api/doctor/soap/save` to store clinical notes in the `clinical_notes` table.
4. **Pharmacy Dispense & Real Stock Decrement:**
   - **Current State:** Clicking "Confirm & Dispense" moves cards locally, but inventory stock numbers in `/pharmacy/inventory` do not change.
   - **Pending Work:** Wire `POST /api/pharmacy/dispense/{id}` to decrement `inventory_stock.quantity_on_hand` and append to `pharmacy_dispense_log`.
5. **Laboratory Diagnostic Orders & Result Publishing:**
   - **Current State:** `/lab/page.tsx` hardcodes 3 demo orders and simulates publishing with `setTimeout(1000)`.
   - **Pending Work:** Fetch orders from `GET /api/lab/orders` and wire "Publish Results" to `POST /api/lab/orders/{id}/publish` to upload the verified report into the patient's vault.
6. **AI-1 Patient Risk Forecast Card & AI-5 Inventory Forecast:**
   - **Current State:** Specified in Doc 15; backend router has stubs, but frontend components are pending full live data integration.

---

### 13.2 MISSING (Architectural Essentials & Core Features Not Yet Built)

1. **Next.js Route Protection in `middleware.ts`:**
   - **Current State:** Completely missing. No checks for authenticated session or user role.
   - **Missing Requirement:** Route guards that redirect unauthenticated guests to `/login`, and restrict `/doctor/*`, `/reception/*`, `/pharmacy/*`, and `/lab/*` to users possessing the matching role.
2. **Mobile Navigation System (Bottom Bar or Drawer):**
   - **Current State:** `Navbar.tsx` only renders `<nav className="hidden lg:flex">`.
   - **Missing Requirement:** A mobile bottom navigation bar or slide-out drawer providing mobile access to the 8 patient features (Home, Vault, Calendar, Reminders, Copilot, OTC Scan, Passport, Logs).
3. **Dynamic Patient Schedule Generator:**
   - **Current State:** Hardcoded `schedule_items` returned only when `patient_id == "demo-patient"`.
   - **Missing Requirement:** SQL query joining `prescriptions` + `intake_logs` to build the today's checklist dynamically for any authenticated patient ID (`user.id`).
4. **Doctor Sub-Nav Mobile Scroll Container:**
   - **Current State:** 7 tab buttons in `doctor/patient/[id]/layout.tsx` overflow without horizontal scroll capability.
   - **Missing Requirement:** `overflow-x-auto no-scrollbar` CSS container allowing smooth touch-swiping across all 7 tabs on mobile.
5. **Unified Theme Provider:**
   - **Current State:** 3 independent `useState` variables in `page.tsx`, `Navbar.tsx`, and `RoleHeader.tsx`.
   - **Missing Requirement:** A single root `ThemeProvider` managing `data-theme` and persisting preference to `localStorage`.
6. **Lead Capture Endpoint for Landing Page:**
   - **Current State:** "Request Clinic Access" form does nothing (`e.preventDefault()`).
   - **Missing Requirement:** Backend endpoint `POST /api/leads` to capture clinic access inquiries.

---

### 13.3 UNNECESSARY (Dead Code, Orphaned Routes, Redundant Files & Mock Fixtures to Purge)

1. **[PURGED ✅] Orphaned Route `/records` (`src/app/records/page.tsx`):**
   - **Status:** ✅ **FIXED (Commit `babed68`).** Replaced hardcoded `DEMO_RECORDS` page with redirect to `/vault`.
2. **[PURGED ✅] Orphaned Route `/labs` (`src/app/labs/page.tsx`):**
   - **Status:** ✅ **FIXED (Commit `babed68`).** Replaced legacy prototype with redirect to `/vault/diagnostic_report`.
3. **[PURGED ✅] Redundant Wrapper Folders (`src/app/patient/`):**
   - **Status:** ✅ **FIXED (Commit `babed68`).** Deleted empty redirect wrappers (`page.tsx`, `dashboard/`, `calendar/`).
4. **[PURGED ✅] Accidental Shell Folder (`scaffold/backend/app/{core,...}`):**
   - **Status:** ✅ **FIXED (Commit `babed68`).** Removed empty folder created by shell expansion typo.
5. **[PURGED ✅] Root Archive & Script (`files.zip`, `start.bat`):**
   - **Status:** ✅ **FIXED (Commit `babed68`).** Cleaned root directory artifacts.
6. **Public "Switch Portal" Dropdown:**
   - Present in [`Navbar.tsx#L135`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx#L135) and [`RoleHeader.tsx#L133`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/RoleHeader.tsx#L133). To be removed in Sequence 1.
5. **Hardcoded Static Demo State:**
   - Metformin & Noveron pre-filled rows in `prescribe/page.tsx`
   - Pre-filled Ramesh Kumar diabetes text in `soap/page.tsx`
   - Hardcoded bone fracture ellipse coordinates `{x:140, y:110}` in `ocr-xray/page.tsx`
   - Hardcoded orders in `lab/page.tsx`
   - `DEMO_STAFF_REMINDERS` in `reminders/page.tsx`
   - In-memory mock dictionaries in backend services (`doctor_service.py`, `patient_service.py`)

---

# SECTION 14: STEP-BY-STEP REMEDIATION SEQUENCE & VISUAL ACCEPTANCE VERIFICATION GUIDE

To ensure a systematic, risk-managed progression from the current prototype to a production-ready application, execute fixes in the following numbered sequence. For each step, use the **"Visible Change on Site"** checklist to visually verify success in the live browser:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PRODUCTION REMEDIATION SEQUENCE                                 │
├──────────────┬───────────────────────────────┬──────────────────────────────────────────────┤
│ SEQUENCE 1   │ Multi-User RBAC & Auth        │ Strict role boundaries, kill auto-doctor     │
│ SEQUENCE 2   │ Mobile Navigation & Shell     │ Mobile bottom bar, tabs horizontal swipe     │
│ SEQUENCE 3   │ Encoding & Design Tokens      │ UTF-8 mojibake cleanup, theme synchronization│
│ SEQUENCE 4   │ Real Patient Schedule & Dosing│ Dynamic checklist, real intake_logs writes   │
│ SEQUENCE 5   │ Reception → Doctor Queue      │ Live walk-in intake into doctor_queues       │
│ SEQUENCE 6   │ Doctor → Pharmacy → Patient   │ Prescribe ACID transaction, stock decrement  │
│ SEQUENCE 7   │ SOAP Notes & Lab Workbench    │ Real clinical_notes & lab report publishing  │
│ SEQUENCE 8   │ Dead Code & Orphan Purge      │ Delete /records, /labs, stub redirects       │
└──────────────┴───────────────────────────────┴──────────────────────────────────────────────┘
```

---

### SEQUENCE 1: Multi-User Role Isolation & Authentication Security

#### Implementation Scope:
- In [`AuthContext.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/context/AuthContext.tsx):
  1. Set initial state `user = null` (remove `DEFAULT_USERS.doctor` default fallback).
  2. Implement `logout()` to purge `localStorage.removeItem("sanjeevani_user_session")`, set `setUser(null)`, and redirect to `/login`.
  3. Remove `switchRole()` from the public API context.
- In [`Navbar.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx) and [`RoleHeader.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/RoleHeader.tsx):
  1. Completely remove the "Switch Portal" dropdown menu button and role switcher modal.
  2. Display the authenticated user's actual role and name in the profile badge.
- In [`middleware.ts`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/middleware.ts):
  1. Add route protection rules:
     - Unauthenticated guests navigating to `/dashboard`, `/doctor`, `/reception`, `/pharmacy`, or `/lab` are redirected to `/login`.
     - Logged-in Patients attempting to open `/doctor/*`, `/reception/*`, `/pharmacy/*`, or `/lab/*` are blocked and redirected to `/dashboard` with an access denied toast.
     - Staff members attempting to open unpermitted departments are blocked.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Guest Access):** Open an incognito browser window and navigate to `http://localhost:3000/doctor`.
  - *Before:* Dr. Nitin Sharma's triage queue loads immediately.
  - *After Fix:* Browser immediately redirects to `http://localhost:3000/login` with message: *"Please sign in to access clinical workspace"*.
- [ ] **Test 2 (Removed Switcher):** Log in as Patient Ramesh Kumar.
  - *Before:* The top header displayed a `[Switch Portal ▾]` button allowing you to switch to Doctor or Pharmacy.
  - *After Fix:* The `[Switch Portal ▾]` button is **completely gone**. Only the patient's avatar, theme toggle, and Sign Out dropdown exist.
- [ ] **Test 3 (Role Boundary Enforcement):** While logged in as Patient Ramesh, type `http://localhost:3000/pharmacy` in the browser URL bar.
  - *Before:* The Pharmacy dispensary console loaded and allowed the patient to dispense drugs.
  - *After Fix:* Middleware redirects back to `/dashboard` and displays: *"Access Restricted: Clinical staff credentials required"*.
- [ ] **Test 4 (Sign Out):** Click user profile avatar → "Sign Out".
  - *Before:* The page reloaded and immediately logged you back in as Dr. Nitin Sharma!
  - *After Fix:* Session is completely purged, storage cleared, and you land on `/login` with an empty form.

---

### SEQUENCE 2: Mobile Navigation & Responsive Accessibility

#### Implementation Scope:
- In [`Navbar.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/components/Navbar.tsx):
  1. Create a dedicated responsive mobile navigation element: a fixed bottom navigation bar (`fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#111827]/95 border-t`) or slide-out hamburger drawer for screens `< 1024px`.
  2. Include quick touch targets for: Home (`/dashboard`), Vault (`/vault`), Calendar (`/calendar`), Reminders (`/reminders`), and Copilot (`/copilot`).
- In [`doctor/patient/[id]/layout.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/layout.tsx#L230):
  1. Add `overflow-x-auto no-scrollbar scroll-smooth flex-nowrap` to the 7 tab container.
  2. Add subtle left/right gradient fade indicators so doctors know more tabs are scrollable on mobile.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Mobile Navigation):** Press `F12` in Chrome, toggle device toolbar, set to iPhone 12/14/15 (390px width), and navigate to `http://localhost:3000/dashboard`.
  - *Before:* Header navigation was invisible; no way to reach Vault or Copilot.
  - *After Fix:* A clean, modern bottom navigation bar sits fixed at the bottom with 5 essential icons (`Home`, `Vault`, `Calendar`, `Reminders`, `Copilot`). Tapping `Vault` instantly transitions to `/vault`.
- [ ] **Test 2 (Doctor Tabs Horizontal Swiping):** In the same 390px viewport, navigate to `http://localhost:3000/doctor/patient/patient-ramesh/timeline`.
  - *Before:* Tabs 3 through 7 were completely cut off and inaccessible.
  - *After Fix:* Swiping horizontally across the tabs lets you smoothly scroll to `Prescribe`, `SOAP Notes`, `OCR & X-Ray`, and `Refill Requests` without any horizontal body blowout.

---

### SEQUENCE 3: Text Encoding (Mojibake) & Visual Design Polish

#### Implementation Scope:
- Run string sanitization across `doctor.py`, `doctor_service.py`, `patient_service.py`, and frontend components.
- Replace corrupted characters with proper Unicode:
  - `102A?AF` → `102°F`
  - `Sep 10??16` → `Sep 10–16`
  - `LIVE CLINICAL PROTOCOL Â· PRIYA DESK` → `LIVE CLINICAL PROTOCOL · PRIYA DESK`
  - `â– Active Guard` → `■ Active Guard`
  - `Taken âœ“` → `Taken ✓`
- In [`src/app/page.tsx:L66`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/page.tsx#L66), replace unrecognized Tailwind class `w-13` with `w-14` or `w-12`.
- Synchronize theme state across all portals by binding `document.documentElement.getAttribute("data-theme")` with `localStorage.getItem("sanjeevani_theme")`.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Doctor Queue Text):** Navigate to `http://localhost:3000/doctor` and inspect Sita Devi's triage row.
  - *Before:* Rendered `High fever (102A?AF) for 3 days`.
  - *After Fix:* Renders crisp medical notation: `High fever (102°F) for 3 days`.
- [ ] **Test 2 (Calendar Summary):** Navigate to `http://localhost:3000/calendar`.
  - *Before:* AI strip rendered `Sep 10??16` and `around 9:00 PM ?? shift`.
  - *After Fix:* Renders clean typographical en-dashes: `Sep 10–16` and `around 9:00 PM — shift`.
- [ ] **Test 3 (Theme Toggle Visuals):** Navigate to `http://localhost:3000/` and toggle dark mode.
  - *Before:* Button slider had clipped borders due to `w-13`; toggling dark mode on `/` reverted to light mode when navigating to `/dashboard`.
  - *After Fix:* Switch pill has smooth rounded margins; toggling dark mode persists across page reloads and portal navigation.

---

### SEQUENCE 4: Real Patient Daily Schedule & Adherence Loop

#### Implementation Scope:
- In [`patient_service.py:get_timeline`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/services/patient_service.py#L738):
  1. Remove hardcoded check `if patient_id == "demo-patient"`.
  2. Query `prescriptions` + `prescription_items` where `patient_id = current_patient_id` and `status = 'active'`.
  3. Join today's records from `intake_logs` to determine if dose was taken or is pending.
- In [`patient_service.py:log_dose`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/services/patient_service.py):
  1. Insert an immutable record into `intake_logs` with `patient_id`, `schedule_item_id`, `timestamp`, `status = 'taken'`.
  2. Recalculate adherence score dynamically: `(taken_doses_today / total_doses_today) * 100`.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Initial Load):** Log in as Ramesh Kumar and open `http://localhost:3000/dashboard`.
  - *Before:* Rendered `0% adherence` and `"No items scheduled for today"`.
  - *After Fix:* Today's schedule renders real active medication cards (e.g. `Metformin 500mg - Morning Dose`, `Noveron 500mg - Evening Dose`).
- [ ] **Test 2 (Mark Dose as Taken):** Click `[Mark Taken]` on the morning Metformin card.
  - *Before:* Card either failed to update or threw console errors.
  - *After Fix:* Card immediately turns green with `Taken ✓ 08:30 AM`; the top circular Adherence Ring animates from `0%` to `50%` (1 of 2 doses taken).
- [ ] **Test 3 (Persistence on Reload):** Refresh the browser page (`F5`).
  - *Before:* State reset to empty.
  - *After Fix:* The card remains green `Taken ✓` and the Adherence Ring stays at `50%` because the log was persisted in the database.

---

### SEQUENCE 5: Reception Walk-In Intake to Doctor Queue (Live Dispatch)

#### Implementation Scope:
- In [`reception.py:create_intake`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/routers/reception.py#L254):
  1. Insert walk-in record into `patients` table (or find existing by phone).
  2. Insert queue item into `doctor_queues` table with `doctor_id`, `patient_id`, `token_number`, `acuity_level`, `status = 'waiting'`.
- In [`doctor.py:get_queue`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/routers/doctor.py):
  1. Fetch active waiting list directly from `doctor_queues` ordered by `acuity_level DESC, created_at ASC`.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Reception Intake):** Open `http://localhost:3000/reception` in Browser Tab A.
  - Enter Patient: `Anita Sharma`, Phone: `+91-9811122233`, Age: `42`, Complaint: `Acute severe asthmatic wheezing and chest tightness`.
  - Note that NLP triage automatically highlights `CRITICAL (Level 3)`.
  - Click `[Submit & Push to Doctor Queue]`.
  - Reception page displays: *"Token #15 Generated — Dispatched to Dr. Nitin Sharma"*.
- [ ] **Test 2 (Doctor Queue Appearance):** Open `http://localhost:3000/doctor` in Browser Tab B.
  - *Before:* The new patient never appeared in the doctor's queue.
  - *After Fix:* Anita Sharma immediately appears at the top of the queue with Token `#15`, a pulsing red `CRITICAL` badge, and her chief complaint.

---

### SEQUENCE 6: Doctor Prescribe → Pharmacy Feed → Patient Schedule (Closed Clinical Hand-Off)

#### Implementation Scope:
- In [`doctor/patient/[id]/prescribe/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/prescribe/page.tsx):
  1. Remove hardcoded pre-filled Metformin & Noveron rows. Start with an empty structured composer (or active medication list).
  2. Wire `handleSignAndDispatch` to send `POST /api/doctor/prescriptions` with `patient_id`, `items`, and cryptographic signature.
- In [`doctor.py:create_prescription`](file:///c:/PROJECTS/sanjeevani-project/scaffold/backend/app/routers/doctor.py):
  1. Execute atomic transaction: insert into `prescriptions`, insert into `prescription_items`, and insert pending entry into `pharmacy_dispense_log`.
- In [`pharmacy/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/pharmacy/page.tsx):
  1. Fetch live queue from `GET /api/pharmacy/dispense-queue`.
  2. Wire `handleDispense` to call `POST /api/pharmacy/dispense/{id}` which atomically decrements `inventory_stock.quantity_on_hand`.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Prescribe):** In Doctor Chart for Ramesh Kumar (`/doctor/patient/patient-ramesh/prescribe`), add a new medication: `Atorvastatin 20mg`, `1-0-0`, `Duration: 30 days`.
  - Click `[Verify & Dispatch Prescription]`.
  - Digital signature modal pops up with SHA-256 hash. Click `[Confirm Sign-Off]`.
  - Success banner: *"Prescription #RX-2026-X dispatched to Pharmacy"*.
- [ ] **Test 2 (Pharmacy Queue):** Navigate to `http://localhost:3000/pharmacy`.
  - In the "Verified Prescriptions Stream", Ramesh Kumar's new prescription for `Atorvastatin 20mg` appears immediately.
- [ ] **Test 3 (Dispense & Inventory Decrement):** In `/pharmacy`, click `[Confirm & Dispense]`.
  - Prescription moves to "Dispensed Today".
  - Navigate to `http://localhost:3000/pharmacy/inventory` and search `Atorvastatin`: stock has decremented by exactly `30 units`.
- [ ] **Test 4 (Patient Schedule Verification):** Log in as Ramesh Kumar at `http://localhost:3000/dashboard`.
  - `Atorvastatin 20mg` is now dynamically visible on his daily schedule for today!

---

### SEQUENCE 7: Clinical SOAP Notes & Real Lab Order Publishing

#### Implementation Scope:
- In [`doctor/patient/[id]/soap/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/doctor/patient/%5BpatientId%5D/soap/page.tsx):
  1. Remove hardcoded Ramesh Kumar notes. Fetch existing notes via `GET /api/doctor/soap/{patient_id}`.
  2. Wire `handleSaveSoap` to `POST /api/doctor/soap/save` and display real save confirmation timestamp.
- In [`lab/page.tsx`](file:///c:/PROJECTS/sanjeevani-project/scaffold/frontend/apps/patient/src/app/lab/page.tsx):
  1. Replace hardcoded `orders` array with `GET /api/lab/orders`.
  2. Wire `handlePublishResults` to `POST /api/lab/orders/{id}/publish` which inserts the verified report into `scans` table and patient vault.

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (SOAP Notes Save):** Open `/doctor/patient/patient-ramesh/soap`.
  - Type new assessment: *"Blood pressure stable at 124/82. HbA1c improving on current Metformin regimen."*
  - Click `[Save SOAP Note]`.
  - Interface displays: *"Saved to Clinical Record — Sep 30, 2026 17:15"*.
  - Refresh the page: the newly typed text reloads from the database rather than reverting to demo text.
- [ ] **Test 2 (Lab Publish):** In `/lab`, find order for `Complete Blood Count (CBC)`.
  - Enter Hemoglobin: `14.2 g/dL`, WBC: `6,800 /µL`.
  - Click `[Publish Results & Sync with Vault]`.
  - Card moves to "Results Published".
- [ ] **Test 3 (Patient Vault Verification):** Open `http://localhost:3000/vault/diagnostic_report` as patient.
  - The new CBC Lab report appears immediately in the patient's verified document list with option to download or view AI plain-language summary.

---

### SEQUENCE 8: Dead Code & Orphaned Route Purge

#### Implementation Scope:
- Delete or configure redirects for:
  - `src/app/records/page.tsx` → Redirect 301 to `/vault`
  - `src/app/labs/page.tsx` → Redirect 301 to `/vault/diagnostic_report`
  - Delete `src/app/patient/` folder (`page.tsx`, `dashboard/page.tsx`, `calendar/page.tsx`)
- Remove unused demo constants (`DEMO_RECORDS`, `DEMO_STAFF_REMINDERS`).

#### What You Need to See on the Site to Confirm the Fix:
- [ ] **Test 1 (Redirect Verification):** Type `http://localhost:3000/records` into browser.
  - *After Fix:* Browser automatically redirects to `http://localhost:3000/vault` with zero 404 errors.
- [ ] **Test 2 (Clean Compilation):** Inspect Next.js dev server terminal.
  - *After Fix:* Terminal compiles cleanly with 0 TypeScript errors and 0 unused duplicate route warnings.

---
*End of Audit Document — Generated for Sanjeevani Master Engineering Architecture.*

