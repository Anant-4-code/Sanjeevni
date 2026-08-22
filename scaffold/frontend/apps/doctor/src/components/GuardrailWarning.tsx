interface GuardrailFlag {
  medication_id: string;
  medication_name: string;
  conflicting_with: string;
  severity: "moderate" | "severe";
  message: string;
  flag_type: string;
}

interface GuardrailWarningProps {
  flags: GuardrailFlag[];
  onAcknowledge: (flag: GuardrailFlag) => void;
  onRemoveMedication: (medicationId: string) => void;
  acknowledgedFlags: Set<string>;
}

export default function GuardrailWarning({
  flags,
  onAcknowledge,
  onRemoveMedication,
  acknowledgedFlags,
}: GuardrailWarningProps) {
  if (flags.length === 0) return null;

  const severeFlags = flags.filter((f) => f.severity === "severe");
  const moderateFlags = flags.filter((f) => f.severity === "moderate");

  return (
    <div className="animate-slide-up space-y-3">
      {/* Severe flags */}
      {severeFlags.map((flag, i) => {
        const isAcknowledged = acknowledgedFlags.has(flag.medication_id);
        return (
          <div
            key={`severe-${i}`}
            className={`rounded-lg border p-4 transition-all ${
              isAcknowledged
                ? "border-doc-border-focus bg-doc-card opacity-70"
                : "border-severity-critical/40 bg-severity-critical/[0.06] animate-pulse-glow"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-severity-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="severity-pill severity-critical">SEVERE INTERACTION</span>
                  {isAcknowledged && (
                    <span className="severity-pill severity-safe">ACKNOWLEDGED</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-doc-fg mb-1">
                  {flag.medication_name} ↔ {flag.conflicting_with}
                </p>
                <p className="text-xs text-doc-fg-muted leading-relaxed">{flag.message}</p>

                {!isAcknowledged && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onRemoveMedication(flag.medication_id)}
                      className="btn-outline text-xs py-1.5 px-3"
                    >
                      Remove {flag.medication_name}
                    </button>
                    <button
                      onClick={() => onAcknowledge(flag)}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      Acknowledge & Override →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Moderate flags */}
      {moderateFlags.map((flag, i) => {
        const isAcknowledged = acknowledgedFlags.has(flag.medication_id);
        return (
          <div
            key={`moderate-${i}`}
            className={`rounded-lg border p-4 transition-all ${
              isAcknowledged
                ? "border-doc-border-focus bg-doc-card opacity-70"
                : "border-severity-warning/40 bg-severity-warning/[0.06]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-severity-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="severity-pill severity-warning">MODERATE INTERACTION</span>
                  {isAcknowledged && (
                    <span className="severity-pill severity-safe">ACKNOWLEDGED</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-doc-fg mb-1">
                  {flag.medication_name} ↔ {flag.conflicting_with}
                </p>
                <p className="text-xs text-doc-fg-muted leading-relaxed">{flag.message}</p>

                {!isAcknowledged && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onAcknowledge(flag)}
                      className="btn-outline text-xs py-1.5 px-3"
                    >
                      Acknowledge ✓
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
