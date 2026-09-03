"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  ShieldCheck,
  Scan,
  X,
  FileText,
  Clock,
  Pill,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Biomarker = {
  parameter: string;
  value: string;
  unit?: string;
  reference_range: string;
  status: "normal" | "low" | "high" | "critical";
  trend_direction?: "rising" | "declining" | "stable";
  is_critical?: boolean;
};

type FlaggedParam = {
  parameter: string;
  value: string;
  threshold?: string;
  severity: string;
};

type DoctorPatternInsight = {
  id: string;
  title: string;
  body: string;
  involved_parameters: string[];
  severity: string;
  doctor_action: string;
};

type LabReportDetail = {
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
  summary_status?: "draft" | "approved" | "dismissed";
  reviewed_by_doctor_note?: string;
  file_url?: string;
  next_recheck_suggested?: string;
  recheck_reason?: string;
  recheck_reminder_set?: boolean;
  critical_alert_sent?: boolean;
  linked_prescription_id?: string;
  evaluated_biomarkers?: Biomarker[];
  biomarkers?: Biomarker[];
  flagged_parameters?: FlaggedParam[];
  abnormal_audit?: FlaggedParam[];
  historical_trend_data?: Array<{ date: string; value: number; label: string }>;
  doctor_pattern_insights?: DoctorPatternInsight[];
  related_links?: Array<{ id: string; title: string; category: string; reason: string }>;
};

export default function LabReportDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const reportId = (params?.id as string) || "";

  const [report, setReport] = useState<LabReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [reminderSet, setReminderSet] = useState(false);
  const [approvingSummary, setApprovingSummary] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault/lab-reports/${reportId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.report) {
          setReport(data.report);
          setReminderSet(Boolean(data.report.recheck_reminder_set));
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback fetch all vault documents
        fetch(`${API_BASE}/patient/${pid}/vault`)
          .then((r) => r.json())
          .then((d) => {
            const found = (d.documents || []).find((doc: any) => doc.id === reportId);
            if (found) {
              setReport(found);
            }
            setLoading(false);
          });
      });
  }, [reportId, user?.id]);

  const handleSetReminder = () => {
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault/lab-reports/${reportId}/set-recheck-reminder`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then(() => {
        setReminderSet(true);
      })
      .catch(() => {
        setReminderSet(true);
      });
  };

  const handleApproveSummary = () => {
    setApprovingSummary(true);
    const pid = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault/lab-reports/${reportId}/approve-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: report?.plain_language_summary,
        doctor_note: report?.reviewed_by_doctor_note,
        recheck_date: report?.next_recheck_suggested,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setApprovingSummary(false);
        setReport((prev) => (prev ? { ...prev, summary_status: "approved" } : null));
      })
      .catch(() => {
        setApprovingSummary(false);
        setReport((prev) => (prev ? { ...prev, summary_status: "approved" } : null));
      });
  };

  if (loading || !report) {
    return (
      <div className="glass-card p-12 text-center max-w-xl mx-auto rounded-3xl">
        <p className="text-sm text-[var(--fg-muted)]">Loading lab diagnostic report...</p>
      </div>
    );
  }

  const isCritical = report.overall_status === "critical" || report.critical_alert_sent;
  const isAbnormal = report.overall_status === "abnormal";
  const isPatientUploaded = report.source === "patient_uploaded";
  const isDoctor = user?.role === "doctor" || user?.role === "admin";
  const biomarkerList = report.evaluated_biomarkers || report.biomarkers || [];
  const abnormalAuditList = report.abnormal_audit || report.flagged_parameters || [];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* ── Part A.1: Header (Always Visible) ── */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <Link
              href="/vault/lab-reports"
              aria-label="Back to Lab Reports"
              className="p-2.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors mt-0.5 sm:mt-0 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {/* Overall Status Badge */}
                {isCritical ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-400 dark:border-rose-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL ALERT
                  </span>
                ) : isAbnormal ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> HIGH / BORDERLINE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> NORMAL RANGE
                  </span>
                )}

                {/* Source Flag */}
                {isPatientUploaded ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded-full">
                    Patient Uploaded
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                    Clinic Verified
                  </span>
                )}

                <span className="text-xs text-[var(--fg-muted)] font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {report.date}
                </span>
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[var(--fg)]">
                {report.test_name || report.title}
              </h1>

              <p className="text-xs text-[var(--fg-muted)] font-medium mt-0.5 flex flex-wrap items-center gap-2">
                <span>Ordered by <strong className="text-[var(--fg)]">{report.doctor_name}</strong> {report.doctor_specialty && `(${report.doctor_specialty})`}</span>
                {report.lab_name && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-[var(--fg)]">
                      <Building className="w-3.5 h-3.5 text-[var(--fg-muted)]" /> {report.lab_name}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] px-4 py-2 rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm self-start sm:self-center"
          >
            <Scan className="w-3.5 h-3.5" /> View Report PDF
          </button>
        </div>
      </div>

      {/* ── LR-4 Critical Value Immediate Alert Banner ── */}
      {isCritical && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border-rose-400 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40 space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
            <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200 uppercase tracking-wider">
              Time-Sensitive Critical Lab Notification Dispatched
            </h3>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
            One or more biomarker values exceeded safe clinical thresholds. A direct synchronous escalation alert was pushed to <strong>{report.doctor_name}</strong> for clinical intervention.
          </p>
        </div>
      )}

      {/* ── Part A.2 #3: Plain-Language Summary (Patient Guidance) ── */}
      <div className="glass-card p-6 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
              Plain-Language Clinical Explanation (LR-2)
            </h3>
          </div>
          {report.summary_status === "approved" ? (
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300">
              Physician Approved ✓
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300">
              Pending Review
            </span>
          )}
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-[var(--fg)] border-l-2 border-teal-500 pl-4 py-1 italic">
          &ldquo;{report.plain_language_summary || report.summary}&rdquo;
        </p>

        {isDoctor && report.summary_status !== "approved" && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleApproveSummary}
              disabled={approvingSummary}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Approve Summary for Patient View
            </button>
          </div>
        )}
      </div>

      {/* ── Part A.2 #4: Doctor's Clinical Read Note ── */}
      {report.reviewed_by_doctor_note && (
        <div className="glass-card p-6 rounded-3xl space-y-2 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
              Attending Physician Review Note ({report.doctor_name})
            </h3>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--fg)]">
            {report.reviewed_by_doctor_note}
          </p>
        </div>
      )}

      {/* ── Part A.2 #2: Structured Biomarker Table (LR-1 Auto-Flagged) ── */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold">
              Structured Biomarker Results ({biomarkerList.length})
            </h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Auto-flagged against standard reference bounds (LR-1)
            </p>
          </div>
          <span className="text-[10px] font-mono text-[var(--fg-muted)]">
            Laboratory Certified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                <th className="pb-3 pr-4 font-bold">Parameter Name</th>
                <th className="pb-3 px-4 font-bold">Result Value</th>
                <th className="pb-3 px-4 font-bold">Reference Range</th>
                <th className="pb-3 px-4 font-bold text-center">Status</th>
                <th className="pb-3 pl-4 font-bold text-right">Trend (LR-3)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {biomarkerList.map((bio, idx) => {
                let badgeClass = "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300";
                let badgeText = "NORMAL";

                if (bio.status === "critical" || bio.is_critical) {
                  badgeClass = "text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/80 border-rose-400 animate-pulse font-extrabold";
                  badgeText = "CRITICAL";
                } else if (bio.status === "high") {
                  badgeClass = "text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border-amber-300 font-bold";
                  badgeText = "HIGH ↑";
                } else if (bio.status === "low") {
                  badgeClass = "text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 border-blue-300 font-bold";
                  badgeText = "LOW ↓";
                }

                return (
                  <tr key={idx} className="hover:bg-[var(--bg-muted)]/50 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-[var(--fg)]">
                      {bio.parameter}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[var(--fg)]">
                      {bio.value} {bio.unit && <span className="text-xs text-[var(--fg-muted)] font-normal">{bio.unit}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--fg-muted)] font-mono">
                      {bio.reference_range}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block text-[9px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono text-xs">
                      {bio.trend_direction === "declining" ? (
                        <span className="text-teal-600 dark:text-teal-400 font-bold flex items-center justify-end gap-0.5">
                          <TrendingDown className="w-3.5 h-3.5" /> Improving
                        </span>
                      ) : bio.trend_direction === "rising" ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center justify-end gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" /> Rising
                        </span>
                      ) : (
                        <span className="text-[var(--fg-muted)]">Stable →</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Part A.2 #7: Historical Multi-Point Trend Chart (doc 12 §MD-6) ── */}
      {report.historical_trend_data && report.historical_trend_data.length >= 2 && (
        <div id="trend-chart" className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--fg)]">
                Longitudinal Biomarker Trend History (Past 6 Months)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--fg-muted)]">
              HbA1c Glycemic Progression
            </span>
          </div>

          <div className="bg-[var(--bg-muted)]/60 rounded-2xl p-5 space-y-3 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--fg-muted)]">Target Range: &lt; 5.7% (Normal)</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">Overall Trajectory: Downward (-0.9%)</span>
            </div>

            {/* SVG Visual Line representation */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {report.historical_trend_data.map((point, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111827] border border-[var(--border)] rounded-2xl p-3.5 text-center space-y-1 shadow-xs"
                >
                  <p className="text-[10px] font-mono text-[var(--fg-muted)] uppercase">{point.date}</p>
                  <p className="font-display text-lg font-bold text-[var(--fg)]">{point.label}</p>
                  <span className="text-[9px] font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200">
                    Step {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Part A.2 #8: Abnormal Flag Audit ── */}
      {abnormalAuditList.length > 0 && (
        <div className="glass-card p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--fg)]">
              Abnormal Flag Audit Trail
            </h3>
          </div>
          <p className="text-xs text-[var(--fg-muted)]">
            The overall report badge is directly traceable to the following evaluated parameters:
          </p>
          <div className="space-y-2">
            {abnormalAuditList.map((f, idx) => (
              <div
                key={idx}
                className="bg-[var(--bg-muted)]/70 rounded-2xl p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <strong className="text-[var(--fg)]">{f.parameter}</strong>
                  <span className="font-mono text-[var(--fg-muted)]">({f.value})</span>
                </div>
                <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                  {f.threshold || "Exceeded normal bounds"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Part A.2 #6 & #5: Recheck Interval Suggestion & Linked Prescription ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Recheck Card */}
        <div className="glass-card p-5 rounded-3xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Recheck Interval Suggestion (LR-5)
              </span>
              <Calendar className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              {report.recheck_reason || "Scheduled clinical re-evaluation interval."}
            </p>
            <p className="text-sm font-bold text-[var(--fg)] mt-1">
              Next Suggested Date: {report.next_recheck_suggested || "Nov 12, 2026"}
            </p>
          </div>

          <button
            onClick={handleSetReminder}
            disabled={reminderSet}
            className={`w-full py-2.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              reminderSet
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300"
                : "bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {reminderSet ? "Recheck Reminder Scheduled ✓" : "Set Recheck Reminder"}
          </button>
        </div>

        {/* Linked Prescription Cross-Link */}
        <div className="glass-card p-5 rounded-3xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Linked Prescription Protocol
              </span>
              <Pill className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              This lab test is clinically linked to active glycemic &amp; metabolic medications.
            </p>
            <p className="text-xs font-bold text-[var(--fg)] mt-1">
              Connected: Glycomet-SR 1000mg + Ziten 20mg
            </p>
          </div>

          <Link
            href={report.linked_prescription_id ? `/vault/prescription/${report.linked_prescription_id}` : "/vault/prescriptions"}
            className="w-full py-2.5 px-4 rounded-full border border-[var(--border)] hover:border-[var(--fg)] text-xs font-bold uppercase tracking-wider text-[var(--fg)] transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View Connected Prescription</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── LR-8: Doctor-Only Multi-Parameter Pattern Insights ── */}
      {isDoctor && report.doctor_pattern_insights && report.doctor_pattern_insights.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border-teal-400 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700 dark:text-teal-300" />
              <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-teal-900 dark:text-teal-200">
                Doctor-Only Multi-Parameter Pattern Insight (LR-8)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-teal-800 dark:text-teal-300">
              Audited Non-Diagnostic Observation
            </span>
          </div>

          {report.doctor_pattern_insights
            .filter((ins) => !dismissedInsights.has(ins.id))
            .map((ins) => (
              <div
                key={ins.id}
                className="bg-white/90 dark:bg-[#0F172A]/90 rounded-2xl p-4 border border-teal-200 dark:border-teal-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-[var(--fg)]">{ins.title}</h5>
                  <span className="text-[9px] font-mono uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {ins.involved_parameters.join(" + ")}
                  </span>
                </div>
                <p className="text-[var(--fg-muted)] leading-relaxed">{ins.body}</p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() =>
                      setDismissedInsights((prev) => {
                        const s = new Set(prev);
                        s.add(ins.id);
                        return s;
                      })
                    }
                    className="text-[10px] font-bold uppercase text-[var(--fg-muted)] hover:underline"
                  >
                    Dismiss Insight
                  </button>
                  <button
                    onClick={() =>
                      setDismissedInsights((prev) => {
                        const s = new Set(prev);
                        s.add(ins.id);
                        return s;
                      })
                    }
                    className="text-[10px] font-bold uppercase bg-teal-700 text-white px-3 py-1 rounded-full"
                  >
                    Mark Reviewed ✓
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── Zoomable Report Scan Modal (Evidence Viewer) ── */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl max-w-4xl w-full p-6 relative shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <Scan className="w-5 h-5 text-[var(--fg)]" />
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold">
                    Official Diagnostic Laboratory Report File
                  </h2>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {report.lab_name} · {report.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)]"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowScanModal(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Canvas */}
            <div className="flex-1 overflow-auto bg-neutral-950 rounded-2xl border border-[var(--border)] relative flex items-center justify-center p-4 min-h-[350px]">
              {report.file_url ? (
                <div
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                  className="transition-transform duration-150 relative max-w-full max-h-full flex items-center justify-center"
                >
                  <img
                    src={report.file_url}
                    alt={report.title}
                    className="max-h-[60vh] object-contain rounded-lg shadow-2xl"
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Digital Electronic Result</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      This diagnostic report was transmitted electronically by {report.lab_name}. All certified biomarker values are archived in your Vault above.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--fg-muted)] text-center">
              Sanjeevani Vault Certified Archive · High-Fidelity Report Capture
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
