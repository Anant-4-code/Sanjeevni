import { useEffect, useState, useCallback, useRef } from "react";
import DoctorQueue from "./components/DoctorQueue";
import PatientDashboard from "./components/PatientDashboard";
import RefillQueue from "./components/RefillQueue";
import { useDoctorAuth } from "./context/DoctorAuthContext";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

type View = "queue" | "refills";

export default function App() {
  const { user, doctorId, doctorName, logout } = useDoctorAuth();
  const [view, setView] = useState<View>("queue");
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDash, setPatientDash] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [refillRequests, setRefillRequests] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Load queue ──────────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue?doctor_id=${encodeURIComponent(doctorId)}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (e) {
      console.error("Queue load failed:", e);
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, [doctorId]);

  // ── Load patient dashboard ──────────────────────────────────────────────
  const loadPatient = useCallback(async (patientId: string) => {
    setSelectedPatientId(patientId);
    setPatientDash(null); // Clear immediately to prevent stale data flash
    setDashLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/doctor/patient/${patientId}?doctor_id=${encodeURIComponent(doctorId)}`
      );
      const data = await res.json();
      setPatientDash(data);
    } catch (e) {
      console.error("Patient load failed:", e);
      setPatientDash(null);
    } finally {
      setDashLoading(false);
    }
  }, [doctorId]);

  // ── Load refill requests ────────────────────────────────────────────────
  const loadRefills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=${encodeURIComponent(doctorId)}`);
      const data = await res.json();
      setRefillRequests(data.refill_requests || []);
    } catch (e) {
      console.error("Refills load failed:", e);
      setRefillRequests([]);
    }
  }, [doctorId]);

  useEffect(() => {
    loadQueue();
    loadRefills();
  }, [loadQueue, loadRefills]);

  const handleSelectPatient = (patientId: string) => {
    setView("queue");
    loadPatient(patientId);
  };

  const handleRefresh = () => {
    if (selectedPatientId) loadPatient(selectedPatientId);
    loadRefills();
  };

  return (
    <div className="min-h-screen bg-doc-bg text-doc-fg flex flex-col font-sans selection:bg-doc-accent selection:text-white">
      {/* ── Top Bar ── */}
      <header className="h-14 border-b border-doc-border bg-doc-elevated flex items-center justify-between px-5 flex-shrink-0 z-30">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-base font-bold tracking-tight text-doc-fg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-doc-accent shadow-sm shadow-doc-accent/50" />
            <span className="text-doc-accent">Sanjeevani</span>
            <span className="text-doc-fg-dim font-normal text-xs">/</span>
            <span className="text-doc-fg text-xs font-semibold uppercase tracking-wider">Physician Command</span>
          </h1>
          <div className="h-4 w-px bg-doc-border" />
          <nav className="flex gap-1">
            <button
              onClick={() => setView("queue")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "queue"
                  ? "bg-doc-accent/15 text-doc-accent font-bold"
                  : "text-doc-fg-muted hover:text-doc-fg hover:bg-doc-hover"
              }`}
            >
              Consultation Queue
              {queue.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[0.55rem] rounded-full bg-doc-card text-doc-fg font-bold">
                  {queue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setView("refills"); loadRefills(); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "refills"
                  ? "bg-doc-accent/15 text-doc-accent font-bold"
                  : "text-doc-fg-muted hover:text-doc-fg hover:bg-doc-hover"
              }`}
            >
              Refill Requests
              {refillRequests.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[0.55rem] rounded-full bg-severity-warning/20 text-severity-warning font-bold">
                  {refillRequests.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-doc-card border border-doc-border text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-severity-safe animate-pulse" />
            <span className="text-doc-fg-muted text-[11px]">System Online</span>
          </div>

          {/* Doctor Profile Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg hover:bg-doc-hover border border-transparent hover:border-doc-border transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-doc-accent/20 border border-doc-accent/40 flex items-center justify-center text-xs text-doc-accent font-bold">
                {doctorName.split(" ").pop()?.charAt(0) || "D"}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-doc-fg leading-none">{doctorName}</p>
                <p className="text-[10px] text-doc-fg-dim leading-tight mt-0.5">{user?.specialty || "Physician"}</p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-doc-card border border-doc-border rounded-xl shadow-2xl p-2 z-50 animate-slide-up">
                <div className="px-3 py-2 border-b border-doc-border">
                  <p className="text-xs font-bold text-doc-fg">{doctorName}</p>
                  <p className="text-[10px] text-doc-fg-dim font-mono">{user?.email || "dr.sharma@sanjeevani.com"}</p>
                  <div className="mt-1.5 inline-block text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-doc-elevated text-doc-accent border border-doc-border">
                    {user?.department || "Clinical Operations"}
                  </div>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-severity-critical hover:bg-severity-critical/10 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {view === "queue" && (
          <>
            {/* Queue sidebar */}
            <div className="w-[340px] flex-shrink-0">
              <DoctorQueue
                queue={queue}
                selectedPatientId={selectedPatientId}
                onSelectPatient={handleSelectPatient}
                loading={queueLoading}
              />
            </div>

            {/* Patient workspace */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-doc-bg">
              {!selectedPatientId && !dashLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-doc-card border border-doc-border flex items-center justify-center text-doc-fg-dim mb-4 shadow-inner">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-base text-doc-fg font-bold mb-1">
                    Select a patient from the queue
                  </h3>
                  <p className="text-xs text-doc-fg-dim leading-relaxed">
                    Click any patient in the waiting room to load their medical history,
                    adherence scores, symptom logs, active medications, and prescribing workspace.
                  </p>
                </div>
              )}

              {dashLoading && (
                <div className="space-y-4 max-w-4xl animate-pulse">
                  <div className="h-8 w-64 bg-doc-border rounded" />
                  <div className="h-4 w-48 bg-doc-border rounded" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="card-clinical p-4 h-24 bg-doc-elevated" />
                    ))}
                  </div>
                  <div className="h-64 bg-doc-elevated rounded-xl border border-doc-border mt-6" />
                </div>
              )}

              {!dashLoading && patientDash && !patientDash.error && (
                <PatientDashboard
                  key={patientDash.patient?.id || selectedPatientId}
                  data={patientDash}
                  doctorId={doctorId}
                  onRefresh={handleRefresh}
                />
              )}

              {!dashLoading && patientDash?.error && (
                <div className="card-clinical p-6 alert-card-critical max-w-md">
                  <p className="text-sm text-severity-critical font-semibold">
                    Failed to load patient details
                  </p>
                  <p className="text-xs text-doc-fg-muted mt-1">{patientDash.error}</p>
                </div>
              )}
            </main>
          </>
        )}

        {view === "refills" && (
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-doc-accent font-semibold">
                  04 // Prescription Refill Intelligence
                </span>
                <h2 className="font-display text-2xl font-bold text-doc-fg mt-1">
                  Pending Refill Requests
                </h2>
                <p className="text-xs text-doc-fg-muted mt-1">
                  Sorted by clinical urgency and remaining days of medication supply.
                </p>
              </div>
              <RefillQueue
                refillRequests={refillRequests}
                doctorId={doctorId}
                onRefillAction={loadRefills}
              />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
