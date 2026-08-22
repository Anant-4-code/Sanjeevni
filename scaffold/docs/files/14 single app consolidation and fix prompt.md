# Sanjeevani — Single-App Consolidation & Bug-Fix Prompt (Ultra-Detailed)

**Context this prompt is responding to:**
- You currently run **5 separate dev servers**: Patient on Next.js (`:3000`), and Doctor/Reception/Pharmacy/Lab as 4 separate Vite apps (`:5174`, `:5173`, `:5175`, `:5176`).
- Your terminal log shows the actual crash: a leftover `apps/patient/src/app/doctor/` route inside the Next.js patient app is colliding with the Vite doctor app, throwing `GET /doctor 500` and a Next.js build-cache `ENOENT ... app/doctor` error, then forcing a full reload. This is the debris from the doctor workspace having been built twice, in two different places.
- **You do not want 5 separate ports/apps.** You want ONE app, on `localhost:3000`, with clean role routes: `localhost:3000/patient`, `localhost:3000/doctor`, `localhost:3000/reception`, `localhost:3000/pharmacy`, `localhost:3000/lab`, plus the home/landing page at `localhost:3000/`.
- You want to **keep the exact visual theme** already shown in your screenshots (warm light background, thin-border cards, the black pill/badge style, the top nav bar pattern, the compliance ring, the triage sidebar) — reused consistently across every role route, not a different dark theme per role.

This document is the full prompt to hand your coding agent to do that consolidation AND fix every bug identified in the earlier audit, now targeted at the correct (single-app) architecture.

---

## PART A — WHY THE CURRENT 5-APP SETUP IS CAUSING YOUR CRASH (Explain Before You Fix)

Right now you have a monorepo with workspaces like `@sanjeevani/patient`, `@sanjeevani/doctor`, `@sanjeevani/reception`, `@sanjeevani/pharmacy`, `@sanjeevani/lab`, each a **separate frontend application** with its own dev server, own port, own build output, own `node_modules` resolution. That's why `npm run dev` boots 5 different processes in your log.

The 500 error you hit is because **two of those apps both tried to own the path `/doctor`**:
- The Next.js `patient` app has (or had) `apps/patient/src/app/doctor/page.tsx` as an App Router route.
- The separate Vite `doctor` app is ALSO trying to serve doctor content, on its own port.

When Next.js's dev server tries to compile `/doctor` and finds a stale/broken reference to it in its `.next` build cache (visible in your log: `ENOENT ... apps/patient/.next/server/app/doctor`), it 500s, and the only fix that "worked" was a full reload — which doesn't actually delete the root cause, it just clears the immediate cache error.

**The fix is not "delete the stray file and move on."** The fix is: **stop running 5 separate apps entirely**, and build one Next.js app that owns all role routes itself. That's what you asked for, and it also permanently removes this entire class of port/route collision bugs, because there will only ever be one dev server and one route tree from now on.

---

## PART B — TARGET ARCHITECTURE (What You're Building Toward)

```
ONE Next.js app (App Router), running on localhost:3000, containing:

  /                      → Landing / marketing page (public)
  /login                 → Unified login (all roles use this one form)
  /register              → Unified register (all roles use this one form)

  /patient/*             → Patient PWA screens (dashboard, vault, calendar, copilot, etc.)
  /doctor/*              → Doctor clinical workspace (queue, patient detail tabs, refills)
  /reception/*           → Reception intake & triage
  /pharmacy/*            → Pharmacy dispensing queue
  /lab/*                 → Lab diagnostic Kanban board

  Shared:
    /components/ui/*     → ONE shared component library (Button, Card, Badge, TopNav, etc.)
                           used by every role route — this is WHY the visual theme stays
                           identical across /patient, /doctor, /reception, etc.
    /lib/api.ts          → ONE fetch wrapper, ONE base URL, ONE auth-header injector
    /context/AuthContext → ONE auth context for the whole app (already exists in patient app —
                           reuse it, don't rebuild it per role)

  Backend: unchanged — still the single FastAPI service on :8000. Only the FRONTEND
  is being consolidated; nothing about the API surface needs to change for this step.
```

**Theme note:** Because every role route lives in the *same* Next.js app and imports the *same* shared `@/components/ui` primitives and the *same* `globals.css` design tokens, the visual language you already have (light background, black pill badges, thin-bordered cards, the exact top nav bar style seen in every screenshot) is naturally shared everywhere — you don't maintain it twice. If in the future a role genuinely needs a different visual density (e.g., a dark option for night-shift doctors), that becomes a **theme toggle inside this one app**, not a separately-styled app.

**Role-gating note:** Since everything is one app, route protection must be done with real logic, not "which port you're on." Each `/patient/*`, `/doctor/*`, `/reception/*`, `/pharmacy/*`, `/lab/*` route group needs a layout-level guard that checks the authenticated session's `role` and redirects anyone who doesn't match straight back to `/login` — this is the thing that replaces "a patient literally cannot reach a different port" with "a patient's session is checked server-side against the role required by the route they're trying to load."

---

## PART C — THE FULL BUG LIST TO FIX WHILE YOU CONSOLIDATE (Carried Over + Re-Scoped)

These are real, reproducible issues visible in your own screenshots and logs. Fix all of them as part of this same pass — don't consolidate the routing and leave the data bugs for later, because several of them are easiest to fix once there's only one codebase to look at.

1. **Hardcoded `DOCTOR_ID = "demo-doctor"`** — must be replaced by the doctor ID read from the authenticated session on every single API call the doctor route group makes (queue fetch, guardrail check, verify, refill approve/deny, dictation). No client-side constant may ever represent "who the doctor is."

2. **Compliance ring vs. caption mismatch** — Image 6 shows the ring rendering **78%** while the caption text says **"1 of 4 doses logged"** (which is 25%, not 78%). This means the ring and the caption are being fed from two different pieces of state, and the ring didn't refresh when the patient changed from Ramesh Kumar (whose real number was 78.6%) to Vikram Singh. Fix: compute the ring's percentage and the "X of Y doses" caption from the exact same server response object, in the exact same render — never two separate `useState` values that can go stale independently. Add a loading skeleton for this whole card while a new patient's data is being fetched, so a stale number is never visible even for a frame.

3. **Static, hardcoded alert banner text** — every screenshot before Vikram Singh shows the literal same sentence ("Patient missed Metformin evening dose on Aug 13 (2 hrs past due). Caregiver Priya was notified; son called patient → dose eventually taken.") regardless of which patient is actually open. When the patient changes to Vikram Singh, the banner text changes to a *different* hardcoded sentence, this time written in the wrong grammatical voice ("You have 3 pending dose(s)..." — that's patient-facing copy, not something a doctor-facing screen should say about a patient in third person). Fix: this banner must render from the real, currently-open patient's live alerts/smart-alerts data, written in third person doctor-facing language ("Patient missed the {medicine} {time} dose, {duration} overdue. Caregiver {name} was notified."), and must show nothing (or a calm empty state) when the open patient genuinely has no active alert.

4. **Queue selection state desync** — in Image 6, the header says "Active Patient: Vikram Singh" and the whole main panel is his data, but the sidebar's dark "selected" highlight is still sitting on Ramesh Kumar's row. There must be exactly one source of truth for "which patient is open" — once you've moved `/doctor` to be real Next.js routes (per Part B), make this the **route param** itself (e.g. `/doctor/patient/[patientId]`), and derive the sidebar's highlighted row by comparing each row's id to that route param — never a separately-tracked `selectedPatientId` piece of local state that can drift from the URL.

5. **Severity badges look hardcoded per patient name, not computed from real triage data** — Ramesh Kumar (a routine diabetes follow-up with occasional dizziness) is tagged URGENT in every screenshot, while Priya Sharma (two weeks of headaches) is tagged ROUTINE. Once the queue is wired to a real `GET /doctor/queue` call (not a static seeded array), confirm the severity badge is rendered directly from `chief_complaints.severity_level` returned by that call. If it's still mismatched after that, the bug is upstream in how Reception assigns severity at intake — trace and fix it there, don't patch it cosmetically in the doctor UI.

6. **Guardrail check exists on the backend but is invisible in the Prescribe tab** — Image 3 shows a plain drug table and a "Verify & Dispatch Prescription" button with zero visible interaction check, even though the same patient is on multiple concurrent medications elsewhere in the app. Fix: on every add/edit to the draft prescription table, debounce ~300ms and call the guardrail-check endpoint; if it comes back unsafe, show a blocking warning above the table naming the conflicting medicine and the prescribing doctor, with **[Remove Medication]** and **[Acknowledge & Override →]** actions (the latter behind a second confirmation, since it's permanently logged). The "Verify & Dispatch" button must send whichever flags were acknowledged, and must be disabled while a check is in-flight.

7. **SOAP Dictation tab is a non-functional stub** — Image 4 shows only a static mic icon and "No Audio Dictation Recorded," with no recording state, despite mic icons being imported as if this was meant to work. Either wire it to real `MediaRecorder` capture + the dictation endpoint with a visible recording indicator (pulsing dot + timer) and an editable transcript once it returns, or remove the tab for this release — do not ship a tab that looks interactive but silently does nothing.

8. **Refills & Orders tab is missing the approve/deny/notes flow** — Image 5 shows only medicine name + a single **[Approve]** button, no **[Deny]**, no urgency/remaining-days context, no doctor notes field, no refills-used counter. Add all of these; the backend fields already exist for most of this (`refill_requests.doctor_response_notes`, `refills_issued`, `max_refills_allowed`) — wire the UI to actually use them.

9. **Account/profile dropdown mixes identities** — the screenshot dropdown shows "Test Doctor / doctor@sanjeevani.com" as the logged-in user, but a separate line "Dr: Dr. G. Mithun" underneath, plus "Lab Results" and "Records Export" menu items that read like patient-account items reused wholesale. Once routes are consolidated, rebuild this as a role-aware account menu: if the session role is `doctor`, show only doctor-relevant items (Profile, Department/Clinic, Change Password, Sign Out) — never show another person's name as if it were a second identity for the current session. If "Dr. G. Mithun" is meant to represent a *care-team member on the currently open PATIENT's profile* (not the logged-in doctor), move that label into the patient detail panel and label it clearly, e.g. "Patient's Care Team Lead: Dr. G. Mithun" — it must never appear inside the logged-in user's own account dropdown.

10. **No deep-linking / tab state lost on refresh** — because tabs (Timeline, Vault, OCR, Prescribe, SOAP, Refills) were client-side `useState`, refreshing the browser always resets to the default tab and loses which patient was open. Once these become real nested routes (`/doctor/patient/[id]/timeline`, `/doctor/patient/[id]/vault`, etc. — see Part D), this is fixed automatically, since the URL itself encodes both the open patient and the open tab.

---

## PART D — THE ULTRA-DETAILED BUILD PROMPT (Copy-Paste to Your Coding Agent)

```
You are consolidating the Sanjeevani frontend from 5 separate applications (a Next.js
patient app on :3000, plus 4 standalone Vite apps for doctor/reception/pharmacy/lab on
:5173-:5176) into ONE Next.js application serving everything from localhost:3000, with
clean role-based routes. You are also fixing a specific set of already-diagnosed bugs
along the way. Read these specs first if present in the repo:

  /docs/specs/10_DOCTOR_ROLE_PRODUCTION_COMPLETE_SPEC.md
  /docs/specs/11_UNIFIED_AUTH_AND_8FEATURE_UI_COMPLETE.md
  /docs/specs/13_DOCTOR_PORTAL_AUDIT_AND_FIX_PROMPT.md

Note: doc 11 previously recommended a SEPARATE dark-themed app for staff roles. That
recommendation is SUPERSEDED by this prompt — the person building this wants ONE app,
ONE consistent light theme (the one already implemented and shown in the current
screenshots: warm off-white background, thin-border cards, black pill badges, the
existing top nav bar), reused across every role route. Do not introduce a second theme
or a second app. Follow THIS document's architecture, not doc 11's app-separation
section.

────────────────────────────────────────────────────────────────────────
STEP 1 — ESTABLISH THE SINGLE APP AS THE ONLY FRONTEND
────────────────────────────────────────────────────────────────────────
1. Keep `scaffold/frontend/apps/patient` (the existing Next.js App Router project) as
   the ONE surviving frontend application. This becomes the whole product's frontend.
2. Delete the four standalone Vite workspaces entirely once their working logic has
   been ported (Step 2): `apps/doctor`, `apps/reception`, `apps/pharmacy`, `apps/lab`.
   Remove their entries from the root `package.json` workspaces array and from
   whatever process manager script starts them (`run-all.bat` / concurrently config) —
   after this step, `npm run dev` must start exactly ONE process, serving
   http://localhost:3000, nothing else.
3. Rename/restructure the App Router route groups inside the surviving app so the URL
   structure is exactly:
     app/
       page.tsx                         → landing page ("/")
       login/page.tsx                   → unified login
       register/page.tsx                → unified register
       (patient)/patient/...            → all existing patient screens, moved under
                                          an explicit /patient prefix (currently many
                                          of them may be at the app root, e.g.
                                          /dashboard — move them to /patient/dashboard
                                          etc., and update every internal Link/router.push)
       (doctor)/doctor/
         layout.tsx                     → role guard (see Step 4) + doctor-only top nav
         page.tsx                       → queue view ("/doctor")
         patient/[patientId]/
           layout.tsx                   → shared patient-detail chrome (header,
                                          compliance ring, alert banner, tab strip)
           timeline/page.tsx            → "/doctor/patient/[id]/timeline"
           vault/page.tsx                → "/doctor/patient/[id]/vault"
           ocr-xray/page.tsx             → "/doctor/patient/[id]/ocr-xray"
           prescribe/page.tsx            → "/doctor/patient/[id]/prescribe"
           soap/page.tsx                  → "/doctor/patient/[id]/soap"
           refills/page.tsx               → "/doctor/patient/[id]/refills"
       (reception)/reception/...         → intake, triage, scan upload
       (pharmacy)/pharmacy/...           → dispensing queue
       (lab)/lab/...                     → diagnostic Kanban board
   This is the change that directly fixes your crash log: there is now exactly ONE
   place `/doctor` can resolve to, because there is only one app and only one route
   tree. There is no second Vite server to collide with it anymore.
4. Confirm no leftover `.next` cache references to the old ad-hoc `/doctor` route
   remain — delete `.next/` entirely and do a clean `npm run dev` after this
   restructuring, so you're not carrying forward the exact stale-cache error from
   your log (`ENOENT ... app/doctor`).

────────────────────────────────────────────────────────────────────────
STEP 2 — PORT WORKING UI OUT OF THE OLD VITE APPS BEFORE DELETING THEM
────────────────────────────────────────────────────────────────────────
For each of doctor/reception/pharmacy/lab:
1. Identify what actually works today in the Vite version (e.g. the doctor Vite app
   may have partial/duplicate logic vs. the one that was mistakenly built inside the
   patient app's old `/doctor` folder — compare both and keep whichever is more
   complete, don't blindly keep one over the other without checking).
2. Move the JSX/logic into the new route files from Step 1, but DO NOT copy-paste
   verbatim if the source used its own local Button/Card/Badge components — replace
   those with the SAME shared components already used by the patient app
   (`@/components/ui/Button`, etc.) so visual consistency is enforced by shared code,
   not by manually matching styles twice.
3. Any API base URL / fetch helper duplicated per old app must be deleted in favor of
   the ONE `lib/api.ts` (or equivalent) already used by the patient app.
4. Only delete each old Vite app directory after its content has been fully ported
   and the new route renders correctly with real data.

────────────────────────────────────────────────────────────────────────
STEP 3 — FIX THE IDENTITY MODEL (NO MORE "demo-doctor")
────────────────────────────────────────────────────────────────────────
1. There is already an AuthContext in the patient app (`@/context/AuthContext`) —
   REUSE it for every role. Do not build a separate auth mechanism per role. On
   login, the unified `/auth/login` backend endpoint returns the user's role and
   identity; store that in the SAME AuthContext regardless of whether the logged-in
   person is a patient, doctor, receptionist, pharmacist, or lab tech.
2. Delete every hardcoded identity constant you find, most notably
   `const DOCTOR_ID = "demo-doctor"`. Every API call from any `/doctor/*` route must
   resolve the doctor's identity from the authenticated session (sent via the
   existing auth cookie/header), and the BACKEND must derive `doctor_id` server-side
   from that session — never accept a client-supplied doctor_id for any
   write action (guardrail-check is read-only and lower risk, but verify, refill
   approve/deny, and dictation absolutely must use the server-derived identity).
3. Fix the account dropdown identity confusion (see Part C, item 9): rebuild it as a
   role-aware menu keyed off `session.role`, and move "Dr. G. Mithun" (if it
   represents a care-team member on the PATIENT's file, not the logged-in user) into
   the patient detail panel with an unambiguous label, never into the logged-in
   user's own account menu.

────────────────────────────────────────────────────────────────────────
STEP 4 — ADD REAL ROLE GUARDS AT THE LAYOUT LEVEL
────────────────────────────────────────────────────────────────────────
1. In `app/(doctor)/doctor/layout.tsx` (and the equivalent for reception/pharmacy/
   lab/patient), check the authenticated session's role server-side (in the layout's
   server component, or via a middleware matcher on `/doctor/:path*` etc.). If the
   role doesn't match, redirect to `/login` — do not rely on hiding a nav link
   client-side as the actual security boundary.
2. Add a Next.js `middleware.ts` matcher for `/doctor/:path*`, `/reception/:path*`,
   `/pharmacy/:path*`, `/lab/:path*`, `/patient/:path*` that checks the session cookie
   before the route even renders, so an unauthenticated or wrong-role request never
   reaches the page component at all.
3. Manually verify: log in as a patient, then manually type `localhost:3000/doctor`
   in the same browser tab. Confirm you're redirected to `/login` (or an
   "unauthorized" page), not shown any doctor content, even for a flash of a frame.

────────────────────────────────────────────────────────────────────────
STEP 5 — FIX PATIENT-SELECTION STATE USING THE NEW ROUTE STRUCTURE
────────────────────────────────────────────────────────────────────────
1. Now that "/doctor/patient/[patientId]/..." is a real route (Step 1), the currently
   open patient's ID comes from `useParams()` (or the server component's route
   params), not from a separately-tracked `useState`. Delete any
   `selectedPatientId` state that exists purely in the queue/sidebar component.
2. The sidebar's "selected" row highlight must be computed by comparing each queue
   row's `patient_id` to the route param — this directly fixes the Ramesh-Kumar-still-
   highlighted-while-Vikram-Singh-is-open bug, because there is now only one value
   (the URL) that can ever represent "which patient is open."
3. Clicking a queue row should be a real navigation (`router.push('/doctor/patient/' +
   id + '/timeline')` or a Next.js `<Link>`), not a state update — this also gives you
   the deep-linking / refresh-safety improvement from Part C item 10 for free.

────────────────────────────────────────────────────────────────────────
STEP 6 — FIX THE COMPLIANCE RING / ALERT BANNER STALE-DATA BUGS
────────────────────────────────────────────────────────────────────────
1. In the new `app/(doctor)/doctor/patient/[patientId]/layout.tsx`, fetch the full
   patient dashboard payload ONCE per patient (server component or a single
   client-side query keyed by `patientId`), and pass the resulting object down to
   the compliance ring, the alert banner, and every tab — do not let the ring and
   the "X of Y doses" caption read from two different fetches or two different
   pieces of local state.
2. Because this fetch is now naturally keyed by the route param `patientId`
   (e.g. via TanStack Query's `queryKey: ['doctor-patient', patientId]`), switching
   patients automatically triggers a fresh fetch and a loading state, instead of
   silently rendering stale numbers from the previous patient while the new data
   loads in the background. Add a skeleton/placeholder for the ring + banner during
   that loading window.
3. Rewrite the alert banner to render from the real `smart_alerts` array in that
   payload (see doc 10 §8.1's dashboard shape), in third-person doctor-facing
   language, and to show nothing when there are no active alerts for the currently
   open patient. Delete every hardcoded banner string currently in the code.

────────────────────────────────────────────────────────────────────────
STEP 7 — WIRE THE GUARDRAIL CHECK INTO THE PRESCRIBE ROUTE
────────────────────────────────────────────────────────────────────────
1. In `app/(doctor)/doctor/patient/[patientId]/prescribe/page.tsx`, debounce ~300ms
   on every add/edit to the draft medication list and call the existing
   `POST /doctor/guardrail-check` endpoint with the full current draft.
2. If `safe: false`, render a blocking warning above the table naming the specific
   conflicting medicine and prescribing doctor and severity, with
   [Remove Medication] and [Acknowledge & Override →] (second confirmation dialog
   before setting `acknowledged: true` in local state for that flag).
3. "Verify & Dispatch Prescription" must POST the acknowledged flags to
   `/doctor/verify`, must be disabled while a check is in-flight, and must correctly
   surface the backend's rejection if an unacknowledged severe flag slips through.

────────────────────────────────────────────────────────────────────────
STEP 8 — COMPLETE OR REMOVE THE SOAP DICTATION ROUTE
────────────────────────────────────────────────────────────────────────
Either wire real `MediaRecorder` capture + POST to the dictation endpoint + a visible
recording indicator + an editable returned transcript, OR remove the route/tab
entirely for this release. Do not ship a tab that looks functional but silently does
nothing when clicked.

────────────────────────────────────────────────────────────────────────
STEP 9 — COMPLETE THE REFILLS & ORDERS ROUTE
────────────────────────────────────────────────────────────────────────
Add [Deny] with a required reason field, sort pending requests by urgency
(days-remaining ascending), show refills-used/max-allowed, and add a doctor notes
textarea wired to `refill_requests.doctor_response_notes` on approve.

────────────────────────────────────────────────────────────────────────
STEP 10 — FULL VERIFICATION PASS
────────────────────────────────────────────────────────────────────────
Run `npm run dev` and confirm EXACTLY ONE process starts, serving only
http://localhost:3000. Then manually verify:

  [ ] localhost:3000/            → landing page loads
  [ ] localhost:3000/login       → unified login works for a patient AND a doctor
                                    account, redirecting each to the right area
  [ ] localhost:3000/patient     → patient dashboard, unaffected by this refactor
  [ ] localhost:3000/doctor      → queue loads with real (not seeded) data
  [ ] localhost:3000/reception   → intake flow works
  [ ] localhost:3000/pharmacy    → dispensing queue works
  [ ] localhost:3000/lab         → Kanban board works
  [ ] Clicking 3 different patients in the doctor queue in quick succession never
      shows a stale ring/banner from the previous patient
  [ ] The sidebar's highlighted row always matches the patient in the URL
  [ ] Refreshing the browser while on /doctor/patient/{id}/refills stays on that
      exact tab and patient, rather than resetting
  [ ] A patient account manually navigating to /doctor is redirected to /login,
      not shown any doctor content
  [ ] A real guardrail conflict shows a warning before Verify & Dispatch can be
      clicked, and cannot be bypassed without acknowledging it
  [ ] No 4 extra dev-server processes start — only the one on :3000

Do not consider this complete until every line above passes against real (not demo-
seeded) data, and the old crash from the log ("GET /doctor 500", the `.next` ENOENT
cache error) cannot be reproduced because the old conflicting route no longer exists.
```

---

## PART E — WHY THIS ORDER, SPECIFICALLY

- **Step 1 before everything else** because the crash you're hitting right now is a routing collision — until there's exactly one route tree, every other fix you attempt will be shadowed by the same class of cache/collision bug resurfacing in a different form.
- **Step 3 (identity) before Step 6/7 (data + guardrail bugs)** because several of the visible bugs (stale ring, static banner) are much easier to trace once you know for certain which doctor session is making which request — debugging "why is this stale" is harder when every request still claims to be `"demo-doctor"` regardless of who's actually logged in.
- **Step 5 (route-param-driven patient selection) before Step 6** because the ring/banner staleness bug and the sidebar-highlight desync bug are the *same root cause* (two sources of truth for "which patient is open") — fixing the routing to make the URL the one source of truth resolves both at once, rather than patching each symptom separately.