"use client";

import { ArrowLeft, FileDown, FileText } from "lucide-react";
import Link from "next/link";

type Record = {
  id: string;
  title: string;
  doctor: string;
  date: string;
  type: "prescription" | "lab" | "xray";
};

const DEMO_RECORDS: Record[] = [
  { id: "rec-1", title: "Prescription — Heart Care Protocol", doctor: "Dr. Sharma", date: "Aug 12, 2026", type: "prescription" },
  { id: "rec-2", title: "Prescription — Diabetes Mgmt Protocol", doctor: "Dr. Patel", date: "Aug 10, 2026", type: "prescription" },
  { id: "rec-3", title: "Complete Blood Count Report", doctor: "Dr. Patel", date: "Aug 10, 2026", type: "lab" },
  { id: "rec-4", title: "HbA1c Lab Report", doctor: "Dr. Patel", date: "Aug 8, 2026", type: "lab" },
  { id: "rec-5", title: "Chest X-Ray Imaging Analysis", doctor: "Dr. Sharma", date: "Aug 5, 2026", type: "xray" },
];

const TYPE_LABELS: { [key: string]: string } = {
  prescription: "PRESCRIPTION",
  lab: "LAB REPORT",
  xray: "X-RAY IMAGE",
};

export default function RecordsPage() {
  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="hover:opacity-75">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              10 // Encrypted Records Vault
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Health Documents & Exports</h1>
          </div>
        </div>
        <button
          aria-label="Export all as PDF"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
        >
          <FileDown className="w-4 h-4" />
          Export All PDF
        </button>
      </div>

      {/* Grid of Records (1 col mobile, 2 cols tablet, 3 cols desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEMO_RECORDS.map((record) => (
          <div
            key={record.id}
            className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex flex-col justify-between hover:border-[var(--fg)] transition-colors rounded-sm group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider border border-[var(--border)] px-2.5 py-1 text-[var(--fg-muted)]">
                  {TYPE_LABELS[record.type]}
                </span>
                <span className="text-xs text-[var(--fg-muted)] font-mono">{record.date}</span>
              </div>
              <h3 className="font-bold text-base mb-1 group-hover:text-[var(--fg)] transition-colors">
                {record.title}
              </h3>
              <p className="text-xs text-[var(--fg-muted)]">
                Authoring Physician: <strong className="text-[var(--fg)]">{record.doctor}</strong>
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> PDF Signed
              </span>
              <button
                aria-label={`Download ${record.title}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[var(--border)] px-3 py-1.5 hover:border-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors rounded-full"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
