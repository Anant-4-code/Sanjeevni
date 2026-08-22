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
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Building2,
  Syringe,
  FileSignature,
} from "lucide-react";
import VaultInsightsStrip from "@/components/VaultInsightsStrip";
import VaultSearchAI from "@/components/VaultSearchAI";

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

type CategoryTile = {
  key: string;
  href: string;
  title: string;
  count: number;
  icon: React.ElementType;
  description: string;
};

export default function VaultPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<VaultItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [loading, setLoading] = useState(true);
  const [showAISearch, setShowAISearch] = useState(false);

  function fetchVault() {
    setLoading(true);
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
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

  // 7 Top-Level Categories (Part A.1 Spec)
  const categories: CategoryTile[] = [
    {
      key: "prescriptions",
      href: "/vault/prescriptions",
      title: "Prescriptions",
      count: documents.filter((d) => d.category === "prescriptions" || d.category === "prescription").length,
      icon: FileText,
      description: "Active medications, digital protocols & refills",
    },
    {
      key: "lab-reports",
      href: "/vault/lab-reports",
      title: "Lab Diagnostic Reports",
      count: documents.filter((d) => d.category === "lab-reports" || d.category === "lab_reports").length,
      icon: FlaskConical,
      description: "Biomarker panels, blood counts & pathology",
    },
    {
      key: "x-rays",
      href: "/vault/x-rays",
      title: "Imaging & Scans",
      count: documents.filter((d) => d.category === "x-rays" || d.category === "scans" || d.category === "imaging_scans").length,
      icon: Scan,
      description: "Digital X-Rays, MRI, CT & ultrasound imaging",
    },
    {
      key: "hospital-discharges",
      href: "/vault/hospital-discharges",
      title: "Hospital Discharges",
      count: documents.filter((d) => d.category === "hospital-discharges" || d.category === "discharge_summaries").length,
      icon: Building2,
      description: "Inpatient admission & discharge summaries",
    },
    {
      key: "vaccinations",
      href: "/vault/vaccinations",
      title: "Vaccinations",
      count: documents.filter((d) => d.category === "vaccinations" || d.category === "vaccination").length,
      icon: Syringe,
      description: "Immunization certificates & booster history",
    },
    {
      key: "referral-letters",
      href: "/vault/referral-letters",
      title: "Referral Letters",
      count: documents.filter((d) => d.category === "referral-letters" || d.category === "referrals").length,
      icon: FileSignature,
      description: "Inter-specialist clinical consultation letters",
    },
    {
      key: "other",
      href: "/vault/other",
      title: "Other Documents",
      count: documents.filter((d) => d.category === "other" || d.category === "records").length,
      icon: FolderArchive,
      description: "Medical certificates, fitness forms & records",
    },
  ];

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

  const unverifiedCount = documents.filter((d) => d.status === "unverified").length;
  const currentPatientId = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8">
      {/* Top Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] font-bold">
              PERMANENT CLINICAL ARCHIVE (7 CATEGORIES)
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            The Patient Vault
          </h1>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Categorized permanent archive for your medical history, verified prescriptions, imaging scans, and lab reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAISearch(true)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Smart AI Search
          </button>

          <button
            onClick={fetchVault}
            className="p-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--fg)] transition-all shadow-sm"
            title="Refresh Vault"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/vault/folders/new"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--fg)] text-[var(--fg)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Folder
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

      {/* 7-Category Archive Tiles Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase font-mono tracking-[0.15em] text-[var(--fg-muted)] font-bold">
            Permanent Vault Categories ({categories.length})
          </h2>
          <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase">
            Total {documents.length} Records
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.key}
                href={cat.href}
                className="glass-card p-5 flex flex-col justify-between group hover:border-[var(--fg)] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-center group-hover:border-[var(--fg)] transition-all">
                      <Icon className="w-5 h-5 text-[var(--fg)]" />
                    </div>
                    <span className="text-xs font-mono font-bold border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[var(--fg)] bg-[var(--bg-muted)]">
                      {cat.count} {cat.count === 1 ? "FILE" : "FILES"}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold mb-1">{cat.title}</h3>
                  <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{cat.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--fg)] group-hover:translate-x-0.5 transition-transform">
                  <span>Browse Records</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Part C.3: AI Insights Strip Above Document List */}
      <VaultInsightsStrip patientId={currentPatientId} />

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

        {/* Search Bar with AI Quick Trigger */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter records by title, doctor, condition tags, or summary..."
              className="w-full glass-panel border border-[var(--border)] pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[var(--fg)] transition-all rounded-2xl shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAISearch(true)}
            className="px-4 py-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>

        {/* Documents List */}
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

                  {/* Category Pill */}
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-muted)] border border-[var(--border)]">
                    {doc.category.replace("-", " ")}
                  </span>

                  {/* Condition Tags */}
                  {doc.condition_tags?.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {t}
                    </span>
                  ))}

                  {/* Active Days Remaining Badge */}
                  {doc.days_remaining !== undefined && doc.days_remaining > 0 && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {doc.days_remaining} Days Left
                    </span>
                  )}

                  {/* Status Badge */}
                  {doc.status === "unverified" ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> UNVERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> CLINICALLY VERIFIED
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--fg-muted)] mb-1.5 font-semibold">
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

      {/* VA-7 Smart Search Modal */}
      {showAISearch && (
        <VaultSearchAI
          patientId={currentPatientId}
          onClose={() => setShowAISearch(false)}
        />
      )}
    </div>
  );
}
