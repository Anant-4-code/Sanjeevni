import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

interface FollowUpSchedulerProps {
  patientId: string;
  patientName: string;
  onScheduled?: (result: any) => void;
}

export default function FollowUpScheduler({
  patientId,
  patientName,
  onScheduled,
}: FollowUpSchedulerProps) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scheduled, setScheduled] = useState<any>(null);

  const handleSubmit = async () => {
    if (!date) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: "demo-doctor",
          scheduled_date: date,
          reason,
        }),
      });
      const data = await res.json();
      setScheduled(data);
      onScheduled?.(data);
    } catch (e) {
      console.error("Follow-up scheduling failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (scheduled) {
    return (
      <div className="card-clinical p-4 alert-card-safe animate-slide-up">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-severity-safe" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-severity-safe">Follow-Up Scheduled</span>
        </div>
        <p className="text-sm text-doc-fg">
          {patientName} — {new Date(date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p className="text-xs text-doc-fg-muted mt-1">
          Patient will receive an automated reminder. {reason && `Reason: ${reason}`}
        </p>
        <button
          onClick={() => { setScheduled(null); setDate(""); setReason(""); }}
          className="btn-outline text-xs py-1 px-2 mt-3"
        >
          Schedule Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold">
        Schedule Follow-Up
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
            Follow-Up Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg focus:border-doc-accent focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
            Reason (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. HbA1c recheck"
            className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg placeholder:text-doc-fg-dim focus:border-doc-accent focus:outline-none transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!date || submitting}
          className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
        >
          {submitting ? "Scheduling…" : "Schedule →"}
        </button>
      </div>
    </div>
  );
}
