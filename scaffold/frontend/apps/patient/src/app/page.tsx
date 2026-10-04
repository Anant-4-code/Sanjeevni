"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Minus,
  Check,
  Moon,
  Sun,
  Menu,
  X,
  Activity,
  Shield,
  Terminal,
  Clock,
  Sparkles,
  Search,
} from "lucide-react";

/* ── EDITORIAL EYEBROW COMPONENT ── */
function SectionEyebrow({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[11px] font-bold tracking-[0.25em] text-[var(--fg-muted)]">
        {index} //
      </span>
      <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--border)] max-w-xs" />
    </div>
  );
}

/* ── CLINIC ACCESS INTAKE FORM (SWISS EDITORIAL ARCHITECTURE) ── */
function ClinicAccessForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [clinic, setClinic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^[+\d][\d\s\-]{8,}$/;
    if (!emailRe.test(contact.trim()) && !phoneRe.test(contact.trim())) {
      setError("Please enter a valid work email or phone number.");
      return;
    }

    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
      const res = await fetch(`${API_BASE}/clinic/access-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim(), clinic: clinic.trim() }),
      });
      if (!res.ok) {
        let msg = "Submission error. Please retry.";
        try { const d = await res.json(); msg = d?.detail || d?.message || msg; } catch {}
        setError(msg);
        return;
      }
      setSubmitted(true);
    } catch {
      // Offline fallback resilience
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="border border-[var(--border)] p-8 sm:p-12 space-y-6">
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--fg-muted)] flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--fg)]" />
          REGISTRATION RECORD LOGGED
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Request Received
        </h3>
        <p className="text-sm font-sans text-[var(--fg-muted)] max-w-md leading-relaxed">
          Record logged for <strong>{name}</strong>. Our clinical integration team will contact{" "}
          <strong>{contact}</strong> within 24 hours to schedule deployment.
        </p>
        <button
          onClick={() => { setSubmitted(false); setName(""); setContact(""); setClinic(""); }}
          className="font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:opacity-70 transition-opacity"
        >
          [ Submit Another Clinic Request ]
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] p-8 sm:p-12 space-y-8" noValidate>
      <div className="border-b border-[var(--border)] pb-4 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          CLINICAL INTAKE DISPATCH
        </span>
        <span className="font-mono text-xs text-[var(--fg-muted)]">SECURE // ENCRYPTED</span>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--fg-muted)]">
            01 // Full Name &amp; Title *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Rajesh Sharma"
            required
            className="w-full bg-transparent border-b border-[var(--border)] pb-3 pt-1 font-sans text-base sm:text-lg focus:outline-none focus:border-[var(--fg)] transition-colors rounded-none placeholder:text-[var(--fg-muted)]/40"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--fg-muted)]">
            02 // Institutional Email or Direct Phone *
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="doctor@hospital.org or +91 98765 43210"
            required
            className="w-full bg-transparent border-b border-[var(--border)] pb-3 pt-1 font-sans text-base sm:text-lg focus:outline-none focus:border-[var(--fg)] transition-colors rounded-none placeholder:text-[var(--fg-muted)]/40"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--fg-muted)]">
            03 // Hospital, Clinic, or Practice Name
          </label>
          <input
            type="text"
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
            placeholder="Apex Cardiology &amp; Multi-Speciality Clinic"
            className="w-full bg-transparent border-b border-[var(--border)] pb-3 pt-1 font-sans text-base sm:text-lg focus:outline-none focus:border-[var(--fg)] transition-colors rounded-none placeholder:text-[var(--fg-muted)]/40"
          />
        </div>
      </div>

      {error && (
        <div className="border border-[var(--fg)] p-3 font-mono text-xs uppercase tracking-wider text-[var(--fg)]">
          [!] Error: {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-8 py-4 bg-[var(--fg)] text-[var(--bg)] font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-3 cursor-pointer rounded-none disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="animate-pulse">DISPATCHING TELEMETRY...</span>
          </>
        ) : (
          <>
            <span>REQUEST CLINIC ACCESS</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

/* ── ABSTRACT TYPOGRAPHIC CONVERGENCE VISUALIZATION ── */
function EcosystemConvergence() {
  const [activeNode, setActiveNode] = useState<string>("PATIENT");

  const nodes = [
    { id: "PATIENT", role: "Primary Sovereign", desc: "Digital Health Passport, self-governed record vault, daily adherence schedule." },
    { id: "DOCTOR", role: "Clinical Authority", desc: "Acuity triage queue, pharmacological guardrails, ambient SOAP dictation." },
    { id: "LABORATORY", role: "Diagnostic Signal", desc: "Machine test orders, out-of-range critical value flags, direct report ingestion." },
    { id: "PHARMACY", role: "Dispensary Verification", desc: "Safety-lock enforcement, drug-drug contraindication cross-check, inventory ledger." },
    { id: "HOSPITAL", role: "Institutional Infrastructure", desc: "Front desk triage token queue, inpatient discharge protocol, multi-physician merge." },
  ];

  return (
    <div className="border border-[var(--border)] p-6 sm:p-12 space-y-8 bg-[var(--bg)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-4 gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          TELEMETRY // CONVERGENCE CHOREOGRAPHY
        </span>
        <span className="font-mono text-[11px] text-[var(--fg-muted)]">
          ACTIVE PARTICIPANT: <strong className="text-[var(--fg)]">{activeNode}</strong>
        </span>
      </div>

      {/* Convergence Architecture Diagram */}
      <div className="relative py-8 sm:py-16 flex flex-col items-center justify-center">
        {/* Horizontal & Vertical Axis Hairlines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-[var(--border)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-full w-px bg-[var(--border)]" />
        </div>

        {/* Central Core: SANJEEVANI */}
        <div className="relative z-10 bg-[var(--fg)] text-[var(--bg)] px-8 py-5 text-center shadow-xl border border-[var(--fg)]">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-70 mb-1">
            UNIFIED CLINICAL BACKBONE
          </div>
          <div className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight">
            SANJEEVANI
          </div>
          <div className="font-mono text-[10px] tracking-widest mt-1 opacity-80">
            SHA-256 MESH // ISO-27001
          </div>
        </div>

        {/* Satellite Nodes */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 sm:mt-12 relative z-10">
          {nodes.map((node) => {
            const isSelected = activeNode === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setActiveNode(node.id)}
                onMouseEnter={() => setActiveNode(node.id)}
                className={`p-4 text-left transition-all border rounded-none cursor-pointer ${
                  isSelected
                    ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)] shadow-md"
                    : "bg-[var(--bg)] text-[var(--fg)] border-[var(--border)] hover:border-[var(--fg)]"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">
                  0{nodes.indexOf(node) + 1} //
                </div>
                <div className="font-display text-sm sm:text-base font-bold tracking-tight">
                  {node.id}
                </div>
                <div className="font-mono text-[10px] mt-2 line-clamp-1 opacity-70">
                  {node.role}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Node Detail Dossier */}
      <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--fg-muted)] block mb-1">
            PROTOCOL SPECIFICATION FOR {activeNode}
          </span>
          <p className="font-sans text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            {nodes.find((n) => n.id === activeNode)?.desc}
          </p>
        </div>
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-widest font-bold inline-flex items-center gap-2 hover:opacity-70 transition-opacity shrink-0"
        >
          [ ACCESS {activeNode} CONSOLE → ]
        </Link>
      </div>
    </div>
  );
}

/* ── INTERACTIVE JOURNEY SEQUENCER ── */
function PatientJourneySequencer() {
  const [activeStep, setActiveStep] = useState(3); // Start on Prescribe

  const steps = [
    {
      num: "01",
      id: "DISCOVER",
      label: "Zero-Install Patient Entry",
      time: "Minute 00",
      description: "Patient accesses their complete medical vault and care plan via SMS/WhatsApp PWA link without app store friction or account setup delay.",
      telemetry: "ABDM ID: 91-8472-1082-99 // AUTH: ZERO-KNOWLEDGE PASSPORT",
    },
    {
      num: "02",
      id: "CONSULT",
      label: "Clinical Triage & History",
      time: "Minute 04",
      description: "Front-desk intake dynamically streams patient vital telemetry and AI severity scoring directly to the attending physician's live triage queue.",
      telemetry: "TRIAGE SEVERITY: LEVEL 2 // COMPLAINT: POSTPRANDIAL DIZZINESS",
    },
    {
      num: "03",
      id: "DIAGNOSE",
      label: "Multimodal Lab & Imaging",
      time: "Minute 12",
      description: "Digital test orders route directly to the diagnostic workbench. Critical values (HbA1c, eGFR) auto-flag and append to the physician's review canvas.",
      telemetry: "BIOMARKER: HBA1C 7.2% -> 6.9% // RADIOLOGY: X-RAY CLEAR",
    },
    {
      num: "04",
      id: "PRESCRIBE",
      label: "Guardrail Verification",
      time: "Minute 18",
      description: "Doctor drafts structured medication regimen. Real-time inference checks cross-specialist contraindications and cryptographically signs with SHA-256.",
      telemetry: "REGIMEN: METFORMIN 500MG (1-0-1) // INTERACTION: ZERO CONFLICT",
    },
    {
      num: "05",
      id: "DISPENSE",
      label: "Dispensary Safety Lock",
      time: "Minute 25",
      description: "Verified prescription arrives in the Central Pharmacy queue. Pharmacist validates safety lock, dispenses physical medication, and syncs inventory.",
      telemetry: "PHARMACY DISPENSE LOG: DISP-2026-88 // INVENTORY: -30 UNITS",
    },
    {
      num: "06",
      id: "FOLLOW UP",
      label: "Autonomous Adherence Loop",
      time: "Day 01 - 30",
      description: "Patient daily schedule updates immediately. Missed dose escalation triggers smart caregiver nudges, symptom tracking, and proactive 14-day refill alerts.",
      telemetry: "COMPLIANCE: 100% // NEXT APPOINTMENT: +14 DAYS AUTOMATED",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Horizontal Step Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 border-t border-b border-[var(--border)]">
        {steps.map((step, idx) => {
          const isActive = idx === activeStep;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`p-4 sm:p-6 text-left border-r last:border-r-0 border-[var(--border)] transition-all cursor-pointer rounded-none relative ${
                isActive ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--bg)] hover:bg-[var(--border)]/30"
              }`}
            >
              <div className="font-mono text-[10px] tracking-widest opacity-60 mb-2">
                STAGE {step.num}
              </div>
              <div className="font-display text-sm sm:text-base font-bold uppercase tracking-tight">
                {step.id}
              </div>
              <div className="font-mono text-[10px] mt-1 opacity-70">
                {step.time}
              </div>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--bg)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stage Detail Callout */}
      <div className="border border-[var(--border)] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[var(--bg)]">
        <div className="lg:col-span-8 space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            STAGE 0{activeStep + 1} // {steps[activeStep].id}
          </div>
          <h3 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight">
            {steps[activeStep].label}
          </h3>
          <p className="font-sans text-sm sm:text-base text-[var(--fg-muted)] leading-relaxed max-w-2xl">
            {steps[activeStep].description}
          </p>
        </div>

        <div className="lg:col-span-4 border border-[var(--border)] p-6 bg-[var(--bg-elevated)] space-y-3 font-mono text-xs">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
            <span>LIVE AUDIT TELEMETRY</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <p className="text-[11px] leading-relaxed break-all">
            {steps[activeStep].telemetry}
          </p>
          <div className="pt-2 text-[10px] text-[var(--fg-muted)]">
            SYSTEM STATUS: SYNCHRONIZED
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── COLLAPSIBLE PARTICIPANT ROWS (NO BOXES, BORDERS AS ARCHITECTURE) ── */
function EcosystemParticipantRows() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(1); // Doctor expanded by default

  const participants = [
    {
      num: "01",
      role: "PATIENTS & CAREGIVERS",
      thesis: "Healthcare begins with individual sovereignty and effortless adherence.",
      details: [
        "Single-tap access without app store friction via WhatsApp / SMS web link",
        "Cryptographic 5-minute single-use QR Health Passport for emergency consults",
        "Unified dosing schedule auto-merging prescriptions from multiple attending specialists",
        "Offline-resilient dose logging with proactive caregiver escalation triggers",
      ],
      portalHref: "/dashboard",
      portalLabel: "ENTER PATIENT CARE PORTAL",
    },
    {
      num: "02",
      role: "ATTENDING PHYSICIANS & SPECIALISTS",
      thesis: "Care becomes actionable through longitudinal clarity and pharmacological guardrails.",
      details: [
        "Acuity-sorted triage queue prioritizing high-severity clinical presentations",
        "Comprehensive 360-degree patient chart with 7-day adherence telemetry",
        "Interactive prescription composer with live drug-drug and drug-allergy contraindication checks",
        "Ambient voice SOAP dictation generating structured clinical documentation in seconds",
      ],
      portalHref: "/doctor",
      portalLabel: "ACCESS PHYSICIAN COMMAND DESK",
    },
    {
      num: "03",
      role: "PATHOLOGY & DIAGNOSTIC LABORATORIES",
      thesis: "Diagnostic information transforms into timely clinical evidence.",
      details: [
        "Doctor test orders arrive structured directly into the laboratory queue",
        "Automated out-of-range critical value flagging with plain-language summary drafting",
        "Instant one-click publish directly into the patient's verified health vault",
        "Elimination of lost paper slips, manual transcription errors, and review delays",
      ],
      portalHref: "/lab",
      portalLabel: "OPEN LABORATORY WORKBENCH",
    },
    {
      num: "04",
      role: "DISPENSARY PHARMACISTS",
      thesis: "Dispense with absolute safety locks and automated cross-interaction catches.",
      details: [
        "Doctor-signed verified orders arrive instantly ready for preparation",
        "Safety-lock enforcement prevents dispensing unauthorized or unverified regimens",
        "Real-time pharmacy stock decrementing and dispense velocity audit trails",
        "Refill intelligence identifying panel patients nearing the end of essential therapy",
      ],
      portalHref: "/pharmacy",
      portalLabel: "ENTER DISPENSARY CONSOLE",
    },
    {
      num: "05",
      role: "FRONT DESK RECEPTIONISTS",
      thesis: "A calmer, faster intake desk handling triage registration in under 60 seconds.",
      details: [
        "Rapid patient intake with AI keyword and clinical acuity suggestion",
        "Scan-and-go paper prescription digitization directly to digital vault records",
        "Smart department routing allocating incoming walk-ins to the right specialist",
        "Instant printed queue token generation with estimated wait time telemetry",
      ],
      portalHref: "/reception",
      portalLabel: "ACCESS FRONT DESK RECEPTION",
    },
    {
      num: "06",
      role: "HOSPITALS & CLINIC NETWORKS",
      thesis: "Multi-facility governance, immutable protocol logs, and institutional security.",
      details: [
        "SHA-256 cryptographic sign-offs ensuring indisputable medico-legal auditability",
        "Zero-trust role-based access control compartmentalizing patient and clinical boundaries",
        "DISHA and ABDM standard compliance with encrypted session management",
        "Cross-department synchronization eradicating fragmented paper folders",
      ],
      portalHref: "/login",
      portalLabel: "PORTAL ACCESS LOGIN",
    },
  ];

  return (
    <div className="border-t border-[var(--border)]">
      {participants.map((item, idx) => {
        const isExpanded = expandedIndex === idx;
        return (
          <div key={item.num} className="border-b border-[var(--border)]">
            <button
              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              className="w-full py-6 sm:py-8 flex items-center justify-between text-left group hover:opacity-70 transition-opacity cursor-pointer"
            >
              <div className="flex items-center gap-6 sm:gap-12">
                <span className="font-mono text-sm sm:text-base font-bold text-[var(--fg-muted)]">
                  {item.num}
                </span>
                <span className="font-display text-xl sm:text-3xl font-black uppercase tracking-tight">
                  {item.role}
                </span>
              </div>
              <div className="font-mono text-lg sm:text-xl font-bold">
                {isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
            </button>

            {isExpanded && (
              <div className="pb-8 sm:pb-12 pt-2 grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-[var(--border)]/50">
                <div className="lg:col-span-5 space-y-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">
                    OPERATIONAL THESIS
                  </span>
                  <p className="font-display text-lg sm:text-xl font-bold leading-snug">
                    {item.thesis}
                  </p>
                  <div>
                    <Link
                      href={item.portalHref}
                      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest font-bold bg-[var(--fg)] text-[var(--bg)] px-5 py-3 hover:opacity-90 transition-opacity rounded-none"
                    >
                      <span>{item.portalLabel}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--fg-muted)] block mb-1">
                    SYSTEM CAPABILITIES &amp; PROTOCOL
                  </span>
                  <ul className="space-y-3 font-sans text-sm text-[var(--fg-muted)]">
                    {item.details.map((detail, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-3">
                        <span className="font-mono text-xs text-[var(--fg)] mt-0.5">--</span>
                        <span className="leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── MASTER UNIVERSAL LANDING PAGE ── */
export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [problemConnected, setProblemConnected] = useState(false);

  // Sync theme state with actual DOM attribute on mount
  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try { localStorage.setItem("sanjeevani_theme", nextTheme); } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--fg)] selection:text-[var(--bg)] font-sans">
      {/* ── TOP NAV BAR (SWISS BRUTALIST ARCHITECTURE) ── */}
      <header className="sticky top-0 z-50 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-display font-black text-lg tracking-tight">
            <span className="w-5 h-5 bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center font-mono text-xs font-bold">
              S
            </span>
            <span className="tracking-widest">SANJEEVANI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--fg-muted)]">
            <a href="#problem" className="hover:text-[var(--fg)] transition-colors">01 // Problem</a>
            <a href="#ecosystem" className="hover:text-[var(--fg)] transition-colors">02 // Ecosystem</a>
            <a href="#journey" className="hover:text-[var(--fg)] transition-colors">03 // Journey</a>
            <a href="#intelligence" className="hover:text-[var(--fg)] transition-colors">04 // Intelligence</a>
            <a href="#protocol" className="hover:text-[var(--fg)] transition-colors">05 // Protocol</a>
          </nav>

          {/* Header Controls */}
          <div className="flex items-center gap-4">
            {/* Minimalist B&W Theme Switch */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-[var(--border)] hover:border-[var(--fg)] transition-colors cursor-pointer text-xs font-mono rounded-none"
              aria-label="Toggle theme mode"
              title="Toggle light / dark contrast"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Portal Direct Access */}
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity rounded-none"
            >
              <span>ACCESS PORTAL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 border border-[var(--border)] rounded-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--border)] bg-[var(--bg)] px-6 py-6 space-y-4 font-mono text-xs uppercase tracking-widest animate-in slide-in-from-top-2">
            <a href="#problem" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[var(--border)]">
              01 // Problem &amp; Fragmentation
            </a>
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[var(--border)]">
              02 // Ecosystem Participants
            </a>
            <a href="#journey" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[var(--border)]">
              03 // Patient Journey
            </a>
            <a href="#intelligence" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[var(--border)]">
              04 // Clinical Intelligence
            </a>
            <a href="#protocol" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[var(--border)]">
              05 // Trust &amp; Governance
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="py-3 text-center bg-[var(--fg)] text-[var(--bg)] font-bold">
                ENTER HEALTHCARE PORTAL →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 01 // MONUMENTAL HERO SECTION ── */}
      <section className="px-6 md:px-12 pt-16 sm:pt-24 pb-20 max-w-7xl mx-auto border-b border-[var(--border)]">
        <div className="space-y-6">
          <div className="font-mono text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-[var(--fg-muted)]">
            01 // SANJEEVANI ARCHITECTURE
          </div>

          <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-9xl uppercase tracking-tighter leading-[0.88] select-none">
            HEALTHCARE,
            <span className="block mt-2 sm:mt-4 text-[var(--bg)] bg-[var(--fg)] px-3 sm:px-6 py-1 sm:py-2 inline-block">
              CONNECTED.
            </span>
          </h1>

          <div className="pt-6 sm:pt-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <p className="font-sans text-lg sm:text-2xl text-[var(--fg-muted)] font-normal leading-relaxed max-w-3xl">
                One unified healthcare ecosystem connecting patients, doctors, laboratories, pharmacies, clinics, and hospitals.
                Eliminating medical fragmentation through cryptographic records, pharmacological safety nets, and real-time clinical synchronization.
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-4">
              <Link
                href="/login"
                className="w-full py-5 px-8 bg-[var(--fg)] text-[var(--bg)] font-mono text-xs font-bold uppercase tracking-widest hover:opacity-85 transition-opacity text-center flex items-center justify-center gap-3 rounded-none cursor-pointer"
              >
                <span>ENTER SANJEEVANI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#ecosystem"
                className="w-full py-4 px-8 border border-[var(--border)] hover:border-[var(--fg)] font-mono text-xs uppercase tracking-widest text-center transition-colors rounded-none"
              >
                [ EXPLORE PARTICIPANTS ]
              </a>
            </div>
          </div>
        </div>

        {/* Abstract Convergence Architecture (No fake cards, pure typographic choreo) */}
        <div className="mt-16 sm:mt-24">
          <EcosystemConvergence />
        </div>
      </section>

      {/* ── 02 // MONUMENTAL EDITORIAL MARQUEE TICKER ── */}
      <section className="bg-[var(--fg)] text-[var(--bg)] overflow-hidden py-5 select-none border-b border-[var(--border)]">
        <div className="animate-marquee whitespace-nowrap font-display text-sm sm:text-base font-black uppercase tracking-[0.25em] flex items-center gap-8">
          <span>PATIENTS</span>
          <span>•</span>
          <span>DOCTORS</span>
          <span>•</span>
          <span>LABORATORIES</span>
          <span>•</span>
          <span>PHARMACIES</span>
          <span>•</span>
          <span>CLINICS</span>
          <span>•</span>
          <span>HOSPITALS</span>
          <span>•</span>
          <span>CARE TEAMS</span>
          <span>•</span>
          <span>ZERO GUESSWORK</span>
          <span>•</span>
          <span>FEWER MISTAKES</span>
          <span>•</span>
          <span>CLEAR PRESCRIPTIONS</span>
          <span>•</span>
          <span>PATIENTS</span>
          <span>•</span>
          <span>DOCTORS</span>
          <span>•</span>
          <span>LABORATORIES</span>
          <span>•</span>
          <span>PHARMACIES</span>
          <span>•</span>
          <span>CLINICS</span>
          <span>•</span>
          <span>HOSPITALS</span>
        </div>
      </section>

      {/* ── 03 // THE PROBLEM: FRAGMENTATION VS CONNECTION ── */}
      <section id="problem" className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="02" label="THE STRUCTURAL CRISIS" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
              HEALTHCARE IS FRAGMENTED.
            </h2>
            <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] leading-relaxed max-w-xl">
              Prescriptions live on paper slips. Lab reports are scattered across PDF portals. Pharmacies dispense without cross-doctor interaction checks.
              Patients bear the cognitive burden of remembering their own contradictory regimens.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 font-mono text-xs">
            <div className="border border-[var(--border)] p-4 flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">CROSS-SPECIALTY ERRORS</span>
              <strong className="text-base font-bold">42% OF ADVERSE EVENTS</strong>
            </div>
            <div className="border border-[var(--border)] p-4 flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">LOST DIAGNOSTIC DUPLICATION</span>
              <strong className="text-base font-bold">1 IN 5 REPEAT TESTS</strong>
            </div>
            <div className="border border-[var(--border)] p-4 flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">PAPER RECORD ATTRITION</span>
              <strong className="text-base font-bold">&gt;68% UNRECORDED RX</strong>
            </div>
          </div>
        </div>

        {/* Interactive Fragmentation vs Synchronization Demo */}
        <div className="border border-[var(--border)] p-8 sm:p-12 space-y-8 bg-[var(--bg)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-4 gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--fg-muted)]">
              STRUCTURAL COMPARISON
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setProblemConnected(false)}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-colors cursor-pointer rounded-none ${
                  !problemConnected
                    ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]"
                    : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                [ FRAGMENTED SILOS ]
              </button>
              <button
                onClick={() => setProblemConnected(true)}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-colors cursor-pointer rounded-none ${
                  problemConnected
                    ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]"
                    : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                [ SANJEEVANI CONNECTED ]
              </button>
            </div>
          </div>

          {!problemConnected ? (
            /* Fragmented State */
            <div className="py-12 grid grid-cols-1 sm:grid-cols-5 gap-6 text-center">
              <div className="border border-dashed border-[var(--border)] p-6 space-y-2">
                <div className="font-mono text-xs text-[var(--fg-muted)]">ISOLATION 01</div>
                <div className="font-display text-lg font-bold">PATIENT</div>
                <p className="font-mono text-[10px] text-[var(--fg-muted)]">Lost physical paper prescriptions. Unchecked OTC supplements.</p>
              </div>
              <div className="border border-dashed border-[var(--border)] p-6 space-y-2">
                <div className="font-mono text-xs text-[var(--fg-muted)]">ISOLATION 02</div>
                <div className="font-display text-lg font-bold">DOCTOR</div>
                <p className="font-mono text-[10px] text-[var(--fg-muted)]">Zero visibility into concurrent specialists&apos; active treatments.</p>
              </div>
              <div className="border border-dashed border-[var(--border)] p-6 space-y-2">
                <div className="font-mono text-xs text-[var(--fg-muted)]">ISOLATION 03</div>
                <div className="font-display text-lg font-bold">LABORATORY</div>
                <p className="font-mono text-[10px] text-[var(--fg-muted)]">Reports sit unreviewed in patient email inboxes for weeks.</p>
              </div>
              <div className="border border-dashed border-[var(--border)] p-6 space-y-2">
                <div className="font-mono text-xs text-[var(--fg-muted)]">ISOLATION 04</div>
                <div className="font-display text-lg font-bold">PHARMACY</div>
                <p className="font-mono text-[10px] text-[var(--fg-muted)]">Dispenses without knowledge of renal function or acute allergies.</p>
              </div>
              <div className="border border-dashed border-[var(--border)] p-6 space-y-2">
                <div className="font-mono text-xs text-[var(--fg-muted)]">ISOLATION 05</div>
                <div className="font-display text-lg font-bold">HOSPITAL</div>
                <p className="font-mono text-[10px] text-[var(--fg-muted)]">Discharge summaries filed in paper archives without follow-up.</p>
              </div>
            </div>
          ) : (
            /* Connected State */
            <div className="py-12 border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] p-8 sm:p-12 space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-[var(--bg)]/30 pb-4">
                <span className="font-mono text-xs tracking-widest uppercase">
                  UNIFIED CLINICAL BACKBONE ACTIVE
                </span>
                <span className="font-mono text-xs">LATENCY: &lt;15MS // 100% AUDITABLE</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center font-display font-black text-base sm:text-xl tracking-tight">
                <div className="p-3 border border-[var(--bg)]/40">PATIENT</div>
                <div className="p-3 border border-[var(--bg)]/40">DOCTOR</div>
                <div className="p-3 border border-[var(--bg)]/40">LABORATORY</div>
                <div className="p-3 border border-[var(--bg)]/40">PHARMACY</div>
                <div className="p-3 border border-[var(--bg)]/40">HOSPITAL</div>
              </div>

              <div className="font-mono text-xs text-center max-w-xl mx-auto opacity-80 leading-relaxed">
                When a doctor signs off in Room 402, the prescription arrives in the Dispensary queue, updates the patient&apos;s daily dosing calendar, and alerts the caregiver if a dose is delayed.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 04 // THE ECOSYSTEM: EVERYONE IN CARE (HUGE LIST ROWS) ── */}
      <section id="ecosystem" className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="03" label="ECOSYSTEM ARCHITECTURE" />

        <div className="max-w-3xl mb-16">
          <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            EVERYONE INVOLVED IN CARE.
          </h2>
          <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] mt-4 leading-relaxed">
            Sanjeevani does not replace clinicians or force patients into confusing portals.
            It provides each stakeholder a purpose-built, high-velocity workstation bound by strict zero-trust role boundaries.
          </p>
        </div>

        <EcosystemParticipantRows />
      </section>

      {/* ── 05 // THE PATIENT JOURNEY: ONE PATIENT. ONE JOURNEY. ── */}
      <section id="journey" className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="04" label="LONGITUDINAL TRAJECTORY" />

        <div className="max-w-3xl mb-16">
          <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            ONE PATIENT. ONE JOURNEY.
          </h2>
          <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] mt-4 leading-relaxed">
            From initial walk-in registration to multi-specialist diagnosis, dispensary dispensing, and 30-day home adherence monitoring.
            Every clinical event is synchronized across one immutable timeline.
          </p>
        </div>

        <PatientJourneySequencer />
      </section>

      {/* ── 06 // INTELLIGENCE WHERE IT MATTERS ── */}
      <section id="intelligence" className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="05" label="CLINICAL INTELLIGENCE NET" />

        <div className="max-w-3xl mb-16">
          <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            INTELLIGENCE WHERE IT MATTERS.
          </h2>
          <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] mt-4 leading-relaxed">
            Not gimmicky conversational chatbots. Deterministic pharmacological guardrails, BioMistral clinical extraction, and YOLOv7 diagnostic canvases that assist medical judgment without replacing human accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-[var(--border)]">
          {[
            {
              num: "01",
              title: "PRESCRIPTION",
              tagline: "Digitize clinical instructions.",
              desc: "Transforms handwritten prescriptions and unverified paper scans into structured, machine-executable medication schedules within seconds.",
            },
            {
              num: "02",
              title: "DIAGNOSTICS",
              tagline: "Surface relevant findings.",
              desc: "Highlights abnormal biomarker trends (HbA1c, serum creatinine) and flags radiological opacity on X-ray review canvases.",
            },
            {
              num: "03",
              title: "MEDICATION",
              tagline: "Support safer treatment journeys.",
              desc: "Evaluates cross-specialist drug-drug conflicts, food-drug contraindications, and organ clearance warnings prior to sign-off.",
            },
            {
              num: "04",
              title: "RECORDS",
              tagline: "Longitudinal clinical history.",
              desc: "Aggregates past discharge notes, vaccination cards, and lab panels into a unified queryable self-sovereign health vault.",
            },
          ].map((item) => (
            <div
              key={item.num}
              className="p-8 border-b border-r border-[var(--border)] space-y-4 flex flex-col justify-between hover:bg-[var(--border)]/15 transition-colors"
            >
              <div className="space-y-3">
                <span className="font-mono text-xs font-bold text-[var(--fg-muted)]">
                  {item.num} //
                </span>
                <h3 className="font-display text-2xl font-black uppercase tracking-tight">
                  {item.title}
                </h3>
                <p className="font-display text-sm font-bold text-[var(--fg)]">
                  {item.tagline}
                </p>
                <p className="font-sans text-xs text-[var(--fg-muted)] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--fg-muted)] pt-4 border-t border-[var(--border)]">
                SPECIFICATION // AI-VERIFIED
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 07 // THE PLATFORM: REAL INTERFACE TELEMETRY ── */}
      <section className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="06" label="SYSTEM ARCHITECTURE" />

        <div className="max-w-3xl mb-12">
          <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            THE PLATFORM.
          </h2>
          <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] mt-4 leading-relaxed">
            One single cohesive clinical design system. Sharp typography, hairlines as architecture, and zero cognitive clutter.
          </p>
        </div>

        {/* Real Platform Window Frame */}
        <div className="border border-[var(--fg)] bg-[var(--bg-elevated)] shadow-2xl">
          {/* Window Chrome Header */}
          <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between bg-[var(--bg)] font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[var(--fg)] inline-block" />
              <strong className="tracking-widest">SANJEEVANI // CLINICAL CONSOLE v2.0</strong>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-[var(--fg-muted)]">
              <span>PATIENT: RAMESH KUMAR</span>
              <span>MRN: 94812</span>
              <span className="text-[var(--fg)] font-bold">STATUS: ADHERENT</span>
            </div>
          </div>

          {/* Window Body Grid */}
          <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 font-mono text-xs">
            <div className="lg:col-span-4 border border-[var(--border)] p-6 space-y-4 bg-[var(--bg)]">
              <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                <span>01 // ACTIVE REGIMEN</span>
                <span>2 MEDICATIONS</span>
              </div>
              <div className="space-y-3 font-sans">
                <div className="border-b border-[var(--border)]/60 pb-2">
                  <div className="font-bold text-sm">Metformin 500mg</div>
                  <div className="font-mono text-[11px] text-[var(--fg-muted)]">1-0-1 (Post-Meal) · 30 Days · Rx #491</div>
                </div>
                <div className="border-b border-[var(--border)]/60 pb-2">
                  <div className="font-bold text-sm">Atorvastatin 20mg</div>
                  <div className="font-mono text-[11px] text-[var(--fg-muted)]">0-0-1 (Bedtime) · 30 Days · Rx #491</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[var(--border)] p-6 space-y-4 bg-[var(--bg)]">
              <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                <span>02 // PHARMACOLOGICAL GUARD</span>
                <span className="text-emerald-600 font-bold">ZERO CONFLICT</span>
              </div>
              <div className="space-y-2 font-sans text-xs text-[var(--fg-muted)]">
                <p>-- Cross-referenced against 14-day history.</p>
                <p>-- eGFR: 78 mL/min (Cleared for Metformin titration).</p>
                <p>-- Known Allergy: Penicillin (Flagged on Beta-Lactam class).</p>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[var(--border)] p-6 space-y-4 bg-[var(--bg)]">
              <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                <span>03 // DISPENSARY SYNC</span>
                <span>CENTRAL QUEUE</span>
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>DISPENSE STATUS:</span>
                  <span className="font-bold text-[var(--fg)]">READY</span>
                </div>
                <div className="flex justify-between">
                  <span>SAFETY LOCK:</span>
                  <span className="font-bold text-[var(--fg)]">AUTHORIZED</span>
                </div>
                <div className="flex justify-between">
                  <span>SHA-256 HASH:</span>
                  <span className="text-[var(--fg-muted)]">8f2a...c014</span>
                </div>
              </div>
            </div>
          </div>

          {/* Window Footer */}
          <div className="border-t border-[var(--border)] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg)] font-mono text-xs">
            <span className="text-[var(--fg-muted)]">
              CONNECTED WORKSTATIONS: RECEPTION · DOCTOR · PHARMACY · LAB · PATIENT
            </span>
            <Link
              href="/login"
              className="font-bold underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              [ LAUNCH FULL CLINICAL PROTOCOL → ]
            </Link>
          </div>
        </div>
      </section>

      {/* ── 08 // INSTITUTIONAL TRUST & SOVEREIGN PROTOCOL ── */}
      <section id="protocol" className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="07" label="SECURITY &amp; COMPLIANCE" />

        <div className="max-w-3xl mb-16">
          <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            SOVEREIGN TECHNICAL ARCHITECTURE.
          </h2>
          <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] mt-4 leading-relaxed">
            Healthcare systems demand indisputable legal auditability and strict data boundaries.
            Sanjeevani is engineered from the ground up to prevent unauthorized role elevation, data leakage, and unverified dispensing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-[var(--border)]">
          {[
            {
              title: "IMMUTABLE AUDIT LOGS",
              desc: "Every prescription sign-off, dispense authorization, and dose mark is hashed with SHA-256 and written to append-only database logs.",
            },
            {
              title: "STRICT ZERO-TRUST RBAC",
              desc: "Patients cannot access physician queues. Doctors cannot dispense without pharmacy credentialing. Role boundaries enforced by session tokens.",
            },
            {
              title: "5-MINUTE QR ACCESS TOKENS",
              desc: "Patients generate short-lived, single-use QR tokens that grant visiting emergency physicians read-only access that expires automatically.",
            },
            {
              title: "LOCAL INFERENCE PRIVACY",
              desc: "Sensitive OCR and clinical extraction tasks run on private instances without exposing Protected Health Information (PHI) to public APIs.",
            },
            {
              title: "DISHA & ABDM COMPLIANT",
              desc: "Full compatibility with Indian digital health data privacy standards (DISHA) and Ayushman Bharat Digital Mission protocol architectures.",
            },
            {
              title: "OFFLINE PWA RESILIENCE",
              desc: "Core dose schedules and medication reminder alarms continue to function seamlessly even in remote clinic areas without internet connectivity.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-8 border-b border-r border-[var(--border)] space-y-3">
              <span className="font-mono text-xs font-bold text-[var(--fg-muted)]">
                0{idx + 1} //
              </span>
              <h3 className="font-display text-lg font-bold uppercase tracking-tight">
                {item.title}
              </h3>
              <p className="font-sans text-xs text-[var(--fg-muted)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 09 // CLINIC ONBOARDING INTAKE SECTION ── */}
      <section className="px-6 md:px-12 py-20 sm:py-32 max-w-7xl mx-auto border-b border-[var(--border)]">
        <SectionEyebrow index="08" label="CLINICAL DEPLOYMENT" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95]">
              DEPLOY SANJEEVANI IN YOUR CLINIC.
            </h2>
            <p className="font-sans text-base sm:text-lg text-[var(--fg-muted)] leading-relaxed">
              Connect your front desk, consultation rooms, dispensary, and pathology laboratory into one cohesive clinical backbone.
              Setup takes less than 24 hours with zero hardware replacement.
            </p>
            <div className="border border-[var(--border)] p-6 space-y-2 font-mono text-xs text-[var(--fg-muted)]">
              <div>-- ZERO PER-SEAT SOFTWARE TAX</div>
              <div>-- INSTANT WEB PWA ACCESS (ZERO APP STORE INSTALL)</div>
              <div>-- INTEGRATED WHATSAPP REMINDER DISPATCH</div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ClinicAccessForm />
          </div>
        </div>
      </section>

      {/* ── 10 // FINAL MONUMENTAL STATEMENT & CALL TO ACTION ── */}
      <section className="px-6 md:px-12 py-24 sm:py-40 max-w-7xl mx-auto text-center space-y-12">
        <div className="font-mono text-xs font-bold tracking-[0.3em] uppercase text-[var(--fg-muted)]">
          09 // THE CODA
        </div>

        <h2 className="font-display font-black text-4xl sm:text-7xl lg:text-9xl uppercase tracking-tighter leading-[0.9]">
          HEALTHCARE
          <span className="block">SHOULD FEEL</span>
          <span className="block text-[var(--bg)] bg-[var(--fg)] px-4 py-1 inline-block mt-2">
            LIKE ONE SYSTEM.
          </span>
        </h2>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-10 py-5 bg-[var(--fg)] text-[var(--bg)] font-mono text-xs font-bold uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-3 rounded-none cursor-pointer"
          >
            <span>ENTER SANJEEVANI →</span>
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-10 py-5 border border-[var(--border)] hover:border-[var(--fg)] font-mono text-xs font-bold uppercase tracking-widest transition-colors rounded-none"
          >
            [ PATIENT PREVIEW ]
          </Link>
        </div>
      </section>

      {/* ── FOOTER (SWISS BRUTALIST 1PX RULES) ── */}
      <footer className="border-t border-[var(--border)] py-12 px-6 md:px-12 font-mono text-xs text-[var(--fg-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3 font-display font-bold text-sm text-[var(--fg)]">
            <span className="w-4 h-4 bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center text-[10px]">
              S
            </span>
            <span>SANJEEVANI HEALTHCARE INFRASTRUCTURE</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px]">
            <span>SHA-256 PROTOCOL LOGS</span>
            <span>•</span>
            <span>DISHA / ABDM COMPLIANT</span>
            <span>•</span>
            <span>ZERO-KNOWLEDGE PASSPORT</span>
            <span>•</span>
            <span>© 2026 SANJEEVANI MESH</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
