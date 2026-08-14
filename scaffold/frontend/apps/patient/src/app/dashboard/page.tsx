"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Volume2,
  Clock,
  Camera,
  MessageCircle,
  QrCode,
  FileDown,
  FlaskConical,
  CheckCircle2,
  Sparkles,
  History,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type ScheduleItem = {
  time: string;
  medicine: string;
  condition: string;
  doctor: string;
  taken: boolean;
  prescription_item_id: string;
};

/* ── Adherence Ring (SVG stroke-only) ────────────────────────────── */
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
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--border)" strokeWidth={size > 100 ? "8" : "6"} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={strokeColor} strokeWidth={size > 100 ? "8" : "6"} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={size / 2} y={size / 2 - (size > 100 ? 4 : 2)} textAnchor="middle"
          className="fill-[var(--fg)] font-extrabold" fontSize={size > 100 ? "26" : "20"}
        >
          {score}%
        </text>
        <text
          x={size / 2} y={size / 2 + (size > 100 ? 16 : 14)} textAnchor="middle"
          className="fill-[var(--fg-muted)] font-semibold uppercase tracking-wider" fontSize={size > 100 ? "9" : "8"}
        >
          adherence
        </text>
      </svg>
    </div>
  );
}

/* ── Dose Card ───────────────────────────────────────────────────── */
function DoseCard({
  item,
  onToggle,
  onSpeak,
}: {
  item: ScheduleItem;
  onToggle: () => void;
  onSpeak: () => void;
}) {
  return (
    <div
      className={`glass-card p-5 flex items-center justify-between transition-all duration-200 ${
        item.taken
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
          : ""
      }`}
    >
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="font-bold text-base sm:text-lg text-[var(--fg)]">
            {item.medicine}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[var(--fg-muted)] bg-[var(--bg-muted)]">
            {item.condition}
          </span>
        </div>
        <p className="text-xs text-[var(--fg-muted)] font-medium">
          Prescribed by <strong className="text-[var(--fg)]">{item.doctor}</strong>
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          onClick={onSpeak}
          aria-label={`Play audio for ${item.medicine}`}
          className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-center hover:border-[var(--fg)] transition-all shadow-sm"
          title="Listen in regional voice"
        >
          <Volume2 className="w-4 h-4 text-[var(--fg-muted)]" />
        </button>
        <button
          onClick={onToggle}
          className={`min-w-[110px] px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm ${
            item.taken
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
          }`}
        >
          {item.taken ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Taken ✓
            </>
          ) : (
            "Mark Taken"
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [adherence, setAdherence] = useState(0);
  const [loaded, setLoaded] = useState(false);

  function fetchTimeline() {
    const pid = user?.id || "demo-patient";
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

  useEffect(() => {
    fetchTimeline();
  }, [user?.id]);

  const groupedSchedule = useMemo(() => {
    const groups: Record<string, ScheduleItem[]> = {};
    schedule.forEach((item) => {
      if (!groups[item.time]) groups[item.time] = [];
      groups[item.time].push(item);
    });
    return groups;
  }, [schedule]);

  function toggleDose(item: ScheduleItem) {
    const nextTaken = !item.taken;
    // Optimistic UI update
    setSchedule((prev) =>
      prev.map((s) =>
        s.prescription_item_id === item.prescription_item_id
          ? { ...s, taken: nextTaken }
          : s
      )
    );

    fetch(`${API_BASE}/intake/toggle`, {
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
      })
      .catch(() => {});
  }

  function speak(item: ScheduleItem) {
    const utterance = new SpeechSynthesisUtterance(
      `Take ${item.medicine}, at ${item.time}, for ${item.condition.toLowerCase()}, prescribed by ${item.doctor}.`
    );
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  const takenCount = schedule.filter((s) => s.taken).length;

  return (
    <div className="w-full space-y-8">
      {/* Glass Welcome Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              LIVE CLINICAL PROTOCOL · {user?.full_name ? user.full_name.toUpperCase() : "PATIENT"}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
            Daily Dosing Schedule
          </h1>
          <p className="text-sm text-[var(--fg-muted)] max-w-xl leading-relaxed">
            You have <strong className="text-[var(--fg)] font-bold">{schedule.length - takenCount} doses remaining</strong> today.
            Your verified schedule updates automatically when doctors verify new protocols.
          </p>
        </div>

        {/* Adherence Widget */}
        <div className="flex items-center gap-5 z-10 glass-panel p-4 rounded-2xl border border-[var(--border)]">
          <AdherenceRing score={adherence} size={100} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-0.5">
              Protocol Score
            </p>
            <p className="text-xl font-extrabold text-[var(--fg)]">
              {takenCount} / {schedule.length} Doses
            </p>
            <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
              {adherence >= 80 ? "Optimal Care Regimen" : "Pending Doses Today"}
            </p>
          </div>
        </div>
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
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          {loaded && schedule.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Clock className="w-10 h-10 text-[var(--fg-muted)] mx-auto mb-4" />
              <p className="text-base font-bold mb-1">No active prescriptions in schedule</p>
              <p className="text-xs text-[var(--fg-muted)] max-w-md mx-auto">
                Once an attending physician verifies your scanned care plan, your active medications will populate here automatically.
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
                      onSpeak={() => speak(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar (1 Column on Desktop) */}
        <div className="space-y-6">
          {/* Quick Action Tools */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--fg)]" />
              Patient Tools & Shortcuts
            </h3>

            <div className="space-y-3">
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
                  <p className="text-sm font-bold">Ask Sanjivini Copilot</p>
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
    </div>
  );
}
