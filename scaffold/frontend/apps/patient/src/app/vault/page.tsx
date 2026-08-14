"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  FlaskConical,
  Scan,
  FolderArchive,
  Search,
  Plus,
  ArrowRight,
  Folder,
  Pin,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

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

type CategoryTile = {
  key: string;
  href: string;
  title: string;
  count: number;
  icon: typeof FileText;
  description: string;
};

export default function VaultPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<VaultItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [loading, setLoading] = useState(true);

  function fetchVault() {
    setLoading(true);
    const pid = user?.id || "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault`)
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.documents || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchVault();
  }, [user?.id]);

  const categories: CategoryTile[] = [
    {
      key: "prescriptions",
      href: "/vault/prescriptions",
      title: "Prescriptions",
      count: documents.filter((d) => d.category === "prescriptions").length,
      icon: FileText,
      description: "Doctor scans & digital care protocols",
    },
    {
      key: "lab-reports",
      href: "/vault/lab-reports",
      title: "Lab Reports",
      count: documents.filter((d) => d.category === "lab-reports" || d.category === "lab_reports").length,
      icon: FlaskConical,
      description: "Plain-language blood work & lab summaries",
    },
    {
      key: "x-rays",
      href: "/vault/x-rays",
      title: "X-Rays & MRI Scans",
      count: documents.filter((d) => d.category === "x-rays" || d.category === "scans" || d.category === "imaging_scans").length,
      icon: Scan,
      description: "Diagnostic imaging, X-Ray & MRI reports",
    },
    {
      key: "other",
      href: "/vault/other",
      title: "Other Records & Summaries",
      count: documents.filter((d) => d.category === "other" || d.category === "records" || d.category === "discharge_summaries" || d.category === "vaccinations").length,
      icon: FolderArchive,
      description: "Discharge summaries & medical certificates",
    },
  ];

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

  const unverifiedCount = documents.filter((d) => d.status === "unverified").length;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8">
      {/* Top Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-[var(--fg)] rounded-full animate-ping" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              CLINICAL ARCHIVE & VAULT
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            The Patient Vault
          </h1>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Categorized home for your medical records, unverified scanned prescriptions, and lab history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVault}
            className="p-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--fg)] transition-all shadow-sm"
            title="Refresh Vault"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/vault/folders/new"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </Link>
        </div>
      </div>

      {/* Unverified Warning Banner if any unverified scans exist */}
      {unverifiedCount > 0 && (
        <div className="glass-panel p-5 rounded-2xl border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                {unverifiedCount} Scanned Prescription(s) Pending Doctor Verification
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                Scanned prescriptions are archived in your Vault but require physician sign-off before medications activate into your daily dosing schedule.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("unverified")}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors flex-shrink-0"
          >
            View Unverified ({unverifiedCount})
          </button>
        </div>
      )}

      {/* Category Tiles Grid */}
      <div>
        <h2 className="text-xs uppercase font-mono tracking-[0.15em] text-[var(--fg-muted)] font-bold mb-4">
          Record Categories
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              href={cat.href}
              className="glass-card p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-center group-hover:border-[var(--fg)] transition-all">
                    <cat.icon className="w-5 h-5 text-[var(--fg)]" />
                  </div>
                  <span className="text-xs font-mono font-bold border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[var(--fg)] bg-[var(--bg-muted)]">
                    {cat.count} {cat.count === 1 ? "FILE" : "FILES"}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mb-1">{cat.title}</h3>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{cat.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--fg)] group-hover:translate-x-0.5 transition-transform">
                <span>Browse Records</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Documents Section with Search & Status Filter */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <h2 className="text-xs uppercase font-mono tracking-[0.15em] text-[var(--fg-muted)] font-bold">
            All Clinical Vault Documents ({filteredDocs.length})
          </h2>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2">
            {[
              { key: "all", label: "All Records" },
              { key: "verified", label: "Verified Only" },
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records by title, doctor name, or summary..."
            className="w-full glass-panel border border-[var(--border)] pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[var(--fg)] transition-all rounded-xl shadow-sm"
          />
        </div>

        {/* Documents List */}
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

                  {/* Status Badge */}
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
                  Source / Doctor: <strong className="text-[var(--fg)]">{doc.doctor_name}</strong> · Date: {doc.date}
                </p>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{doc.summary}</p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                <Link
                  href={`/vault/prescription/${doc.id}`}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
                >
                  View Record →
                </Link>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && !loading && (
            <div className="glass-card p-12 text-center">
              <FileText className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-3" />
              <p className="text-sm font-bold mb-1">No Vault Records Found</p>
              <p className="text-xs text-[var(--fg-muted)]">No items match your current filter or search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
