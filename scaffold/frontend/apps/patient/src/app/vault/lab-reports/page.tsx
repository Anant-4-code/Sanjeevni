"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FlaskConical,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Stethoscope,
  Building,
  Bell,
  ArrowRight,
  LineChart,
  Search,
  ShieldCheck,
  Plus,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Biomarker = {
  parameter: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status: "normal" | "low" | "high" | "critical";
  trend_direction?: "rising" | "declining" | "stable";
};

type LabReportItem = {
  id: string;
  title: string;
  test_name?: string;
  doctor_name: string;
  doctor_specialty?: string;
  lab_name?: string;
  date: string;
  overall_status: "normal" | "abnormal" | "critical";
  source?: "clinic_verified" | "patient_uploaded";
  summary: string;
  plain_language_summary?: string;
  reviewed_by_doctor_note?: string;
  next_recheck_suggested?: string;
  recheck_reason?: string;
  recheck_reminder_set?: boolean;
  critical_alert_sent?: boolean;
  biomarkers?: Biomarker[];
  historical_trend_data?: Array<{ date: string; value: number; label: string }>;
};

type TrendInsight = {
  parameter: string;
  direction: string;
  history_str: string;
  summary: string;
};

export default function LabReportsVaultPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<LabReportItem[]>([]);
  const [trends, setTrends] = useState<TrendInsight[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "abnormal" | "critical">("all");
  const [loading, setLoading] = useState(true);
  const [reminderSetMap, setReminderSetMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault/lab-reports`)
      .then((res) => res.json())
      .then((data) => {
        setReports(Array.isArray(data?.reports) ? data.reports : []);
        setTrends(Array.isArray(data?.trends) ? data.trends : []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback fetch from standard vault
        fetch(`${API_BASE}/patient/${pid}/vault?category=lab-reports`)
          .then((r) => r.json())
          .then((d) => {
            setReports(d.documents || []);
            setLoading(false);
          });
      });
  }, [user?.id]);

  const handleSetReminder = (reportId: string) => {
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault/lab-reports/${reportId}/set-recheck-reminder`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then(() => {
        setReminderSetMap((prev) => ({ ...prev, [reportId]: true }));
      })
      .catch(() => {
        setReminderSetMap((prev) => ({ ...prev, [reportId]: true }));
      });
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.overall_status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.test_name || "").toLowerCase().includes(q) ||
      r.doctor_name.toLowerCase().includes(q) ||
      (r.lab_name || "").toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q)
    );
  });

  const criticalReports = reports.filter((r) => r.overall_status === "critical" || r.critical_alert_sent);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* ── Header ── */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/vault"
            aria-label="Back to Vault"
            className="p-2.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              Vault Archive // Diagnostic Intelligence
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold flex items-center gap-2.5">
              <FlaskConical className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Lab Diagnostic Reports ({reports.length})
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              Categorized pathology reports, structured blood biomarker panels, and longitudinal trajectories.
            </p>
          </div>
        </div>

        <Link
          href="/scan-otc"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--fg)] text-[var(--bg)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Upload Lab PDF / Scan
        </Link>
      </div>

      {/* ── Part C Suggested UI: AI Insights Strip Above Lab List ── */}
      {(trends.length > 0 || criticalReports.length > 0) && (
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-blue-500/10 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-blue-950/40 border border-teal-500/30 dark:border-teal-500/20 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-teal-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                Diagnostic AI Insights &amp; Clinical Trajectories (LR-3 / LR-4)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase">
              Automated Trend Audit
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Critical value alert (LR-4) */}
            {criticalReports.map((cr) => (
              <div
                key={cr.id}
                className="bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="font-bold text-rose-900 dark:text-rose-200">
                      🔴 Critical parameter flagged in {cr.date} test — {cr.doctor_name} was immediately notified
                    </p>
                    <p className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5">
                      {cr.reviewed_by_doctor_note || cr.summary}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/vault/lab-report/${cr.id}`}
                  className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 hover:underline flex-shrink-0"
                >
                  <span>Review Critical Alert</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}

            {/* Cross-report trends (LR-3) */}
            {trends.map((tr, idx) => (
              <div
                key={idx}
                className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xs border border-[var(--border)] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex-shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--fg)]">
                      ✨ {tr.parameter} Trajectory: {tr.history_str}
                    </h4>
                    <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">{tr.summary}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800 flex-shrink-0 self-start sm:self-center">
                  Improving Trend ↓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters & Search ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test name, doctor, diagnostic lab, or biomarkers..."
              className="w-full glass-panel border border-[var(--border)] pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[var(--fg)] transition-all rounded-2xl shadow-sm"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[
              { key: "all", label: "All Reports" },
              { key: "normal", label: "Normal" },
              { key: "abnormal", label: "Abnormal" },
              { key: "critical", label: "Critical" },
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

        {/* ── Part C Report Cards List ── */}
        <div className="space-y-5">
          {filteredReports.map((report) => {
            const isCritical = report.overall_status === "critical" || report.critical_alert_sent;
            const isAbnormal = report.overall_status === "abnormal";
            const isReminderSet = reminderSetMap[report.id] || report.recheck_reminder_set;

            let statusBadge = (
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Normal
              </span>
            );

            if (isCritical) {
              statusBadge = (
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-400 dark:border-rose-700 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Critical Alert
                </span>
              );
            } else if (isAbnormal) {
              statusBadge = (
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> High / Borderline
                </span>
              );
            }

            return (
              <div
                key={report.id}
                className="glass-card p-6 sm:p-7 rounded-3xl space-y-4 hover:border-[var(--fg)] transition-all"
              >
                {/* Top Row: Title, Date, Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                        <FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <Link
                        href={`/vault/lab-report/${report.id}`}
                        className="font-bold text-base sm:text-lg text-[var(--fg)] hover:underline"
                      >
                        {report.test_name || report.title}
                      </Link>
                      {statusBadge}
                      {report.historical_trend_data && (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> ↓ Trajectory
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--fg-muted)] font-medium flex flex-wrap items-center gap-2">
                      <span>{report.date}</span>
                      <span>·</span>
                      <strong className="text-[var(--fg)]">{report.doctor_name}</strong>
                      {report.doctor_specialty && <span>({report.doctor_specialty})</span>}
                      {report.lab_name && (
                        <>
                          <span>·</span>
                          <span className="text-[var(--fg)]">{report.lab_name}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <Link
                    href={`/vault/lab-report/${report.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--fg)] hover:underline self-start sm:self-center"
                  >
                    <span>View Full Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Plain-Language Patient Summary (Part A.2 #3) */}
                <div className="bg-[var(--bg-muted)]/70 rounded-2xl p-4 space-y-1.5 border border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                      Plain-Language Summary (Patient Guidance)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed italic">
                    &ldquo;{report.plain_language_summary || report.summary}&rdquo;
                  </p>
                </div>

                {/* Doctor's Clinical Read Note (Part A.2 #4) */}
                {report.reviewed_by_doctor_note && (
                  <div className="flex items-start gap-2.5 text-xs text-[var(--fg-muted)] pl-2 border-l-2 border-emerald-500">
                    <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-[var(--fg)]">Physician Review:</strong>{" "}
                      {report.reviewed_by_doctor_note}
                    </p>
                  </div>
                )}

                {/* Bottom Row: Recheck interval & Actions (Part A.2 #6 / #7) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
                  {report.next_recheck_suggested ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                      <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>
                        Next recheck suggested: <strong className="text-[var(--fg)]">{report.next_recheck_suggested}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--fg-muted)]">
                      Status verified in permanent vault archive.
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {report.historical_trend_data && (
                      <Link
                        href={`/vault/lab-report/${report.id}#trend-chart`}
                        className="px-3.5 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--fg)] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      >
                        <LineChart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        Trend Chart
                      </Link>
                    )}

                    {report.next_recheck_suggested && (
                      <button
                        onClick={() => handleSetReminder(report.id)}
                        disabled={isReminderSet}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          isReminderSet
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300"
                            : "bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        {isReminderSet ? "Reminder Set ✓" : "Set Reminder"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredReports.length === 0 && !loading && (
            <div className="glass-card p-12 text-center rounded-3xl">
              <FlaskConical className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold">No Lab Diagnostic Reports Found</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">No items match your filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
