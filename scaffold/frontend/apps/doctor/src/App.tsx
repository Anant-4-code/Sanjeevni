import { useEffect, useState, useCallback } from "react";
import DoctorQueue from "./components/DoctorQueue";
import PatientDashboard from "./components/PatientDashboard";
import RefillQueue from "./components/RefillQueue";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const DOCTOR_ID = "demo-doctor";

type View = "queue" | "refills";

export default function App() {
  const [view, setView] = useState<View>("queue");
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDash, setPatientDash] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [refillRequests, setRefillRequests] = useState<any[]>([]);

  // ── Load queue ──────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (e) {
      console.error("Queue load failed:", e);
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

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
    setView("queue");
    loadPatient(patientId);
  };

  const handleRefresh = () => {
    if (selectedPatientId) loadPatient(selectedPatientId);
    loadRefills();
  };

  return (
    <div className="min-h-screen bg-doc-bg text-doc-fg flex flex-col">
      {/* ── Top bar ── */}
      <header className="h-14 border-b border-doc-border bg-doc-elevated flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-base font-bold tracking-tight text-doc-fg">
            <span className="text-doc-accent">Sanjeevani</span> — Doctor Portal
          </h1>
          <div className="h-5 w-px bg-doc-border" />
          <nav className="flex gap-1">
            <button
              onClick={() => setView("queue")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                view === "queue"
                  ? "bg-doc-accent/10 text-doc-accent"
                  : "text-doc-fg-muted hover:text-doc-fg"
              }`}
            >
              Queue
              {queue.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[0.55rem] rounded-full bg-doc-card font-bold">
                  {queue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setView("refills"); loadRefills(); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                view === "refills"
                  ? "bg-doc-accent/10 text-doc-accent"
                  : "text-doc-fg-muted hover:text-doc-fg"
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-severity-safe animate-pulse" />
            <span className="text-xs text-doc-fg-muted">Backend Connected</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-doc-accent/20 flex items-center justify-center text-xs text-doc-accent font-bold">
            DR
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
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
            <main className="flex-1 overflow-y-auto p-8">
              {!selectedPatientId && !dashLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <svg className="w-16 h-16 text-doc-fg-dim mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-lg text-doc-fg-muted font-medium mb-1">
                    Select a patient from the queue
                  </p>
                  <p className="text-sm text-doc-fg-dim max-w-md">
                    Click on any patient in the waiting room to load their full clinical context,
                    medication history, symptom logs, and prescribing workspace.
                  </p>
                </div>
              )}

              {dashLoading && (
                <div className="space-y-4 max-w-4xl animate-shimmer">
                  <div className="h-8 w-64 bg-doc-border rounded" />
                  <div className="h-4 w-48 bg-doc-border rounded" />
                  <div className="grid grid-cols-4 gap-3 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="card-clinical p-4">
                        <div className="h-3 w-16 bg-doc-border rounded mb-2" />
                        <div className="h-6 w-12 bg-doc-border rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!dashLoading && patientDash && !patientDash.error && (
                <PatientDashboard data={patientDash} onRefresh={handleRefresh} />
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
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl">
              <div className="mb-6">
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-doc-accent font-semibold">
                  04 // Refill Management
                </span>
                <h2 className="font-display text-2xl font-bold text-doc-fg mt-1">
                  Refill Requests
                </h2>
                <p className="text-sm text-doc-fg-muted mt-1">
                  Review and approve pending medication refill requests from patients.
                </p>
              </div>
              <RefillQueue refillRequests={refillRequests} onRefillAction={loadRefills} />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
