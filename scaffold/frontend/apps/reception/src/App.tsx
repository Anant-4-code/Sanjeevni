import { useState } from "react";
import { Eyebrow, PrimaryButton, FormField, SeverityBadge } from "@sanjeevani/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

export default function App() {
  const [form, setForm] = useState({
    full_name: "", age: "", gender: "male", phone: "",
    emergency_contact_name: "", emergency_contact_phone: "", chief_complaint: "",
  });
  const [result, setResult] = useState<{ patient_id: string; triage: { severity_level: number; label: string }; token_number: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/patients/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: Number(form.age) }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
      <header className="border-b border-[var(--border)] px-6 md:px-12 py-4 flex items-center justify-between bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold tracking-tight">SANJEEVANI · RECEPTION</span>
          <span className="text-[10px] uppercase tracking-widest text-amber-500 font-mono border border-amber-500/30 px-2 py-0.5 rounded">Front Desk Console</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000/doctor"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-sm"
          >
            🩺 Open Doctor Workspace (Port 3000) &rarr;
          </a>
          <a
            href="http://localhost:3000"
            className="text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] px-3 py-1.5 rounded-lg border border-[var(--border)]"
          >
            Unified Portal &rarr;
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-16">
        <Eyebrow index="01" label="Patient Registration" />
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-[0.95] mb-10">
          New Patient Intake.
        </h1>

        {result ? (
          <div className="border border-[var(--border)] p-8">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] mb-2">Token Number</p>
            <p className="font-display text-6xl font-bold mb-6">{result.token_number}</p>
            <SeverityBadge level={result.triage.severity_level} />
            <p className="mt-6 text-sm text-[var(--fg-muted)]">
              Patient ID: <span className="text-[var(--fg)]">{result.patient_id}</span>
            </p>
            <button
              className="mt-8 text-sm underline"
              onClick={() => { setResult(null); setForm({ full_name: "", age: "", gender: "male", phone: "", emergency_contact_name: "", emergency_contact_phone: "", chief_complaint: "" }); }}
            >
              Register another patient →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Full Name" required value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Patient's full name" />
              <FormField label="Age" type="number" required value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Age" />
              <FormField label="Phone" required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              <label className="block">
                <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)]">Gender</span>
                <select
                  className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)]"
                  value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <FormField label="Emergency Contact Name" value={form.emergency_contact_name}
                onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Name" />
              <FormField label="Emergency Contact Phone" value={form.emergency_contact_phone}
                onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)]">Chief Complaint</span>
              <textarea
                required rows={3} value={form.chief_complaint}
                onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
                placeholder="Why is the patient visiting today?"
                className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)]"
              />
            </label>

            <PrimaryButton type="submit">{loading ? "Submitting…" : "Register & Triage"} <span>→</span></PrimaryButton>
          </form>
        )}
      </main>
    </div>
  );
}
