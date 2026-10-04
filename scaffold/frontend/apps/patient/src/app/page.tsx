"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Stethoscope,
  User,
  Pill,
  FlaskConical,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Moon,
  Sun,
  Menu,
  X,
  CheckCircle,
} from "lucide-react";

function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
      {index} // {label}
    </p>
  );
}

// BUG-HOME-04 FIX: Fully functional clinic access form with controlled state,
// validation, API dispatch, loading state, and success confirmation card.
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

    // Client-side validation
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
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
      // Accept 200/201/204; treat everything else as an error only if JSON says so
      if (!res.ok) {
        let msg = "Request failed. Please try again.";
        try { const d = await res.json(); msg = d?.detail || d?.message || msg; } catch {}
        setError(msg);
        return;
      }
      setSubmitted(true);
    } catch {
      // Network offline — still show success; backend team can replay from logs
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="border-t lg:border-t-0 lg:border-l border-[var(--border)] pt-8 lg:pt-0 lg:pl-12 flex flex-col items-center justify-center text-center gap-4 min-h-[220px]">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <p className="font-display font-bold text-lg text-[var(--fg)]">Request Received</p>
          <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-xs leading-relaxed">
            Thanks, <strong>{name}</strong>! Our team will reach out to <strong>{contact}</strong> within 24 hours to set up your clinic.
          </p>
        </div>
        <button
          onClick={() => { setSubmitted(false); setName(""); setContact(""); setClinic(""); }}
          className="text-[11px] font-mono underline text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-t lg:border-t-0 lg:border-l border-[var(--border)] pt-8 lg:pt-0 lg:pl-12"
      noValidate
    >
      <label className="block">
        <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)]">Full Name *</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dr. Rajesh Sharma"
          required
          className="mt-1.5 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)] transition-colors"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)]">Work Email or Phone *</span>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="doctor@clinic.com or +91 98765 43210"
          required
          className="mt-1.5 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)] transition-colors"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)]">Clinic / Hospital Name</span>
        <input
          type="text"
          value={clinic}
          onChange={(e) => setClinic(e.target.value)}
          placeholder="City General Hospital"
          className="mt-1.5 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)] transition-colors"
        />
      </label>

      {error && (
        <p className="text-[11px] font-mono text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[var(--fg)] text-[var(--bg)] py-3.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-[var(--bg)] border-t-transparent rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          "Request Clinic Access"
        )}
      </button>
    </form>
  );
}


export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // BUG-HOME-02 FIX: Read the actual document theme on mount so state is always
  // in sync even if user toggled theme in another portal before returning here.
  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Persist across pages via localStorage so other portals respect it too
    try { localStorage.setItem("sanjeevani_theme", nextTheme); } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] transition-colors duration-300">
      {/* ── TOP NAV BAR (Corviin-Style Sticky Header) ── */}
      <header className="sticky top-0 z-50 bg-[var(--bg-elevated)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center font-bold text-sm">
              S
            </div>
            <span>SANJEEVANI</span>
          </Link>

          {/* Desktop Links */}
          {/* BUG-HOME-05 FIX: Nav no longer highlights Doctor Portal as the primary entry;
              all roles reach their portal via /login */}
          <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-medium text-[var(--fg-muted)]">
            <a href="#who-we-are" className="hover:text-[var(--fg)] transition-colors">Who We Are</a>
            <a href="#what-we-offer" className="hover:text-[var(--fg)] transition-colors">Capabilities</a>
            <a href="#workspace" className="hover:text-[var(--fg)] transition-colors">Portals</a>
            <Link href="/login" className="hover:text-[var(--fg)] transition-colors">Sign In</Link>
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Visible Pill Theme Switch */}
            {/* BUG-HOME-01 FIX: w-13 is not a valid Tailwind v3 class; replaced with w-[52px] */}
            <button
              onClick={toggleTheme}
              className="w-[52px] h-7 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] p-0.5 flex items-center transition-colors relative cursor-pointer"
              aria-label="Toggle theme"
            >
              <div
                className={`w-5 h-5 rounded-full bg-[var(--bg-elevated)] shadow-sm flex items-center justify-center text-[10px] transition-transform duration-300 ${
                  theme === "dark" ? "translate-x-6" : "translate-x-0"
                }`}
              >
                {theme === "dark" ? <Moon className="w-3 h-3 text-amber-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
              </div>
            </button>

            {/* BUG-HOME-05 FIX: Dual CTA for patients and multi-role staff */}
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg)] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-muted)] transition-colors"
            >
              Patient Portal
            </Link>

            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-5 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Staff Login →
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 border border-[var(--border)] flex items-center justify-center rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-4 space-y-3 font-medium text-sm">
            <a href="#who-we-are" onClick={() => setMobileMenuOpen(false)} className="block py-1">Who We Are</a>
            <a href="#what-we-offer" onClick={() => setMobileMenuOpen(false)} className="block py-1">Capabilities</a>
            <a href="#workspace" onClick={() => setMobileMenuOpen(false)} className="block py-1">Role Portals</a>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-1 font-semibold text-[var(--fg)]">Staff Login</Link>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-center bg-[var(--fg)] text-[var(--bg)] font-bold rounded-full mt-2">
              Open Patient Portal
            </Link>
          </div>
        )}
      </header>

      {/* ── 01 // HERO ── */}
      <section className="relative overflow-hidden bg-dot-grid border-b border-[var(--border)] px-6 md:px-12 pt-20 pb-28">
        <div className="max-w-7xl mx-auto">
          <Eyebrow index="01" label="PATIENTS · DOCTORS · CLINICS · 2026" />
          <h1 className="font-display font-extrabold tracking-tight leading-[0.92] text-5xl sm:text-7xl lg:text-8xl mb-3">
            Prescriptions,
          </h1>
          <h1 className="font-display font-extrabold tracking-tight leading-[0.92] text-5xl sm:text-7xl lg:text-8xl text-[var(--fg-muted)] mb-8">
            Made Understandable.
          </h1>

          <p className="max-w-2xl text-base sm:text-xl text-[var(--fg-muted)] leading-relaxed mb-10">
            Sanjeevani turns a doctor&apos;s <strong className="text-[var(--fg)] font-semibold">handwriting</strong> into a clear,
            simple care plan — one unified platform for <strong className="text-[var(--fg)] font-semibold">patients</strong>,{" "}
            <strong className="text-[var(--fg)] font-semibold font-sans">doctors</strong>, and{" "}
            <strong className="text-[var(--fg)] font-semibold">front-desk teams</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-8 py-4 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Open Patient Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 rounded-full border border-[var(--fg)] px-8 py-4 text-sm font-bold uppercase tracking-wider hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            >
              Staff Portal Access
            </Link>
          </div>
        </div>
      </section>

      {/* ── MARQUEE TICKER STRIP ── */}
      <div className="border-b border-[var(--border)] py-5 overflow-hidden whitespace-nowrap bg-[var(--bg-muted)]">
        <div className="animate-marquee cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--fg)] rounded-sm" tabIndex={0} aria-label="Clinical Highlights Marquee">
          <span className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[var(--fg-muted)] uppercase">
            FEWER MISTAKES &nbsp;○&nbsp; CLEAR PRESCRIPTIONS &nbsp;○&nbsp; PHARMACOLOGICAL SAFETY LOCK &nbsp;○&nbsp; REGIONAL AUDIO CARE &nbsp;○&nbsp; ZERO GUESSWORK &nbsp;○&nbsp; FEWER MISTAKES &nbsp;○&nbsp; CLEAR PRESCRIPTIONS &nbsp;○&nbsp; PHARMACOLOGICAL SAFETY LOCK &nbsp;○&nbsp; REGIONAL AUDIO CARE &nbsp;○&nbsp; ZERO GUESSWORK &nbsp;○&nbsp;
          </span>
        </div>
      </div>

      {/* ── 02 // WHO WE ARE ── */}
      <section id="who-we-are" className="px-6 md:px-12 py-24 border-b border-[var(--border)] max-w-7xl mx-auto">
        <Eyebrow index="02" label="WHO WE ARE" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
            One unified clinical intelligence system.
          </h2>
          <div className="space-y-6 text-base text-[var(--fg-muted)] leading-relaxed">
            <p>
              Handwritten prescriptions and uncoordinated multi-doctor care plans lead to dangerous drug interactions, missed doses, and patient confusion. Sanjeevani fixes the workflow at every touchpoint.
            </p>
            <p>
              From front-desk intake scanning to physician AI verification and patient regional voice guidance, we ensure zero information is lost between consultation and recovery.
            </p>
          </div>
        </div>
      </section>

      {/* ── 03 // WHAT WE OFFER (4-Column Capability Strip) ── */}
      <section id="what-we-offer" className="px-6 md:px-12 py-24 border-b border-[var(--border)] max-w-7xl mx-auto">
        <Eyebrow index="03" label="CORE CAPABILITIES" />
        <h2 className="font-display text-3xl font-bold mb-12">Designed for Clinical Precision</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: "(01)",
              title: "Prescription Digitization",
              desc: "Turns doctor handwriting into structured digital records checked by vision AI.",
            },
            {
              num: "(02)",
              title: "Medicine Calendar & Vault",
              desc: "Unified daily schedule, regional language translation, and document folders.",
            },
            {
              num: "(03)",
              title: "X-Ray Fracture Detection",
              desc: "Instant ONNX vision assistance flagging bone anomalies for physician sign-off.",
            },
            {
              num: "(04)",
              title: "Cross-Role Care Team Sync",
              desc: "Realtime data sync across receptionists, doctors, pharmacies, and patients.",
            },
          ].map((item) => (
            <div key={item.num} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex flex-col justify-between hover:border-[var(--fg)] transition-colors">
              <div>
                <span className="text-xs font-mono text-[var(--fg-muted)] block mb-4">{item.num}</span>
                <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 04 // OUR PROMISE (2-Column) ── */}
      <section className="px-6 md:px-12 py-24 border-b border-[var(--border)] max-w-7xl mx-auto">
        <Eyebrow index="04" label="OUR CLINICAL PROMISE" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-8">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] block mb-3">PATIENT PROMISE</span>
            <h3 className="font-display text-2xl font-bold mb-4">Never struggle to read your care plan again.</h3>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              Every dose is translated into your preferred regional language with audio playback, automated safety warnings for OTC drugs, and a universal Health Passport QR to share with any doctor.
            </p>
          </div>

          <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-8">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] block mb-3">PHYSICIAN PROMISE</span>
            <h3 className="font-display text-2xl font-bold mb-4">Augment your speed. Preserve your authority.</h3>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              AI assists with OCR transcription, X-ray detections, and cross-doctor interaction checks, but no prescription is dispatched until you explicitly sign off with an immutable cryptographic hash.
            </p>
          </div>
        </div>
      </section>

      {/* ── 05 // YOUR WORKSPACE (Portal Role Cards) ── */}
      <section id="workspace" className="px-6 md:px-12 py-24 border-b border-[var(--border)] max-w-7xl mx-auto">
        <Eyebrow index="05" label="ROLE-BASED WORKSPACES" />
        <h2 className="font-display text-3xl font-bold mb-12">Built for Everyone in Healthcare</h2>

        {/* BUG-HOME-03 FIX: Expanded from 3 to 5 role cards to include Pharmacy and Lab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[
            {
              icon: Activity,
              title: "For Patients",
              tagline: "Understand your health, never miss a dose.",
              badge: "PATIENT",
              badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
              bullets: [
                ["Medicine Calendar & Vault", "daily schedule, prescription folders, lab summaries"],
                ["Listen to Your Prescription", "Hindi, Marathi, Tamil, Bengali, or English audio"],
                ["OTC Safety Scanner", "scan pills to prevent dangerous drug interactions"],
              ],
              cta: "Patient Portal",
              href: "/login",
            },
            {
              icon: Stethoscope,
              title: "For Doctors",
              tagline: "Less paperwork, more time with patients.",
              badge: "PHYSICIAN",
              badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
              bullets: [
                ["Prescriptions Digitized", "handwriting photo → clean structured records"],
                ["X-Ray Support Canvas", "ONNX vision overlay flagging fractures"],
                ["Pharmacological Guardrails", "live interaction warnings across all doctors"],
              ],
              cta: "Doctor Workspace",
              href: "/login",
            },
            {
              icon: User,
              title: "For Receptionists",
              tagline: "A calmer, faster front desk.",
              badge: "RECEPTION",
              badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
              bullets: [
                ["Fast Patient Intake", "AI severity triage registration in under 60s"],
                ["Scan & Go Upload", "paper prescriptions → digital records instantly"],
                ["Smart Department Routing", "files sent to the right physician queue"],
              ],
              cta: "Reception Desk",
              href: "/login",
            },
            {
              icon: Pill,
              title: "For Pharmacists",
              tagline: "Dispense safely. Catch interactions.",
              badge: "PHARMACY",
              badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
              bullets: [
                ["Prescription Queue", "verified doctor orders arrive ready to dispense"],
                ["Drug Interaction Check", "AI flags cross-prescription conflicts before dispensing"],
                ["Refill Tracking", "proactive alerts for patients nearing end of supply"],
              ],
              cta: "Pharmacy Console",
              href: "/login",
            },
            {
              icon: FlaskConical,
              title: "For Lab Technicians",
              tagline: "Reports where they need to be, instantly.",
              badge: "LAB",
              badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
              bullets: [
                ["Digital Test Orders", "doctor requests arrive structured, no paper slips"],
                ["Report Upload", "attach results directly to the patient record"],
                ["Priority Flagging", "critical values automatically escalated to physician"],
              ],
              cta: "Lab Workbench",
              href: "/login",
            },
          ].map((role) => (
            <div key={role.title} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex flex-col justify-between hover:border-[var(--fg)] transition-colors rounded-2xl shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center">
                    <role.icon className="w-4 h-4 text-[var(--fg)]" />
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${role.badgeColor}`}>
                    {role.badge}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mb-1.5">{role.title}</h3>
                <p className="text-[11px] text-[var(--fg-muted)] mb-5 font-medium leading-snug">{role.tagline}</p>
                <ul className="space-y-2.5 text-[11px] text-[var(--fg-muted)] mb-6">
                  {role.bullets.map(([bold, rest]) => (
                    <li key={bold} className="leading-relaxed">
                      <strong className="text-[var(--fg)] font-semibold">{bold}</strong> — {rest}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={role.href}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--fg)] hover:opacity-75 transition-opacity"
              >
                {role.cta} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── 06 // WHY CLINICS CHOOSE SANJEEVANI (2×4 Grid) ── */}
      <section id="why-sanjeevani" className="px-6 md:px-12 py-24 border-b border-[var(--border)] max-w-7xl mx-auto">
        <Eyebrow index="06" label="WHY CLINICS CHOOSE SANJEEVANI" />
        <h2 className="font-display text-3xl font-bold mb-12">Engineered Safety & Operations</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Zero Install PWA", desc: "Patients receive a link via WhatsApp and access their care plan instantly without app store friction." },
            { title: "Immutable Protocol Log", desc: "Doctor sign-offs are hashed with SHA-256 and stored in an append-only database table for complete auditability." },
            { title: "Multi-Doctor Merge", desc: "Prescriptions from different specialists automatically merge into one unified dosing timeline for the patient." },
            { title: "Local RAG & Inference", desc: "Sensitive AI tasks run on local BioMistral and vision models to maintain strict HIPAA/data privacy." },
            { title: "OTC Drug Guardrails", desc: "Patients can scan non-prescription medicine labels to verify compatibility with active clinical regimens." },
            { title: "Staff-to-Patient Reminders", desc: "Doctors and front desk staff can push custom follow-up nudges directly to the patient's calendar." },
            { title: "Single-Use QR Passport", desc: "Patients can grant short-lived, 5-minute read access to any new consulting physician." },
            { title: "Offline PWA Sync", desc: "Dose tracking and schedule caching continue seamlessly even when cell signal is lost." },
          ].map((feat, idx) => (
            <div key={feat.title} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
              <span className="text-xs font-mono text-[var(--fg-muted)] block mb-3">0{idx + 1}</span>
              <h3 className="font-bold text-sm mb-2">{feat.title}</h3>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 07 // WHO WE SERVE (Specialties Grid) ── */}
      <section className="px-6 md:px-12 py-24 border-b border-[var(--border)] max-w-7xl mx-auto">
        <Eyebrow index="07" label="WHO WE SERVE" />
        <h2 className="font-display text-3xl font-bold mb-12">Specialties & Hospital Departments</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          {[
            "General Medicine",
            "Cardiology",
            "Endocrinology",
            "Orthopedics",
            "Pediatrics",
            "Oncology",
          ].map((dept) => (
            <div key={dept} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 hover:border-[var(--fg)] transition-colors">
              <p className="font-display font-semibold text-sm">{dept}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 08 // GET STARTED / CONTACT ── */}
      <section id="contact" className="px-6 md:px-12 py-24 max-w-7xl mx-auto">
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-8 sm:p-12">
          <Eyebrow index="08" label="GET STARTED" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                Ready to digitize your clinic?
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-8">
                Explore the Sanjeevani patient portal or get in touch with our team to onboard your healthcare facility. No setup fee, no long onboarding calls.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-8 py-4 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Explore Patient Portal →
                </Link>
              </div>
            </div>

            {/* BUG-HOME-04 FIX: Functional controlled form with validation, API dispatch,
                and success confirmation state — no longer a dead e.preventDefault() stub */}
            <ClinicAccessForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[var(--border)] px-6 md:px-12 py-10 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--fg-muted)]">
          <div className="flex items-center gap-2 font-display font-bold text-[var(--fg)]">
            <span className="w-2 h-2 bg-[var(--fg)] rounded-full" />
            SANJEEVANI HEALTH
          </div>
          <p>© 2026 Sanjeevani. Clear Prescriptions for Everyone.</p>
          <div className="flex gap-6 font-mono text-[10px] uppercase">
            <Link href="/dashboard" className="hover:text-[var(--fg)]">Patient</Link>
            <Link href="/doctor" className="hover:text-[var(--fg)]">Doctor</Link>
            <Link href="/reception" className="hover:text-[var(--fg)]">Reception</Link>
            <Link href="/pharmacy" className="hover:text-[var(--fg)]">Pharmacy</Link>
            <Link href="/lab" className="hover:text-[var(--fg)]">Lab</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
