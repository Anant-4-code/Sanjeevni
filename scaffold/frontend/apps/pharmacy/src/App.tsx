import { useEffect, useState } from "react";
import { Eyebrow, PrimaryButton } from "@sanjeevani/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

export default function App() {
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    // TODO: replace polling with SSE subscription to /sse/pharmacy
    fetch(`${API_BASE}/pharmacy/queue`).then((r) => r.json()).then((d) => setQueue(d.queue || []));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] px-6 md:px-12 py-16 max-w-5xl mx-auto">
      <Eyebrow index="01" label="Dispensing Queue" />
      <h1 className="font-display text-4xl font-bold mb-10">Pharmacy Console.</h1>

      {queue.length === 0 && (
        <p className="text-[var(--fg-muted)] border border-dashed border-[var(--border)] p-8">
          No verified prescriptions waiting to be dispensed.
        </p>
      )}

      <div className="space-y-4">
        {queue.map((rx) => (
          <div key={rx.id} className="border border-[var(--border)] p-6 flex items-center justify-between">
            <div>
              <p className="font-medium">{rx.patient_name}</p>
              <p className="text-sm text-[var(--fg-muted)]">{rx.items?.join(", ")}</p>
              {rx.safety_flag && (
                <span className="mt-2 inline-block text-xs uppercase tracking-wide text-[var(--warn)] border border-[var(--warn)] px-2 py-1">
                  ⚠ Interaction flagged during review
                </span>
              )}
            </div>
            <PrimaryButton>Mark Dispensed</PrimaryButton>
          </div>
        ))}
      </div>
    </div>
  );
}
