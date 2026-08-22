import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

interface RefillRequest {
  id: string;
  patient_id: string;
  patient_name: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  remaining_days: number;
  refill_quantity: number;
  refills_available: number;
  max_refills: number;
  request_notes: string;
  requested_at: string;
  urgency: string;
  status: string;
}

interface RefillQueueProps {
  refillRequests: RefillRequest[];
  doctorId?: string;
  onRefillAction: () => void;
}

export default function RefillQueue({
  refillRequests,
  doctorId = "doc-sharma-1",
  onRefillAction,
}: RefillQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (refillId: string) => {
    setActionLoading(refillId);
    try {
      await fetch(`${API_BASE}/doctor/refill-requests/${refillId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          doctor_notes: doctorNotes[refillId] || "Approved — continue same regimen and dosage",
        }),
      });
      onRefillAction();
    } catch (e) {
      console.error("Approve failed:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (refillId: string) => {
    setActionLoading(refillId);
    try {
      await fetch(`${API_BASE}/doctor/refill-requests/${refillId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          reason: doctorNotes[refillId] || "Requires in-person clinical review before refill authorization",
        }),
      });
      onRefillAction();
    } catch (e) {
      console.error("Deny failed:", e);
    } finally {
      setActionLoading(null);
    }
  };

  if (refillRequests.length === 0) {
    return (
      <div className="text-center py-8 card-clinical p-6">
        <svg className="w-12 h-12 mx-auto text-doc-fg-dim mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-doc-fg-muted font-medium">No pending refill requests.</p>
        <p className="text-xs text-doc-fg-dim mt-1">Refill requests from patients will appear here sorted by urgency.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {refillRequests.map((req) => {
        const isExpanded = expandedId === req.id;
        const isLoading = actionLoading === req.id;

        return (
          <div
            key={req.id}
            className={`card-clinical overflow-hidden animate-slide-up transition-all ${
              req.urgency === "urgent" || req.remaining_days <= 3
                ? "border-l-4 border-l-severity-critical"
                : "border-l-4 border-l-severity-warning"
            }`}
          >
            {/* Summary row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
              className="w-full text-left p-4 hover:bg-doc-hover transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-doc-fg">{req.patient_name}</span>
                  <span
                    className={`severity-pill ${
                      req.urgency === "urgent" || req.remaining_days <= 3 ? "severity-critical" : "severity-warning"
                    }`}
                  >
                    {req.urgency === "urgent" || req.remaining_days <= 3 ? "URGENT REFILL" : "NORMAL"}
                  </span>
                </div>
                <span className={`text-xs font-semibold ${req.remaining_days <= 3 ? "text-severity-critical" : "text-severity-warning"}`}>
                  {req.remaining_days} days supply left
                </span>
              </div>
              <p className="text-sm font-medium text-doc-fg">
                {req.medicine_name} — {req.dosage} ({req.frequency})
              </p>
              <div className="flex items-center justify-between mt-1 text-xs text-doc-fg-dim">
                <span>Refills: {req.refills_available}/{req.max_refills} available</span>
                <span>Requested: {new Date(req.requested_at).toLocaleDateString()}</span>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-doc-border pt-3 animate-slide-up space-y-3 bg-doc-elevated">
                {req.request_notes && (
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim mb-1">
                      Patient Notes
                    </p>
                    <p className="text-xs text-doc-fg bg-doc-bg rounded-lg p-2.5 border border-doc-border italic">
                      "{req.request_notes}"
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim mb-1">
                    Physician Response & Clinical Notes
                  </p>
                  <textarea
                    value={doctorNotes[req.id] || ""}
                    onChange={(e) =>
                      setDoctorNotes({ ...doctorNotes, [req.id]: e.target.value })
                    }
                    placeholder="E.g., Approved, maintain regular BP logging..."
                    rows={2}
                    className="w-full bg-doc-bg border border-doc-border rounded-lg px-3 py-2 text-xs text-doc-fg placeholder:text-doc-fg-dim focus:border-doc-accent focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={isLoading}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    {isLoading ? "Processing..." : "Approve Refill"}
                  </button>
                  <button
                    onClick={() => handleDeny(req.id)}
                    disabled={isLoading}
                    className="btn-outline text-xs py-2 px-4 text-severity-critical hover:bg-severity-critical/10 hover:border-severity-critical"
                  >
                    Deny
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
