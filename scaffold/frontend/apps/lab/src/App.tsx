import { useEffect, useState } from "react";
import { Eyebrow } from "@sanjeevani/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const COLUMNS = [
  { key: "pending_draw", label: "Pending Draw" },
  { key: "analyzing", label: "Analyzing" },
  { key: "results_ready", label: "Results Ready" },
];

export default function App() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // TODO: replace with SSE subscription to /sse/lab
    fetch(`${API_BASE}/lab/orders`).then((r) => r.json()).then((d) => setOrders(d.orders || [])).catch(() => setOrders([]));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] px-6 md:px-12 py-16">
      <Eyebrow index="01" label="Diagnostic Order Routing" />
      <h1 className="font-display text-4xl font-bold mb-10">Lab Kanban.</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => (
          <div key={col.key}>
            <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] mb-4">{col.label}</h3>
            <div className="space-y-3">
              {orders.filter((o) => o.status === col.key).map((o) => (
                <div key={o.id} className="border border-[var(--border)] p-4">
                  <p className="font-medium text-sm">{o.patient_name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{o.test_name}</p>
                </div>
              ))}
              {orders.filter((o) => o.status === col.key).length === 0 && (
                <p className="text-xs text-[var(--fg-muted)]">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
