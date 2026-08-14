"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Folder,
  FileDown,
  QrCode,
  Plus,
  Trash2,
  FileText,
  X,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type FolderDetail = {
  id: string;
  name: string;
  description: string;
  doctors: string;
  createdDate: string;
  prescriptions: {
    id: string;
    title: string;
    doctor: string;
    date: string;
    medicines: string[];
  }[];
};

const DEMO_FOLDER: FolderDetail = {
  id: "f-1",
  name: "Diabetes Management Collection",
  description: "Consolidated care plan & prescription history for type-2 diabetes.",
  doctors: "Dr. Rajesh Patel (Endocrinology), Dr. Rai (Internal Medicine)",
  createdDate: "Jan 12, 2026",
  prescriptions: [
    {
      id: "rx-verified-2",
      title: "Diabetes Management Protocol",
      doctor: "Dr. Rajesh Patel",
      date: "Aug 10, 2026",
      medicines: ["Metformin 500mg", "Glimepiride 1mg"],
    },
    {
      id: "doc-8",
      title: "Initial Endocrine Evaluation",
      doctor: "Dr. Rai",
      date: "Jan 12, 2026",
      medicines: ["Metformin 500mg", "Vitamin D3 60K"],
    },
  ],
};

export default function FolderDetailPage() {
  const params = useParams();
  const folderId = (params?.id as string) || "f-1";

  const [folder, setFolder] = useState<FolderDetail>(DEMO_FOLDER);
  const [showQrModal, setShowQrModal] = useState(false);
  const qrUrl = `https://app.sanjeevani.health/api/passport/folder-${folderId}?token=${Date.now()}`;

  function removePrescription(id: string) {
    setFolder((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((p) => p.id !== id),
    }));
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Glass Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/vault" aria-label="Back to Vault" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              Prescription Collection
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-[var(--fg)]" />
              {folder.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] px-4 py-2.5 rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            Share Scoped QR
          </button>
          <button
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Export Combined PDF
          </button>
        </div>
      </div>

      {/* Description Banner */}
      <div className="glass-card p-6 space-y-4">
        <p className="text-sm text-[var(--fg)] leading-relaxed">{folder.description}</p>
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-[var(--fg-muted)] border-t border-[var(--border)] pt-4">
          <span>Participating Doctors: <strong className="text-[var(--fg)]">{folder.doctors}</strong></span>
          <span>·</span>
          <span>Created: {folder.createdDate}</span>
          <span>·</span>
          <span>{folder.prescriptions.length} Prescriptions Included</span>
        </div>
      </div>

      {/* Member Prescriptions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--fg)]" />
            Member Prescriptions in Collection
          </h2>
          <Link
            href="/vault/prescriptions"
            className="text-xs font-bold uppercase tracking-wider text-[var(--fg)] flex items-center gap-1 hover:opacity-75"
          >
            <Plus className="w-3.5 h-3.5" /> Add Prescription
          </Link>
        </div>

        <div className="space-y-4">
          {folder.prescriptions.map((rx) => (
            <div key={rx.id} className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-base sm:text-lg">{rx.title}</h3>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                </div>
                <p className="text-xs text-[var(--fg-muted)] mb-3 font-semibold">
                  Authoring Physician: <strong className="text-[var(--fg)]">{rx.doctor}</strong> · Date: {rx.date}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rx.medicines.map((m) => (
                    <span key={m} className="text-xs border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-1 rounded-full font-medium">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                <Link
                  href={`/vault/prescription/${rx.id}`}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
                >
                  View Detail →
                </Link>
                <button
                  onClick={() => removePrescription(rx.id)}
                  aria-label="Remove from folder"
                  className="p-2 rounded-full border border-[var(--border)] hover:border-red-500 text-[var(--fg-muted)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoped QR Passport Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative shadow-2xl space-y-4">
            <button onClick={() => setShowQrModal(false)} className="absolute right-4 top-4 text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] mb-1">
                Scoped Passport QR
              </p>
              <h2 className="font-display text-xl font-bold">{folder.name}</h2>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                Grants read access ONLY to member prescriptions inside this collection.
              </p>
            </div>

            <div className="bg-white p-6 border border-[var(--border)] rounded-xl flex justify-center shadow-inner">
              <QRCodeSVG value={qrUrl} size={200} level="H" />
            </div>

            <p className="text-[11px] font-mono text-[var(--fg-muted)] text-center">
              Expires in 05:00 · Single-use token
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
