import { useState, useEffect, useCallback } from "react";
import DoctorQueue from "./DoctorQueue";
import PatientDashboard from "./PatientDashboard";
import RefillQueue from "./RefillQueue";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const DOCTOR_ID = "demo-doctor";

type RoleMode = "doctor" | "reception" | "refills" | "login";

export default function App() {
  const [mode, setMode] = useState<RoleMode>("doctor");

  // Doctor state
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDash, setPatientDash] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [refillRequests, setRefillRequests] = useState<any[]>([]);

  // Reception state
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    gender: "male",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    chief_complaint: "",
  });
  const [receptionResult, setReceptionResult] = useState<any>(null);
  const [receptionLoading, setReceptionLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("doctor@sanjeevani.com");
  const [loginPass, setLoginPass] = useState("Sanjeevani@123");
  const [loginSuccess, setLoginSuccess] = useState(false);

  // ── Load queue ──────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      const q = data.queue || [];
      setQueue(q);
      if (q.length > 0 && !selectedPatientId) {
        setSelectedPatientId(q[0].patient_id);
      }
    } catch (e) {
      console.error("Queue load failed:", e);
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, [selectedPatientId]);

  // ── Load patient dashboard ──────────────────────────────────────
  const loadPatient = useCallback(async (patientId: string) => {
    setSelectedPatientId(patientId);
    setDashLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/doctor/patient/${patientId}?doctor_id=${DOCTOR_ID}`
      );
      const data = await res.json();
      setPatientDash(data);
    } catch (e) {
      console.error("Patient load failed:", e);
      setPatientDash(null);
    } finally {
      setDashLoading(false);
    }
  }, []);

  // ── Load refill requests ────────────────────────────────────────
  const loadRefills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setRefillRequests(data.refill_requests || []);
    } catch (e) {
      console.error("Refills load failed:", e);
      setRefillRequests([]);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadRefills();
  }, [loadQueue, loadRefills]);

  const handleSelectPatient = (patientId: string) => {
    loadPatient(patientId);
  };

  const handleReceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceptionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/patients/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: Number(form.age) }),
      });
      const data = await res.json();
      setReceptionResult(data);
      loadQueue();
    } finally {
      setReceptionLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSuccess(true);
    setTimeout(() => {
      setMode("doctor");
      setLoginSuccess(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[var(--doc-bg)] text-[var(--doc-fg)] flex flex-col font-sans">
      {/* ── TOP HEADER (Warm Theme with Role Switcher) ── */}
      <header className="h-16 border-b border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] flex items-center justify-between px-6 flex-shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--doc-accent)] text-white flex items-center justify-center font-bold text-sm">
              S
            </div>
            <span className="font-display text-base font-bold tracking-tight text-[var(--doc-fg)]">
              SANJEEVANI
            </span>
          </div>

          <div className="h-5 w-px bg-[var(--doc-border)]" />

          {/* Role Navigation Switcher */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setMode("doctor")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === "doctor"
                  ? "bg-[var(--doc-accent)] text-white shadow-xs"
                  : "text-[var(--doc-fg-muted)] hover:text-[var(--doc-fg)] hover:bg-[var(--doc-bg-hover)]"
              }`}
            >
              🩺 Doctor Workspace
              {queue.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[0.6rem] rounded-full bg-white/20 font-bold">
                  {queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setMode("refills")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === "refills"
                  ? "bg-[var(--doc-accent)] text-white shadow-xs"
                  : "text-[var(--doc-fg-muted)] hover:text-[var(--doc-fg)] hover:bg-[var(--doc-bg-hover)]"
              }`}
            >
              📋 Refill Requests
              {refillRequests.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[0.6rem] rounded-full bg-amber-200 text-amber-900 font-bold">
                  {refillRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setMode("reception")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === "reception"
                  ? "bg-[var(--doc-accent)] text-white shadow-xs"
                  : "text-[var(--doc-fg-muted)] hover:text-[var(--doc-fg)] hover:bg-[var(--doc-bg-hover)]"
              }`}
            >
              🏥 Reception Intake
            </button>

            <button
              onClick={() => setMode("login")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === "login"
                  ? "bg-[var(--doc-accent)] text-white shadow-xs"
                  : "text-[var(--doc-fg-muted)] hover:text-[var(--doc-fg)] hover:bg-[var(--doc-bg-hover)]"
              }`}
            >
              🔑 Unified Sign In
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000"
            className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Patient Portal (Port 3000) &rarr;
          </a>

          <div className="flex items-center gap-2 pl-2 border-l border-[var(--doc-border)]">
            <div className="w-7 h-7 rounded-full bg-[var(--doc-accent)] text-white flex items-center justify-center text-xs font-bold">
              DR
            </div>
            <span className="hidden sm:inline text-xs font-semibold">Dr. Nitin Sharma</span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── MODE 1: DOCTOR WORKSPACE ── */}
        {mode === "doctor" && (
          <>
            <div className="w-[340px] flex-shrink-0 border-r border-[var(--doc-border)] bg-[var(--doc-bg-elevated)]">
              <DoctorQueue
                queue={queue}
                selectedPatientId={selectedPatientId}
                onSelectPatient={handleSelectPatient}
                loading={queueLoading}
              />
            </div>

            <main className="flex-1 overflow-y-auto p-8">
              {dashLoading ? (
                <div className="space-y-4 max-w-4xl p-8">
                  <div className="h-8 w-64 bg-gray-200 animate-pulse rounded-lg" />
                  <div className="h-4 w-48 bg-gray-200 animate-pulse rounded-lg" />
                </div>
              ) : patientDash ? (
                <PatientDashboard data={patientDash} onRefresh={() => { if (selectedPatientId) loadPatient(selectedPatientId); loadRefills(); }} />
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-base font-bold text-gray-700">Select a patient from the queue</p>
                  <p className="text-xs mt-1">Review live triage severity, medication guardrails, and clinical history.</p>
                </div>
              )}
            </main>
          </>
        )}

        {/* ── MODE 2: REFILL REQUESTS ── */}
        {mode === "refills" && (
          <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
            <div className="mb-6">
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--doc-accent)] font-bold">
                04 // REFILL MANAGEMENT
              </span>
              <h2 className="font-display text-2xl font-bold mt-1">Medication Refill Requests</h2>
              <p className="text-xs text-[var(--doc-fg-muted)] mt-1">
                Review and approve pending patient prescription refills.
              </p>
            </div>
            <RefillQueue refillRequests={refillRequests} onRefillAction={loadRefills} />
          </main>
        )}

        {/* ── MODE 3: RECEPTION INTAKE ── */}
        {mode === "reception" && (
          <main className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
            <div className="card-clinical p-8 space-y-6">
              <div>
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--doc-accent)] font-bold">
                  01 // PATIENT REGISTRATION
                </span>
                <h1 className="font-display text-2xl font-black mt-1">New Patient Intake</h1>
                <p className="text-xs text-[var(--doc-fg-muted)]">
                  Register walk-in patients with automated NLP severity triage and live doctor queue dispatch.
                </p>
              </div>

              {receptionResult && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">✓ Patient Registered! Token #{receptionResult.token_number}</p>
                    <p className="text-[11px] text-emerald-800">Triage Priority: {receptionResult.triage?.label}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMode("doctor");
                      setSelectedPatientId(receptionResult.patient_id);
                    }}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Open in Doctor Queue &rarr;
                  </button>
                </div>
              )}

              <form onSubmit={handleReceptionSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Age</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 58"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Chief Complaint & Symptoms</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Severe chest pain radiating to left arm..."
                    value={form.chief_complaint}
                    onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
                    className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={receptionLoading}
                  className="btn-primary w-full justify-center py-3 text-xs uppercase tracking-wider"
                >
                  {receptionLoading ? "Processing Triage..." : "Register Patient & Dispatch to Doctor Queue →"}
                </button>
              </form>
            </div>
          </main>
        )}

        {/* ── MODE 4: UNIFIED LOGIN ── */}
        {mode === "login" && (
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="card-clinical p-8 max-w-md w-full space-y-6">
              <div>
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--doc-accent)] font-bold">
                  01 // AUTHENTICATION
                </span>
                <h1 className="font-display text-2xl font-black mt-1">Doctor & Staff Sign In</h1>
                <p className="text-xs text-[var(--doc-fg-muted)]">
                  Enter credentials to access clinical workspaces.
                </p>
              </div>

              {loginSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold">
                  ✓ Sign In Successful! Loading Doctor Command Workspace...
                </div>
              )}

              {/* 1-Click Role Quick Buttons */}
              <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-[10px] font-mono uppercase font-bold text-gray-700">1-Click Role Demo Sign In</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("doctor@sanjeevani.com");
                      setLoginPass("Sanjeevani@123");
                      setMode("doctor");
                    }}
                    className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-left text-xs font-bold hover:bg-emerald-100"
                  >
                    🩺 Doctor (Dr. Nitin)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("receptionist@sanjeevani.com");
                      setLoginPass("Sanjeevani@123");
                      setMode("reception");
                    }}
                    className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-left text-xs font-bold hover:bg-amber-100"
                  >
                    🏥 Reception Desk
                  </button>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-[var(--doc-fg-muted)] block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[var(--doc-border)] rounded-xl bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full justify-center py-3 text-xs uppercase tracking-wider"
                >
                  Sign In to Workspace &rarr;
                </button>
              </form>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
