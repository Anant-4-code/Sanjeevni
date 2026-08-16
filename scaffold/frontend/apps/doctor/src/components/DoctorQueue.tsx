interface QueueItem {
  id: string;
  patient_id: string;
  token_number: number;
  status: string;
  queued_at: string;
  patients: {
    full_name: string;
    age: number;
    gender: string;
    phone: string;
  };
  chief_complaints: {
    text: string;
    severity_level: number;
  };
}

interface DoctorQueueProps {
  queue: QueueItem[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  loading: boolean;
}

function SeverityIndicator({ level }: { level: number }) {
  const config = {
    3: { label: "CRITICAL", className: "severity-critical", dot: "bg-severity-critical" },
    2: { label: "URGENT", className: "severity-warning", dot: "bg-severity-warning" },
    1: { label: "ROUTINE", className: "severity-info", dot: "bg-severity-info" },
  }[level] || { label: "UNKNOWN", className: "severity-info", dot: "bg-doc-fg-dim" };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${config.dot} ${level === 3 ? "animate-pulse" : ""}`} />
      <span className={`severity-pill ${config.className}`}>{config.label}</span>
    </div>
  );
}

export default function DoctorQueue({
  queue,
  selectedPatientId,
  onSelectPatient,
  loading,
}: DoctorQueueProps) {
  const waitingCount = queue.filter((q) => q.status === "waiting").length;
  const criticalCount = queue.filter((q) => q.chief_complaints?.severity_level === 3).length;

  return (
    <aside className="w-full h-full flex flex-col bg-doc-elevated border-r border-doc-border">
      {/* Header */}
      <div className="p-5 border-b border-doc-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-doc-accent font-semibold">
            02 // Consultation Queue
          </span>
        </div>
        <h2 className="font-display text-xl font-bold text-doc-fg">Waiting Room</h2>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-doc-card flex items-center justify-center text-xs font-bold text-doc-fg">
              {waitingCount}
            </div>
            <span className="text-xs text-doc-fg-muted">waiting</span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-severity-critical/10 flex items-center justify-center text-xs font-bold text-severity-critical">
                {criticalCount}
              </div>
              <span className="text-xs text-severity-critical">critical</span>
            </div>
          )}
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-clinical p-4 animate-shimmer">
                <div className="h-4 w-32 bg-doc-border rounded mb-2" />
                <div className="h-3 w-48 bg-doc-border rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && queue.length === 0 && (
          <div className="text-center py-8">
            <svg className="w-10 h-10 mx-auto text-doc-fg-dim mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-doc-fg-muted">No patients waiting.</p>
            <p className="text-xs text-doc-fg-dim mt-1">Queue will update in real-time.</p>
          </div>
        )}

        {queue.map((row, idx) => {
          const isSelected = selectedPatientId === row.patient_id;
          return (
            <button
              key={row.id}
              onClick={() => onSelectPatient(row.patient_id)}
              className={`w-full text-left card-clinical p-4 transition-all animate-slide-up ${
                isSelected
                  ? "border-doc-accent bg-doc-accent/[0.06] shadow-clinical"
                  : "hover:bg-doc-hover hover:border-doc-border-focus"
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`font-semibold text-sm ${isSelected ? "text-doc-accent" : "text-doc-fg"}`}>
                  {row.patients?.full_name}
                </span>
                <SeverityIndicator level={row.chief_complaints?.severity_level ?? 1} />
              </div>

              <p className="text-xs text-doc-fg-muted line-clamp-2 mb-2 leading-relaxed">
                {row.chief_complaints?.text}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-[0.65rem] text-doc-fg-dim">
                  Token #{row.token_number}
                </span>
                <span className="text-[0.65rem] text-doc-fg-dim">
                  {row.queued_at
                    ? new Date(row.queued_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
