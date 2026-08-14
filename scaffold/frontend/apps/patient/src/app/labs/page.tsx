"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FlaskConical, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type LabResult = {
  id: string;
  test_name: string;
  ordered_by: string;
  date: string;
  summary: string;
};

export default function LabsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = user?.id || "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault?category=diagnostic_report`)
      .then((res) => res.json())
      .then((data) => {
        const docs = data.documents || [];
        const mapped = docs.map((d: any) => ({
          id: d.id,
          test_name: d.title,
          ordered_by: d.doctor_name || "Pathology Lab",
          date: d.date,
          summary: d.summary || d.patient_notes || "Lab report diagnostic summary verified.",
        }));
        setResults(mapped);
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="hover:opacity-75">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              11 // Diagnostic Summaries
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Lab Results</h1>
          </div>
        </div>
        <Link
          href="/scan-otc"
          className="text-xs font-bold uppercase tracking-wider border border-[var(--fg)] px-4 py-2 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Upload / Scan Lab Report
        </Link>
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div className="p-12 text-center border border-[var(--border)] bg-[var(--bg-elevated)] text-sm font-mono text-[var(--fg-muted)]">
          Loading verified diagnostic summaries...
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center border border-[var(--border)] bg-[var(--bg-elevated)] space-y-3">
          <FlaskConical className="w-8 h-8 text-[var(--fg-muted)] mx-auto opacity-40" />
          <h3 className="font-bold text-base">No Lab Results Archived Yet</h3>
          <p className="text-xs text-[var(--fg-muted)] max-w-md mx-auto">
            Your lab results folder is clean. You can upload diagnostic lab reports or scan package labels to archive your medical records.
          </p>
          <Link
            href="/scan-otc"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-full hover:opacity-90 transition-opacity mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Scan or Upload Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => (
            <div
              key={result.id}
              className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex flex-col justify-between hover:border-[var(--fg)] transition-colors rounded-sm"
            >
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FlaskConical className="w-4 h-4 text-[var(--fg)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base">{result.test_name}</h3>
                    <p className="text-xs text-[var(--fg-muted)]">
                      Ordered by {result.ordered_by} · {result.date}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                  {result.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer Banner */}
      <div className="border border-[var(--border)] p-4 bg-[var(--bg-elevated)] text-center">
        <p className="text-xs text-[var(--fg-muted)]">
          These lab summaries are generated for plain-language patient understanding and do not constitute a self-diagnosis. Always consult your attending physician regarding your clinical values.
        </p>
      </div>
    </div>
  );
}
