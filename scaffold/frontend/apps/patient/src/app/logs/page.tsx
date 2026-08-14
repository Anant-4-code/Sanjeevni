"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  History,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  RefreshCw,
  Clock,
  User,
  Bot,
  Filter,
  Timer,
  XCircle,
  HeartPulse,
  Pill,
  ShieldAlert,
  Info,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type AuditLog = {
  id: string;
  patient_id: string;
  event_type: string;
  title: string;
  details: string;
  actor: string;
  created_at: string;
};

const EVENT_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  DOCTOR_VERIFIED: {
    label: "DOCTOR VERIFICATION",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-800",
    icon: ShieldCheck,
  },
  PRESCRIPTION_SCANNED: {
    label: "SCAN UPLOADED (UNVERIFIED)",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-800",
    icon: FileText,
  },
  DOSE_TOGGLED: {
    label: "DOSE LOGGED",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-800",
    icon: CheckCircle2,
  },
  DOSE_SNOOZED: {
    label: "DOSE SNOOZED (PENDING)",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-300 dark:border-indigo-800",
    icon: Timer,
  },
  DOSE_SKIPPED_EXPLICIT: {
    label: "EXPLICIT DOSE SKIP",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    icon: XCircle,
  },
  SYMPTOM_LOGGED: {
    label: "SYMPTOM CHECK-IN",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-300 dark:border-rose-800",
    icon: HeartPulse,
  },
  REFILL_REQUESTED: {
    label: "REFILL REQUEST",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-800",
    icon: RefreshCw,
  },
  ALLERGY_ADDED: {
    label: "ALLERGY PROFILE",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-300 dark:border-red-800",
    icon: ShieldAlert,
  },
  OTC_CHECKED: {
    label: "OTC INTERACTION CHECK",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-300 dark:border-rose-800",
    icon: AlertTriangle,
  },
  PASSPORT_MINTED: {
    label: "PASSPORT QR CREATED",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-300 dark:border-purple-800",
    icon: QrCode,
  },
  COPILOT_QUESTION: {
    label: "COPILOT Q&A",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-300 dark:border-indigo-800",
    icon: Bot,
  },
};

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  function fetchLogs() {
    setLoading(true);
    const pid = user?.id || "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/logs`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchLogs();
  }, [user?.id]);

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "verifications") return log.event_type === "DOCTOR_VERIFIED";
    if (filter === "scans") return log.event_type === "PRESCRIPTION_SCANNED";
    if (filter === "doses")
      return (
        log.event_type === "DOSE_TOGGLED" ||
        log.event_type === "DOSE_SNOOZED" ||
        log.event_type === "DOSE_SKIPPED_EXPLICIT"
      );
    if (filter === "symptoms") return log.event_type === "SYMPTOM_LOGGED";
    if (filter === "otc") return log.event_type === "OTC_CHECKED";
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Glass Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-[var(--fg)] rounded-full animate-ping" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                AUDIT & ESCALATION TRANSPARENCY
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <History className="w-7 h-7 text-[var(--fg)]" />
              Activity Audit & Escalation Logs
            </h1>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold hover:border-[var(--fg)] transition-all shadow-sm flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {/* A5: Patient Escalation Transparency Guide */}
      <div className="glass-card p-6 border-2 border-[var(--border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Missed-Dose & Escalation Transparency Model
          </h2>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">
            Compliance Policy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--bg-muted)]/60 border border-[var(--border)] space-y-1">
            <p className="font-bold text-[var(--fg)]">Snoozed Doses (+20m)</p>
            <p className="text-[var(--fg-muted)] leading-relaxed">
              Counted as <strong>Pending</strong>, not Missed. Escalation timers reset relative to snooze time to prevent premature caregiver alerts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-muted)]/60 border border-[var(--border)] space-y-1">
            <p className="font-bold text-[var(--fg)]">Late Intake Scoring</p>
            <p className="text-[var(--fg-muted)] leading-relaxed">
              Doses taken after scheduled time are logged as <strong>Taken Late</strong> and fully rewarded in adherence compliance.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-muted)]/60 border border-[var(--border)] space-y-1">
            <p className="font-bold text-[var(--fg)]">Explicit Skip Tracking</p>
            <p className="text-[var(--fg-muted)] leading-relaxed">
              Recorded with your reason (e.g. side effects, doctor advised). Visible to your physician as an intentional pause rather than non-compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-mono uppercase text-[var(--fg-muted)] flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {[
          { key: "all", label: "All Activity" },
          { key: "doses", label: "Doses & Snoozes" },
          { key: "symptoms", label: "Symptom Check-Ins" },
          { key: "verifications", label: "Doctor Sign-Offs" },
          { key: "scans", label: "Scans Uploaded" },
          { key: "otc", label: "OTC Safety Checks" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              filter === tab.key
                ? "bg-[var(--fg)] text-[var(--bg)] shadow-md"
                : "glass-card text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {filteredLogs.map((log) => {
          const badge = EVENT_BADGES[log.event_type] || {
            label: log.event_type,
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-300",
            icon: Clock,
          };
          const IconComp = badge.icon;
          const formattedDate = new Date(log.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={log.id}
              className="glass-card p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${badge.border} ${badge.bg}`}
                >
                  <IconComp className={`w-5 h-5 ${badge.text}`} />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.border} ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-[var(--fg-muted)] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formattedDate}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-[var(--fg)]">
                    {log.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
                    {log.details}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--fg-muted)] border border-[var(--border)] px-3 py-1.5 rounded-full bg-[var(--bg-muted)] self-start sm:self-auto flex-shrink-0">
                <User className="w-3.5 h-3.5" />
                <span>{log.actor}</span>
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && !loading && (
          <div className="glass-card p-12 text-center">
            <History className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">No Activity Logs Found</p>
            <p className="text-xs text-[var(--fg-muted)]">
              No logs match the selected filter category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
