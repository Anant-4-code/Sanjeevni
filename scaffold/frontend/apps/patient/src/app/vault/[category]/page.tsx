"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  FlaskConical,
  Scan,
  FolderArchive,
  Search,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Syringe,
  FileSignature,
  X,
  Download,
  ExternalLink,
  Printer,
  Eye,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type VaultItem = {
  id: string;
  title: string;
  category: string;
  doctor_name: string;
  status: "verified" | "unverified";
  source?: "clinic_verified" | "patient_uploaded" | "external_import";
  date: string;
  summary: string;
  days_remaining?: number;
  condition_tags?: string[];
  pinned?: boolean;
  file_url?: string;
  patient_notes?: string;
  clinic_name?: string;
};

const CATEGORY_MAP: Record<
  string,
  { title: string; icon: React.ElementType; description: string }
> = {
  prescriptions: {
    title: "Prescriptions & Protocols",
    icon: FileText,
    description: "Every prescription ever written across all attending physicians.",
  },
  "lab-reports": {
    title: "Lab Diagnostic Reports",
    icon: FlaskConical,
    description: "Pathology tests, blood counts, and metabolic biomarker panels.",
  },
  "x-rays": {
    title: "Imaging & Scans",
    icon: Scan,
    description: "Digital X-Rays, MRI scans, CT imaging, and ultrasound reports.",
  },
  "hospital-discharges": {
    title: "Hospital Discharges",
    icon: Building2,
    description: "Inpatient admission records and clinical discharge summaries.",
  },
  vaccinations: {
    title: "Vaccinations & Immunizations",
    icon: Syringe,
    description: "Vaccine certificates, booster timelines, and immunization lots.",
  },
  "referral-letters": {
    title: "Referral Letters",
    icon: FileSignature,
    description: "Doctor-to-doctor clinical consultation and referral notes.",
  },
  other: {
    title: "Other Documents & Records",
    icon: FolderArchive,
    description: "Patient-uploaded certificates, fitness forms, and misc records.",
  },
};

export default function CategoryDocumentsPage() {
  const { user } = useAuth();
  const params = useParams();
  const categoryKey = (params?.category as string) || "prescriptions";
  const catInfo = CATEGORY_MAP[categoryKey] || {
    title: "Vault Documents",
    icon: FileText,
    description: "Clinical archive records.",
  };

  const [documents, setDocuments] = useState<VaultItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<VaultItem | null>(null);

  useEffect(() => {
    setLoading(true);
    const pid = (user?.role === "patient" && user?.id) ? user.id : "patient-ramesh";
    fetch(`${API_BASE}/patient/${pid}/vault?category=${categoryKey}`)
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.documents || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [categoryKey, user?.id]);

  const filteredDocs = documents.filter((doc) => {
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const tags = (doc.condition_tags || []).join(" ").toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.doctor_name.toLowerCase().includes(q) ||
      doc.summary.toLowerCase().includes(q) ||
      tags.includes(q)
    );
  });

  const Icon = catInfo.icon;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/vault"
            aria-label="Back to Vault"
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Vault Archive // {catInfo.title}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Icon className="w-6 h-6 text-[var(--fg)]" />
              {catInfo.title}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">{catInfo.description}</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {[
            { key: "all", label: "All" },
            { key: "verified", label: "Verified" },
            { key: "unverified", label: "Unverified Scans" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                statusFilter === tab.key
                  ? "bg-[var(--fg)] text-[var(--bg)] shadow-md"
                  : "glass-card text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${catInfo.title.toLowerCase()} by title, doctor, or condition tags...`}
          className="w-full glass-panel border border-[var(--border)] pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[var(--fg)] transition-all rounded-2xl shadow-sm"
        />
      </div>

      {/* List (Sorted newest first) */}
      <div className="space-y-4">
        {filteredDocs.map((doc) => {
          const isPrescription = categoryKey === "prescriptions" || doc.category === "prescriptions";
          const isLabReport = categoryKey === "lab-reports" || doc.category === "lab-reports" || doc.category === "lab_reports";
          const detailUrl = isPrescription
            ? `/vault/prescription/${doc.id}`
            : isLabReport
            ? `/vault/lab-report/${doc.id}`
            : null;

          return (
            <div
              key={doc.id}
              className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--fg)] transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {detailUrl ? (
                    <Link
                      href={detailUrl}
                      className="font-bold text-base sm:text-lg hover:underline text-[var(--fg)]"
                    >
                      {doc.title}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="font-bold text-base sm:text-lg hover:underline text-[var(--fg)] text-left"
                    >
                      {doc.title}
                    </button>
                  )}

                  {doc.condition_tags?.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {t}
                    </span>
                  ))}

                  {doc.status === "unverified" ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> UNVERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--fg-muted)] mb-1 font-semibold">
                  Doctor / Source: <strong className="text-[var(--fg)]">{doc.doctor_name}</strong> · Date: {doc.date}
                </p>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{doc.summary}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="p-2.5 rounded-full border border-[var(--border)] hover:border-[var(--fg)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"
                  title="Quick Document Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {detailUrl ? (
                  <Link
                    href={detailUrl}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
                  >
                    View Detail →
                  </Link>
                ) : (
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
                  >
                    View Record →
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredDocs.length === 0 && !loading && (
          <div className="glass-card p-12 text-center">
            <Icon className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-3" />
            <p className="text-sm font-bold mb-1">No Documents in {catInfo.title}</p>
            <p className="text-xs text-[var(--fg-muted)]">No records match your filter criteria.</p>
          </div>
        )}
      </div>

      {/* BUG-VAULT-02 FIX: Generic Document Preview & Download Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] border border-[var(--border)] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border)] flex items-start justify-between gap-4 bg-[var(--bg-muted)]/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    {catInfo.title}
                  </span>
                  {previewDoc.status === "verified" ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> UNVERIFIED
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-[var(--fg)] truncate">{previewDoc.title}</h2>
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  Issued by <strong className="text-[var(--fg)]">{previewDoc.doctor_name}</strong> · {previewDoc.date}
                </p>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Document Image or Placeholder Preview */}
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--bg-muted)]/50 relative">
                {previewDoc.file_url ? (
                  <img
                    src={previewDoc.file_url}
                    alt={previewDoc.title}
                    className="w-full max-h-72 object-contain bg-black/5 dark:bg-black/40"
                  />
                ) : (
                  <div className="py-16 text-center">
                    <Icon className="w-12 h-12 text-[var(--fg-muted)] mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                      Digital Encrypted Clinical Record
                    </p>
                    <p className="text-xs text-[var(--fg-muted)] mt-1">Cryptographically authenticated on Sanjeevani Mesh</p>
                  </div>
                )}
              </div>

              {/* Summary & Clinical Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                  Clinical Record Summary
                </h4>
                <div className="p-4 rounded-2xl bg-[var(--bg-muted)]/40 border border-[var(--border)] text-sm text-[var(--fg)] leading-relaxed">
                  {previewDoc.summary || "No automated summary available for this record."}
                </div>
              </div>

              {previewDoc.patient_notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Doctor / Intake Notes
                  </h4>
                  <p className="text-xs text-[var(--fg-muted)] italic bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200 dark:border-blue-900">
                    {previewDoc.patient_notes}
                  </p>
                </div>
              )}

              {/* Condition Tags */}
              {previewDoc.condition_tags && previewDoc.condition_tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-2">
                    Tagged Clinical Disciplines
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewDoc.condition_tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--fg)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 px-6 border-t border-[var(--border)] bg-[var(--bg-muted)]/20 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors flex items-center gap-1.5 text-[var(--fg)]"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.file_url || "#"}
                  target={previewDoc.file_url ? "_blank" : undefined}
                  rel="noreferrer"
                  download={previewDoc.title}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download Record
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
