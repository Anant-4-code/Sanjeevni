"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, FlaskConical, Scan, FolderArchive, Pin, FileDown, Search, AlertTriangle, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type VaultItem = {
  id: string;
  title: string;
  category: string;
  doctor_name: string;
  status: "verified" | "unverified";
  date: string;
  summary: string;
  pinned?: boolean;
};

const CATEGORY_NAMES: Record<string, { title: string; icon: typeof FileText }> = {
  prescriptions: { title: "Prescriptions & Scans", icon: FileText },
  "lab-reports": { title: "Lab Reports", icon: FlaskConical },
  "x-rays": { title: "X-Rays & Diagnostic Scans", icon: Scan },
  other: { title: "Other Documents", icon: FolderArchive },
};

export default function CategoryDocumentsPage() {
  const { user } = useAuth();
  const params = useParams();
  const categoryKey = (params?.category as string) || "prescriptions";
  const catInfo = CATEGORY_NAMES[categoryKey] || { title: "Documents", icon: FileText };

  const [documents, setDocuments] = useState<VaultItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");

  useEffect(() => {
    const pid = user?.id || "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault?category=${categoryKey}`)
      .then((res) => res.json())
      .then((data) => setDocuments(data.documents || []))
      .catch(() => {});
  }, [categoryKey, user?.id]);

  const filteredDocs = documents.filter((doc) => {
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.doctor_name.toLowerCase().includes(q) ||
      doc.summary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vault" aria-label="Back to Vault" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              Vault Archive // {catInfo.title}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <catInfo.icon className="w-6 h-6 text-[var(--fg)]" />
              {catInfo.title}
            </h1>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="hidden sm:flex items-center gap-2">
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
          placeholder={`Search ${catInfo.title.toLowerCase()} by title or doctor...`}
          className="w-full glass-panel border border-[var(--border)] pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[var(--fg)] transition-all rounded-xl shadow-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Link
                  href={`/vault/prescription/${doc.id}`}
                  className="font-bold text-base sm:text-lg hover:underline text-[var(--fg)]"
                >
                  {doc.title}
                </Link>

                {doc.status === "unverified" ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> UNVERIFIED — NEEDS DOCTOR SIGN-OFF
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

        {filteredDocs.length === 0 && (
          <div className="glass-card p-12 text-center">
            <FileText className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-3" />
            <p className="text-sm font-bold mb-1">No Category Documents Found</p>
            <p className="text-xs text-[var(--fg-muted)]">No records match your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
