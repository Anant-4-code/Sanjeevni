"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Volume2,
  Clock,
  Camera,
  MessageCircle,
  QrCode,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  HeartPulse,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pill,
  Timer,
  XCircle,
  TrendingUp,
  Upload,
  Image as ImageIcon,
  X,
  Send,
  Sparkles,
  Frown,
  Meh,
  Smile,
  Laugh,
  HelpCircle,
} from "lucide-react";
import AdherenceWellbeingTrend from "@/components/AdherenceWellbeingTrend";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type RefillItem = {
  prescription_item_id: string;
  medicine: string;
  doctor: string;
  days_remaining: number | null;
  urgency: string;
  criticality_tier?: string;
};

const WELLBEING_LEVELS = [
  { score: 1, Icon: Frown, color: "text-rose-500", label: "Very Bad" },
  { score: 2, Icon: Frown, color: "text-amber-500", label: "Bad" },
  { score: 3, Icon: Meh, color: "text-amber-400", label: "Okay" },
  { score: 4, Icon: Smile, color: "text-emerald-500", label: "Good" },
  { score: 5, Icon: Laugh, color: "text-emerald-600", label: "Great" },
];

type ScheduleItem = {
  time: string;
  medicine: string;
  condition: string;
  doctor: string;
  taken: boolean;
  prescription_item_id: string;
  criticality_tier?: "routine" | "important" | "critical";
  acknowledgment_state?: "none" | "snoozed" | "taken" | "skipped_explicit";
  snooze_until?: string;
  skip_reason?: string;
};

type CorrelationPoint = {
  date: string;
  label: string;
  adherence_pct: number;
  wellbeing_score: number;
  has_real_log: boolean;
};

/* â”€â”€ Adherence Ring (SVG stroke-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AdherenceRing({ score, size = 110 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = "#10B981"; // Emerald
  if (score < 50) strokeColor = "#EF4444"; // Red
  else if (score < 80) strokeColor = "#F59E0B"; // Amber

  return (
    <div className="flex-shrink-0 relative group">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--border)"
          strokeWidth={size > 100 ? "8" : "6"}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeColor}
          strokeWidth={size > 100 ? "8" : "6"}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={size / 2}
          y={size / 2 - (size > 100 ? 4 : 2)}
          textAnchor="middle"
          className="fill-[var(--fg)] font-extrabold"
          fontSize={size > 100 ? "26" : "20"}
        >
          {score}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + (size > 100 ? 16 : 14)}
          textAnchor="middle"
          className="fill-[var(--fg-muted)] font-semibold uppercase tracking-wider"
          fontSize={size > 100 ? "9" : "8"}
        >
          adherence
        </text>
      </svg>
    </div>
  );
}

/* â”€â”€ Dose Card with Criticality & Snooze/Skip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DoseCard({
  item,
  onToggle,
  onSnooze,
  onSkip,
  onSpeak,
}: {
  item: ScheduleItem;
  onToggle: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onSpeak: () => void;
}) {
  const isTaken = item.taken || item.acknowledgment_state === "taken";
  const isSnoozed = item.acknowledgment_state === "snoozed";
  const isSkipped = item.acknowledgment_state === "skipped_explicit";
  const tier = item.criticality_tier || "important";

  return (
    <div
      className={`glass-card p-5 transition-all duration-200 ${
        isTaken
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
          : isSnoozed
          ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
          : isSkipped
          ? "bg-neutral-50 dark:bg-neutral-900/40 border-neutral-300 dark:border-neutral-800 opacity-80"
          : tier === "critical"
          ? "border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10"
          : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 pr-2">
          {/* Criticality & Condition Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {tier === "critical" && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Critical Tier
              </span>
            )}
            {tier === "routine" && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                Routine
              </span>
            )}
            {tier === "important" && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                Important
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[var(--fg-muted)] bg-[var(--bg-muted)]">
              {item.condition}
            </span>

            {isSnoozed && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 flex items-center gap-1">
                <Timer className="w-3 h-3" /> Snoozed (+20m Â· Pending)
              </span>
            )}

            {isSkipped && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Skipped: {item.skip_reason || "Explicit"}
              </span>
            )}
          </div>

          <h3 className="font-bold text-base sm:text-lg text-[var(--fg)]">
            {item.medicine}
          </h3>
          <p className="text-xs text-[var(--fg-muted)] font-medium mt-0.5">
            Prescribed by <strong className="text-[var(--fg)]">{item.doctor}</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
          <button
            onClick={onSpeak}
            aria-label={`Play audio for ${item.medicine}`}
            className="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-center hover:border-[var(--fg)] transition-all shadow-sm"
            title="Listen in regional voice"
          >
            <Volume2 className="w-4 h-4 text-[var(--fg-muted)]" />
          </button>

          {!isTaken && (
            <>
              <button
                onClick={onSnooze}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100 transition-all flex items-center gap-1"
                title="Snooze for 20 minutes (counted as Pending, not Missed)"
              >
                <Timer className="w-3.5 h-3.5" /> Snooze
              </button>

              <button
                onClick={onSkip}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center gap-1"
                title="Explicit skip with reason"
              >
                <XCircle className="w-3.5 h-3.5" /> Skip
              </button>
            </>
          )}

          <button
            onClick={onToggle}
            className={`min-w-[110px] px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm ${
              isTaken
                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                : "bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
            }`}
          >
            {isTaken ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Taken âœ“
              </>
            ) : (
              "Mark Taken"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function Dashboard() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [adherence, setAdherence] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Â§1 Refill Intelligence state
  const [refillItems, setRefillItems] = useState<RefillItem[]>([]);
  const [refillRequested, setRefillRequested] = useState<Set<string>>(new Set());

  // A1 & A3 Escalation batch state
  const [escalationBatch, setEscalationBatch] = useState<{
    missed_count: number;
    highest_tier: string;
    batch_alert_message: string;
  } | null>(null);

  // A2 Skip Modal state
  const [skipModalItem, setSkipModalItem] = useState<ScheduleItem | null>(null);
  const [skipReason, setSkipReason] = useState("Ran out");

  // Â§2 & B1-B3 Symptom Journal state
  const [symptomOpen, setSymptomOpen] = useState(false);
  const [wellbeingScore, setWellbeingScore] = useState(0);
  const [symptomNote, setSymptomNote] = useState("");
  const [taggedMedicine, setTaggedMedicine] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [symptomSaved, setSymptomSaved] = useState(false);
  const [trendAlert, setTrendAlert] = useState<{ triggered: boolean; message: string } | null>(null);
  const [isEditingToday, setIsEditingToday] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // B5 Gentle Non-Logging Nudge state (7-day suppression in localStorage)
  const [showGentleNudge, setShowGentleNudge] = useState(false);

  // B4 Dual-Trend Correlation state
  const [correlationData, setCorrelationData] = useState<CorrelationPoint[]>([]);

  function fetchTimeline() {
    const pid = (user?.role === "patient" && user?.id) ? user.id : "patient-ramesh";
    fetch(`${API_BASE}/patient/${pid}/timeline`)
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule || []);
        setAdherence(d.adherence_score || 0);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }

  function fetchRefillStatus() {
    const pid = (user?.role === "patient" && user?.id) ? user.id : "patient-ramesh";
    fetch(`${API_BASE}/patient/${pid}/refill-status`)
      .then((r) => r.json())
      .then((d) => setRefillItems(d.items || []))
      .catch(() => {});
  }

  function fetchEscalationStatus() {
    const pid = (user?.role === "patient" && user?.id) ? user.id : "patient-ramesh";
    fetch(`${API_BASE}/patient/${pid}/escalation-status`)
      .then((r) => r.json())
      .then((d) => setEscalationBatch(d))
      .catch(() => {});
  }

  function fetchCorrelation() {
    const pid = (user?.role === "patient" && user?.id) ? user.id : "patient-ramesh";
    fetch(`${API_BASE}/patient/${pid}/correlation?days=7`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCorrelationData(d);
      })
      .catch(() => {});
  }

  // Check Gentle Nudge suppression
  useEffect(() => {
    const suppressedUntil = localStorage.getItem("sanjeevani_nudge_suppressed_until");
    if (!suppressedUntil || new Date(suppressedUntil).getTime() < Date.now()) {
      setShowGentleNudge(true);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
    fetchRefillStatus();
    fetchEscalationStatus();
    fetchCorrelation();
  }, [user?.id]);

  const groupedSchedule = useMemo(() => {
    const groups: Record<string, ScheduleItem[]> = {};
    schedule.forEach((item) => {
      if (!groups[item.time]) groups[item.time] = [];
      groups[item.time].push(item);
    });
    return groups;
  }, [schedule]);

  const refillAlerts = useMemo(
    () => refillItems.filter((r) => r.urgency === "critical" || r.urgency === "warning"),
    [refillItems]
  );

  function toggleDose(item: ScheduleItem) {
    const nextTaken = !item.taken;
    setSchedule((prev) =>
      prev.map((s) =>
        s.prescription_item_id === item.prescription_item_id
          ? { ...s, taken: nextTaken, acknowledgment_state: nextTaken ? "taken" : "none" }
          : s
      )
    );

    fetch(`${API_BASE}/patient/intake/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_item_id: item.prescription_item_id,
        taken: nextTaken,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.adherence_score !== undefined) setAdherence(d.adherence_score);
        fetchEscalationStatus();
        fetchCorrelation();
      })
      .catch(() => {});
  }

  // A2 Snooze
  function handleSnooze(item: ScheduleItem) {
    fetch(`${API_BASE}/patient/intake/snooze`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_item_id: item.prescription_item_id,
        minutes: 20,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule || []);
        if (d.adherence_score !== undefined) setAdherence(d.adherence_score);
        fetchEscalationStatus();
      })
      .catch(() => {});
  }

  // A2 Explicit Skip
  function handleConfirmSkip() {
    if (!skipModalItem) return;
    fetch(`${API_BASE}/patient/intake/skip`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_item_id: skipModalItem.prescription_item_id,
        reason: skipReason,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule || []);
        if (d.adherence_score !== undefined) setAdherence(d.adherence_score);
        setSkipModalItem(null);
        fetchEscalationStatus();
      })
      .catch(() => {
        setSkipModalItem(null);
      });
  }

  // Handle Photo Attachment
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = evt.target?.result as string;
        setPhotoPreview(res);
        setPhotoUrl(res);
      };
      reader.readAsDataURL(file);
    }
  }

  // Â§2 & B1-B3 Symptom Submit
  async function handleSymptomSubmit() {
    if (wellbeingScore < 1) return;
    try {
      const res = await fetch(`${API_BASE}/patient/symptom/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "demo-patient",
          wellbeing_score: wellbeingScore,
          note: symptomNote,
          tagged_medicine: taggedMedicine,
          photo_url: photoUrl,
        }),
      });
      const data = await res.json();
      setSymptomSaved(true);
      setIsEditingToday(true);
      if (data.trend_alert) {
        setTrendAlert(data.trend_alert);
      }
      fetchCorrelation();
      setTimeout(() => setSymptomOpen(false), 2200);
    } catch {}
  }

  function dismissGentleNudge() {
    const suppressDate = new Date();
    suppressDate.setDate(suppressDate.getDate() + 7);
    localStorage.setItem("sanjeevani_nudge_suppressed_until", suppressDate.toISOString());
    setShowGentleNudge(false);
  }

  async function handleRefillRequest(item: RefillItem) {
    try {
      await fetch(`${API_BASE}/patient/refill-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "demo-patient",
          medicine: item.medicine,
          prescription_item_id: item.prescription_item_id,
        }),
      });
      setRefillRequested((prev) => {
        const next = new Set(prev);
        next.add(item.prescription_item_id);
        return next;
      });
    } catch {}
  }

  function speak(item: ScheduleItem) {
    const utterance = new SpeechSynthesisUtterance(
      `Take ${item.medicine}, at ${item.time}, for ${item.condition.toLowerCase()}, prescribed by ${item.doctor}.`
    );
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  const takenCount = schedule.filter((s) => s.taken || s.acknowledgment_state === "taken").length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {user?.role && user.role !== "patient" && (
        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0" />
            <span>
              Signed in as <strong>{user.full_name} ({user.role.toUpperCase()})</strong> — currently previewing the Patient Care Portal.
            </span>
          </div>
          <Link
            href={user.role === "doctor" ? "/doctor" : user.role === "receptionist" ? "/reception" : user.role === "pharmacist" ? "/pharmacy" : "/lab"}
            className="px-3.5 py-1.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl font-bold text-[11px] whitespace-nowrap hover:opacity-90 transition-opacity self-start sm:self-auto shadow-xs"
          >
            Switch to {user.role === "doctor" ? "Doctor Workspace" : "Operations Portal"} &rarr;
          </Link>
        </div>
      )}
      {/* Glass Welcome Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              LIVE CLINICAL PROTOCOL Â· {user?.full_name ? user.full_name.toUpperCase() : "PATIENT"}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
            Daily Dosing & Safety Schedule
          </h1>
          <p className="text-sm text-[var(--fg-muted)] max-w-xl leading-relaxed">
            You have <strong className="text-[var(--fg)] font-bold">{schedule.length - takenCount} doses remaining</strong> today.
            Criticality-tiered monitoring is actively active.
          </p>
        </div>

        {/* Adherence Score Ring Display */}
        <div className="flex items-center gap-4 bg-[var(--bg-muted)]/50 p-4 rounded-2xl border border-[var(--border)] self-start md:self-auto shadow-inner">
          <AdherenceRing score={adherence} />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">Compliance Rate</p>
            <p className="text-xs text-[var(--fg-muted)] font-mono">
              {takenCount} of {schedule.length} doses logged
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-bold">
              â— Active Guard
            </span>
          </div>
        </div>
      </div>

      {/* ── AI-8 PERSONALIZED DAILY HEALTH TIP ── */}
      <div className="glass-card p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/60 to-cyan-50/70 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs flex items-start gap-4 transition-all">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
          <Sparkles className="w-5 h-5 text-emerald-100" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-emerald-800 dark:text-emerald-300">
              AI-8 // DAILY HEALTH INSIGHT
            </span>
            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.2 rounded-full font-bold">
              Personalized
            </span>
          </div>
          <p className="text-sm font-semibold text-[#0F172A] dark:text-gray-100 leading-snug">
            Since you&apos;re taking Metformin and Noveron, try to keep your evening meal timings consistent — it optimizes postprandial blood sugar control and prevents evening dizziness episodes.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-gray-400 mt-2 font-mono">
            <span>Tailored to: Metformin 500mg &bull; Noveron 500mg</span>
            <span>&bull;</span>
            <span className="text-emerald-700 dark:text-emerald-300">Refreshed today</span>
          </div>
        </div>
      </div>

      {/* A1 & A3: Unified Anti-Pileup Batch Escalation Alert */}
      {escalationBatch && escalationBatch.missed_count > 0 && escalationBatch.highest_tier === "critical" && (
        <div className="glass-card p-4 border-2 border-red-500 bg-red-50/70 dark:bg-red-950/30 flex items-start gap-3.5 shadow-md">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-red-600 text-white rounded-full">
                CRITICAL MISSED-DOSE ALERT
              </span>
              <span className="text-xs text-[var(--fg-muted)] font-mono">Caregiver Notification Active</span>
            </div>
            <p className="text-sm font-bold text-red-950 dark:text-red-200">
              {escalationBatch.batch_alert_message}
            </p>
          </div>
        </div>
      )}

      {/* B2: 3-Day Low Score Trend Action Alert */}
      {trendAlert && trendAlert.triggered && (
        <div className="glass-card p-5 border-2 border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 space-y-3">
          <div className="flex items-start gap-3">
            <HeartPulse className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
                {trendAlert.message}
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                Consistently low wellbeing scores can indicate medication tolerance or emerging symptoms.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hello Doctor, I am sharing my 3-day Sanjeevani health journal trend. I have logged feeling low for 3 consecutive days with notes: ${symptomNote || "General fatigue and discomfort"}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> Flag for My Doctor (WhatsApp) â†’
            </a>
            <button
              onClick={() => setTrendAlert(null)}
              className="px-3 py-2 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              I'm okay, just tracking â†’
            </button>
          </div>
        </div>
      )}

      {/* B5: Gentle Non-Logging Nudge (Dismissible for 7 days) */}
      {showGentleNudge && (
        <div className="glass-card p-4 flex items-center justify-between gap-4 border border-[var(--border)] bg-[var(--bg-muted)]/40">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[var(--fg)]" />
            <p className="text-xs text-[var(--fg)]">
              Haven't checked in for a few days â€” no pressure, but logging how you're feeling helps your doctor spot patterns.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSymptomOpen(true)}
              className="px-3 py-1.5 text-xs font-bold bg-[var(--fg)] text-[var(--bg)] rounded-full hover:opacity-90"
            >
              Log Today
            </button>
            <button
              onClick={dismissGentleNudge}
              className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
              title="Dismiss for 7 days"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Â§1 Refill Intelligence Banners */}
      {refillAlerts.length > 0 && (
        <div className="space-y-2">
          {refillAlerts.map((item) => (
            <div
              key={item.prescription_item_id}
              className={`glass-card p-4 flex items-center justify-between gap-4 border-2 ${
                item.urgency === "critical"
                  ? "border-red-400 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                  : "border-amber-400 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <Pill
                  className={`w-5 h-5 flex-shrink-0 ${
                    item.urgency === "critical" ? "text-red-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <p className="text-sm font-bold text-[var(--fg)]">
                    {item.medicine} â€”{" "}
                    {item.days_remaining === 0
                      ? "Course Complete"
                      : `${item.days_remaining} day${item.days_remaining === 1 ? "" : "s"} remaining`}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {item.urgency === "critical"
                      ? "Running out â€” request a refill now"
                      : "Running low â€” consider requesting a refill"}
                  </p>
                </div>
              </div>
              {refillRequested.has(item.prescription_item_id) ? (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Requested
                </span>
              ) : (
                <button
                  onClick={() => handleRefillRequest(item)}
                  className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    item.urgency === "critical"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Request Refill
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Â§2 & B1-B3 Symptom Journal Widget with Photo Attachment & Same-Day Edit */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => {
            setSymptomOpen(!symptomOpen);
            setSymptomSaved(false);
          }}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-muted)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            <div className="text-left">
              <p className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
                How are you feeling today?
                {isEditingToday && (
                  <span className="text-[10px] font-mono font-bold uppercase bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    Same-Day Update
                  </span>
                )}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                Log daily wellbeing, attach symptom photos & prepare doctor visit summaries
              </p>
            </div>
          </div>
          {symptomOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--fg-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--fg-muted)]" />
          )}
        </button>
        {symptomOpen && (
          <div className="px-6 pb-5 space-y-4 border-t border-[var(--border)]">
            {symptomSaved ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {isEditingToday ? "Today's check-in updated!" : "Logged for today!"}
                </p>
              </div>
            ) : (
              <>
                {/* Emoji Scale */}
                <div className="pt-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] mb-3">
                    Rate your wellbeing
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {WELLBEING_LEVELS.map((e) => {
  const Icon = e.Icon;
  return (
    <button
      key={e.score}
      type="button"
      onClick={() => setWellbeingScore(e.score)}
      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all ${
        wellbeingScore === e.score
          ? "bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] scale-105 shadow-md border-transparent"
          : "hover:bg-[var(--bg-muted)] border-transparent text-[var(--fg)]"
      }`}
    >
      <Icon className={`w-6 h-6 ${wellbeingScore === e.score ? "" : e.color}`} />
      <span className="text-[10px] font-mono uppercase tracking-wider font-bold">{e.label}</span>
    </button>
  );
})}
                  </div>
                </div>

                {/* Optional Note */}
                <textarea
                  value={symptomNote}
                  onChange={(e) => setSymptomNote(e.target.value.slice(0, 280))}
                  placeholder="Optional: describe how you're feeling (e.g. slight rash after morning dose, fatigue)..."
                  className="w-full bg-[var(--bg-muted)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)] transition-colors resize-none"
                  rows={2}
                />

                {/* B1: Photo Attachment for Visible Symptoms */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Attach Photo of Visible Symptom (Optional)
                    </p>
                    <span className="text-[10px] text-[var(--fg-muted)]">Purely for doctor's review Â· No automated diagnosis</span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {photoPreview ? (
                    <div className="relative inline-block border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                      <img src={photoPreview} alt="Symptom preview" className="w-32 h-32 object-cover" />
                      <button
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoUrl("");
                        }}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-dashed border-[var(--border)] rounded-xl text-xs font-bold text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] transition-all flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Skin/Symptom Photo
                    </button>
                  )}
                </div>

                {/* Tag to Medicine */}
                {schedule.length > 0 && (
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] mb-1.5">
                      Tag to a medicine (optional)
                    </p>
                    <select
                      value={taggedMedicine}
                      onChange={(e) => setTaggedMedicine(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--fg)] transition-colors"
                    >
                      <option value="">None</option>
                      {schedule.map((s) => (
                        <option key={s.prescription_item_id} value={s.medicine}>
                          {s.medicine}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleSymptomSubmit}
                  disabled={wellbeingScore < 1}
                  className="w-full py-3 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm"
                >
                  {isEditingToday ? "Update Today's Check-In" : "Save Today's Log"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--fg)]" />
              Active Medication Timeline
            </h2>
            <span className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-mono bg-[var(--bg-muted)] px-3 py-1 rounded-full border border-[var(--border)]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {loaded && schedule.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Clock className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-4" />
              <p className="text-base font-bold mb-1">No active prescriptions in schedule</p>
              <p className="text-xs text-[var(--fg-muted)] max-w-md mx-auto">
                Once an attending physician verifies your scanned care plan, your active medications
                will populate here automatically.
              </p>
            </div>
          )}

          {/* Time-Grouped Schedule */}
          <div className="space-y-6">
            {Object.entries(groupedSchedule).map(([time, items]) => (
              <div key={time} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-[var(--border)] flex-1" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold px-3 py-1 border border-[var(--border)] glass-panel rounded-full shadow-sm">
                    {time}
                  </span>
                  <div className="h-px bg-[var(--border)] flex-1" />
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <DoseCard
                      key={item.prescription_item_id}
                      item={item}
                      onToggle={() => toggleDose(item)}
                      onSnooze={() => handleSnooze(item)}
                      onSkip={() => setSkipModalItem(item)}
                      onSpeak={() => speak(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* B4: Live Adherence & Wellbeing Trend */}
          <AdherenceWellbeingTrend patientId={(user?.role === "patient" && user?.id) ? user.id : "patient-ramesh"} />
        </div>

        {/* Right Column (1 Col on Desktop) */}
        <div className="space-y-6">
          {/* Multi-Specialist Care Team Card */}
          {user?.primary_doctor && (
            <div className="glass-card p-5 space-y-3.5 border-2 border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Care Team & Specialists
                </span>
                <Link
                  href="/settings"
                  className="text-[11px] font-bold text-[var(--fg)] hover:underline uppercase tracking-wider font-mono"
                >
                  Manage â†’
                </Link>
              </div>

              {/* Lead Doctor Display */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--border)] flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 shadow-sm">
                  {user.primary_doctor.avatar_url ? (
                    <img
                      src={user.primary_doctor.avatar_url}
                      alt={user.primary_doctor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                      {user.primary_doctor.name.slice(4, 6)}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-[var(--fg)] truncate">
                      {user.primary_doctor.name}
                    </h3>
                    <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                      Lead
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] truncate">
                    {user.primary_doctor.specialty}
                  </p>
                  <p className="text-[10px] text-[var(--fg-muted)] font-mono truncate">
                    {user.primary_doctor.hospital}
                  </p>
                </div>
              </div>

              {user.primary_doctor.phone && (
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--fg-muted)] text-[11px]">Primary Desk:</span>
                  <span className="font-mono font-bold text-[var(--fg)]">
                    {user.primary_doctor.phone}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold">
              Patient Care Hub
            </h3>
            <div className="space-y-2">
              <Link
                href="/vault"
                className="flex items-center gap-3 glass-panel p-3.5 rounded-xl hover:border-[var(--fg)] transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--fg)]">
                  <FileDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">Patient Vault</p>
                  <p className="text-xs text-[var(--fg-muted)]">Prescriptions & diagnostic scans</p>
                </div>
              </Link>

              <Link
                href="/scan-otc"
                className="flex items-center gap-3 glass-panel p-3.5 rounded-xl hover:border-[var(--fg)] transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--fg)]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">OTC Safety Scanner</p>
                  <p className="text-xs text-[var(--fg-muted)]">Check non-prescription cold pills</p>
                </div>
              </Link>

              <Link
                href="/copilot"
                className="flex items-center gap-3 glass-panel p-3.5 rounded-xl hover:border-[var(--fg)] transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--fg)]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">Ask Sanjeevani Copilot</p>
                  <p className="text-xs text-[var(--fg-muted)]">AI prescription assistance</p>
                </div>
              </Link>

              <Link
                href="/passport"
                className="flex items-center gap-3 glass-panel p-3.5 rounded-xl hover:border-[var(--fg)] transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--fg)]">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">Health Passport QR</p>
                  <p className="text-xs text-[var(--fg-muted)]">Share records with doctors</p>
                </div>
              </Link>

              <Link
                href="/logs"
                className="flex items-center gap-3 glass-panel p-3.5 rounded-xl hover:border-[var(--fg)] transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--fg)]">
                  <History className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Activity Audit Logs</p>
                  <p className="text-xs text-[var(--fg-muted)]">View complete event history</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* A2: Explicit Skip Modal */}
      {skipModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border-2 border-[var(--border)] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[var(--fg)] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-neutral-600" />
                Skip Dose: {skipModalItem.medicine}
              </h3>
              <button
                onClick={() => setSkipModalItem(null)}
                className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--fg-muted)]">
              Explicitly recording why you missed or paused this dose helps your doctor distinguish intentional choices from lapses.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Select Reason
              </label>
              {[
                "Ran out of medicine",
                "Feeling better",
                "Doctor advised stopping",
                "Experiencing side effects / nausea",
                "Fasting / Dietary restriction",
                "Other",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    skipReason === reason
                      ? "border-[var(--fg)] bg-[var(--bg-muted)] font-bold"
                      : "border-[var(--border)] hover:bg-[var(--bg-muted)]/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="skip_reason"
                    value={reason}
                    checked={skipReason === reason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="text-[var(--fg)]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setSkipModalItem(null)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-full border border-[var(--border)] hover:border-[var(--fg)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSkip}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 shadow-sm"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
