import { useEffect, useRef, useState } from "react";
import { Eyebrow, SeverityBadge, PrimaryButton } from "@sanjeevani/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

type Detection = { label: string; confidence: number; box: { x: number; y: number; w: number; h: number } };

function XrayCanvas({ imageUrl, detections }: { imageUrl: string; detections: Detection[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      detections.forEach((d) => {
        const color = d.label === "fracture" ? "#FF5A44" : "#FACC15";
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(d.box.x, d.box.y, d.box.w, d.box.h);
        ctx.fillStyle = color;
        ctx.font = "16px Inter, sans-serif";
        ctx.fillText(`${d.label} — ${Math.round(d.confidence * 100)}%`, d.box.x, Math.max(d.box.y - 6, 12));
      });
    };
    img.src = imageUrl;
  }, [imageUrl, detections]);

  return <canvas ref={canvasRef} className="w-full border border-[var(--border)]" />;
}

export default function App() {
  const [queue, setQueue] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    // TODO: replace with WebSocket subscription to /ws/doctor/{doctor_id}
    fetch(`${API_BASE}/doctor/queue?doctor_id=demo-doctor`)
      .then((r) => r.json())
      .then((d) => setQueue(d.queue || []))
      .catch(() => setQueue([]));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] grid grid-cols-1 md:grid-cols-[320px_1fr]">
      <aside className="border-r border-[var(--border)] p-6">
        <Eyebrow index="02" label="Consultation Queue" />
        <h2 className="font-display text-2xl font-bold mb-6">Waiting Room</h2>
        <div className="space-y-3">
          {queue.length === 0 && <p className="text-sm text-[var(--fg-muted)]">No patients waiting.</p>}
          {queue.map((row) => (
            <button
              key={row.id}
              onClick={() => setSelected(row)}
              className="w-full text-left border border-[var(--border)] p-4 hover:border-[var(--fg)] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{row.patients?.full_name}</span>
                <SeverityBadge level={row.chief_complaints?.severity_level ?? 1} />
              </div>
              <p className="text-xs text-[var(--fg-muted)] truncate">{row.chief_complaints?.text}</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">Token #{row.token_number}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="p-8">
        <Eyebrow index="03" label="Physician Workspace" />
        {!selected ? (
          <p className="text-[var(--fg-muted)]">Select a patient from the queue to begin.</p>
        ) : (
          <div className="space-y-8 max-w-4xl">
            <h1 className="font-display text-3xl font-bold">{selected.patients?.full_name}</h1>

            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] mb-3">X-Ray Canvas Overlay</h3>
              {selected.xray_url ? (
                <XrayCanvas imageUrl={selected.xray_url} detections={selected.detections || []} />
              ) : (
                <p className="text-sm text-[var(--fg-muted)] border border-dashed border-[var(--border)] p-6">
                  No X-ray uploaded for this patient yet. Once reception uploads one, results from the
                  YOLOv7-p6 fracture-detection model will render here automatically.
                </p>
              )}
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] mb-3">Pharmacological Guardrails</h3>
              <p className="text-sm text-[var(--fg-muted)]">
                Every medication edit triggers <code>/api/doctor/guardrail-check</code> against this
                patient's full cross-doctor medication history. Severe flags block sign-off.
              </p>
            </section>

            <PrimaryButton>Verify &amp; Activate Protocol →</PrimaryButton>
          </div>
        )}
      </main>
    </div>
  );
}
