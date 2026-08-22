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

  useEffect(() => {
    setLoading(true);
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
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
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--fg)] transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Link
                  href={`/vault/prescription/${doc.id}`}
                  className="font-bold text-base sm:text-lg hover:underline text-[var(--fg)]"
                >
                  {doc.title}
                </Link>

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

            <div className="flex items-center gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
              <Link
                href={`/vault/prescription/${doc.id}`}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
              >
                View Detail →
              </Link>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && !loading && (
          <div className="glass-card p-12 text-center">
            <Icon className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-3" />
            <p className="text-sm font-bold mb-1">No Documents in {catInfo.title}</p>
            <p className="text-xs text-[var(--fg-muted)]">No records match your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
