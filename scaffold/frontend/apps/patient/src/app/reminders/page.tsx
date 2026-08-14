"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Stethoscope,
  Building,
  Bot,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Download,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Reminder = {
  id: string;
  senderName: string;
  senderRole: "doctor" | "reception" | "system";
  title: string;
  message: string;
  remindAt: string;
  channel: string[];
  status: "pending" | "snoozed" | "dismissed";
  relatedRxId?: string;
};

type ScheduleItem = {
  prescription_item_id: string;
  medicine: string;
  condition: string;
  doctor: string;
  time: string;
  taken: boolean;
  criticality_tier?: "routine" | "important" | "critical";
  start_date?: string;
  duration_days?: number;
};

const DEMO_STAFF_REMINDERS: Reminder[] = [
  {
    id: "rem-1",
    senderName: "Dr. Nitin Sharma",
    senderRole: "doctor",
    title: "Post-Antibiotic Follow-Up Lab Order",
    message: "Please complete your follow-up CBC & ESR blood tests before next Thursday's review.",
    remindAt: "Tomorrow, 09:00 AM",
    channel: ["push", "sms"],
    status: "pending",
  },
  {
    id: "rem-2",
    senderName: "Manikanta Diagnostic Desk",
    senderRole: "reception",
    title: "MRI Lumbar Spine Film Collection",
    message: "Your printed MRI report plates and digital CD are ready for pickup at Reception Counter 4.",
    remindAt: "Today, 04:00 PM",
    channel: ["sms"],
    status: "pending",
  },
];

export default function RemindersPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>(DEMO_STAFF_REMINDERS);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    const pid = user?.id || "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/timeline`)
      .then((r) => r.json())
      .then((d) => setSchedule(d.schedule || []))
      .catch(() => {});
  }, [user?.id]);

  function handleDismiss(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r))
    );
  }

  function handleSnooze(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "snoozed" } : r))
    );
  }

  // A4: Generate Rich .ICS Calendar File
  function downloadRichCalendarEvent(title: string, notes: string, doctor: string, location: string) {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sanjeevani AI Health Protocol//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${title} — ${doctor}`,
      `DESCRIPTION:${notes}`,
      `LOCATION:${location}`,
      `DTSTART:${new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTEND:${new Date(Date.now() + 90000000).toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder: Medical appointment / diagnostic test tomorrow",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title.replace(/\s+/g, "_")}_Reminder.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const activeReminders = reminders.filter((r) => r.status !== "dismissed");
  const dismissedReminders = reminders.filter((r) => r.status === "dismissed");

  const criticalMeds = schedule.filter((s) => s.criticality_tier === "critical");
  const importantMeds = schedule.filter((s) => s.criticality_tier === "important" || !s.criticality_tier);
  const routineMeds = schedule.filter((s) => s.criticality_tier === "routine");

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="hover:opacity-75">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              11 // Reminders & Criticality-Tiered Escalation
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-[var(--fg)]" />
              Reminders & Care Escalation Hub
            </h1>
          </div>
        </div>

        <span className="text-xs font-mono border border-[var(--border)] px-3 py-1 text-[var(--fg-muted)]">
          {activeReminders.length + schedule.length} ACTIVE ITEMS
        </span>
      </div>

      {/* A1 & A3: Criticality-Tiered Escalation Matrix */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Prescription Criticality Tiers & Escalation Protocol
            </h2>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              Urgency ladders adapt based on drug class (anticoagulants/cardiac vs. antibiotics vs. supplements).
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">
            Tier-Adaptive
          </span>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Critical Tier */}
          <div className="p-4 rounded-xl border-2 border-red-300 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Critical Tier ({criticalMeds.length})
              </span>
            </div>
            <p className="text-xs font-bold text-red-950 dark:text-red-200">
              Anticoagulants, Insulin, Cardiac Meds
            </p>
            <div className="text-[10px] font-mono text-[var(--fg-muted)] space-y-1 pt-1 border-t border-red-200 dark:border-red-900/60">
              <p>+0m: Immediate Push</p>
              <p>+15m: Rapid Re-ping</p>
              <p>+45m: In-App Banner & Caregiver Alert</p>
            </div>
            {criticalMeds.map((m) => (
              <div key={m.prescription_item_id} className="text-xs font-semibold text-[var(--fg)] bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-red-200">
                {m.medicine} ({m.time})
              </div>
            ))}
          </div>

          {/* Important Tier */}
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
                Important Tier ({importantMeds.length})
              </span>
            </div>
            <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
              Antibiotics, Pain Management, Gastro
            </p>
            <div className="text-[10px] font-mono text-[var(--fg-muted)] space-y-1 pt-1 border-t border-amber-200 dark:border-amber-900/60">
              <p>+0m: Scheduled Push</p>
              <p>+30m: Gentle Re-ping</p>
              <p>+2h: Persistent Banner & Caregiver Alert</p>
            </div>
            {importantMeds.map((m) => (
              <div key={m.prescription_item_id} className="text-xs font-semibold text-[var(--fg)] bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-amber-200">
                {m.medicine} ({m.time})
              </div>
            ))}
          </div>

          {/* Routine Tier */}
          <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-500 text-white">
                Routine Tier ({routineMeds.length})
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Vitamins, Supplements, Probiotics
            </p>
            <div className="text-[10px] font-mono text-[var(--fg-muted)] space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
              <p>+0m: Scheduled Push</p>
              <p>+2h: Gentle Re-ping</p>
              <p>+6h: Quiet Activity Log Entry</p>
            </div>
            {routineMeds.map((m) => (
              <div key={m.prescription_item_id} className="text-xs font-semibold text-[var(--fg)] bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-slate-200">
                {m.medicine} ({m.time})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* A4: Rich Diagnostic & Appointment Calendar Downloads */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Upcoming Lab & Specialist Reminders (.ics Export)
          </h2>
          <span className="text-[10px] font-mono text-[var(--fg-muted)]">Apple Calendar · Google · Outlook</span>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--fg)]">CBC Follow-Up & Fasting Glucose</p>
              <p className="text-xs text-[var(--fg-muted)]">
                Ordered by <strong>Dr. Nitin Sharma</strong> · Fast 8 hours prior to blood draw.
              </p>
            </div>
            <button
              onClick={() =>
                downloadRichCalendarEvent(
                  "CBC Follow-Up & Fasting Glucose",
                  "Ordered following clinical consultation. Please fast for 8 hours before the blood draw.",
                  "Dr. Nitin Sharma",
                  "Metropolis Healthcare Laboratory, OPD Block"
                )
              }
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Export .ics Event
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--fg)]">Cardiology Consultation & Lipid Review</p>
              <p className="text-xs text-[var(--fg-muted)]">
                With <strong>Dr. Rajesh Kulkarni (Cardiology)</strong> · Bring previous ECG and prescription notes.
              </p>
            </div>
            <button
              onClick={() =>
                downloadRichCalendarEvent(
                  "Cardiology Consultation & Lipid Review",
                  "Scheduled follow-up for cardiac medication tolerance. Bring past ECG reports.",
                  "Dr. Rajesh Kulkarni",
                  "Apollo Heart Institute, Room 302"
                )
              }
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Export .ics Event
            </button>
          </div>
        </div>
      </div>

      {/* Active Staff & Care Reminders */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-semibold">
          Staff & Clinic Care Nudges ({activeReminders.length})
        </h2>

        {activeReminders.map((rem) => (
          <div
            key={rem.id}
            className={`border bg-[var(--bg-elevated)] p-6 transition-colors rounded-sm ${
              rem.status === "snoozed"
                ? "border-[var(--border)] opacity-75"
                : "border-[var(--border)] hover:border-[var(--fg)]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                  {rem.senderRole === "doctor" ? (
                    <Stethoscope className="w-4 h-4 text-[var(--fg)]" />
                  ) : rem.senderRole === "reception" ? (
                    <Building className="w-4 h-4 text-[var(--fg)]" />
                  ) : (
                    <Bot className="w-4 h-4 text-[var(--fg)]" />
                  )}
                </span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">{rem.title}</h3>
                  <p className="text-xs text-[var(--fg-muted)] font-medium">
                    Sent by <strong className="text-[var(--fg)]">{rem.senderName}</strong> · {rem.remindAt}
                  </p>
                </div>
              </div>

              {rem.status === "snoozed" && (
                <span className="text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] px-2.5 py-1 text-[var(--fg-muted)] self-start sm:self-center">
                  SNOOZED FOR 24H
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed mb-4 pl-10">
              {rem.message}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                {rem.relatedRxId && (
                  <Link
                    href={`/vault/prescription/${rem.relatedRxId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--fg)] hover:underline"
                  >
                    View Related Prescription <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSnooze(rem.id)}
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-[var(--border)] rounded-full hover:border-[var(--fg)] transition-colors"
                >
                  Snooze
                </button>
                <button
                  onClick={() => handleDismiss(rem.id)}
                  className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[var(--fg)] text-[var(--bg)] rounded-full hover:opacity-90 transition-opacity"
                >
                  Dismiss ✓
                </button>
              </div>
            </div>
          </div>
        ))}

        {activeReminders.length === 0 && (
          <div className="border border-dashed border-[var(--border)] p-12 text-center bg-[var(--bg-elevated)]">
            <CheckCircle2 className="w-8 h-8 text-[var(--safe)] mx-auto mb-2" />
            <p className="text-sm text-[var(--fg-muted)]">All staff reminders cleared.</p>
          </div>
        )}
      </div>

      {/* Dismissed Section */}
      {dismissedReminders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-semibold">
            Dismissed Reminders ({dismissedReminders.length})
          </h2>

          {dismissedReminders.map((rem) => (
            <div
              key={rem.id}
              className="border border-[var(--border)] bg-[var(--bg-muted)] p-4 flex items-center justify-between opacity-60 rounded-sm"
            >
              <div>
                <p className="font-bold text-xs">{rem.title}</p>
                <p className="text-[11px] text-[var(--fg-muted)]">From {rem.senderName} · {rem.remindAt}</p>
              </div>
              <span className="text-[10px] font-mono uppercase border border-[var(--border)] px-2 py-0.5">
                DISMISSED
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
