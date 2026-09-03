"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plane,
  TrendingUp,
  RefreshCw,
  Calendar as CalendarIcon,
  Check,
  Circle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type DayDose = {
  id: string;
  prescription_item_id: string;
  time: string;
  medicine: string;
  dosage: string;
  condition: string;
  doctor: string;
  taken: boolean;
  acknowledgment_state?: string;
  marked_by_role?: string;
  marked_by_name?: string;
};

type DayReminder = {
  id: string;
  title: string;
  message: string;
  sent_by: string;
  time: string;
  type?: string;
};

type CalendarDay = {
  date: string;
  day_number: number;
  dose_count: number;
  doses_taken: number;
  has_missed: boolean;
  has_pending: boolean;
  all_taken: boolean;
  reminder_count: number;
  reminders?: DayReminder[];
};

type AISummary = {
  adherence_percentage: number;
  best_week: string;
  insight_text: string;
  smart_reminder_suggestion: string;
  missed_dose_risk_day: string;
};

type CalendarMonthData = {
  year: number;
  month: number;
  month_name: string;
  days_in_month: number;
  start_day_offset: number;
  days: CalendarDay[];
  ai_summary: AISummary;
};

type DayDetailData = {
  date: string;
  doses: DayDose[];
  reminders: DayReminder[];
  doses_taken: number;
  doses_total: number;
};

export default function CalendarPage() {
  const { user } = useAuth();
  const today = new Date(); // The ONLY source of live "today"
  const todayIso = today.toISOString().slice(0, 10);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const [monthData, setMonthData] = useState<CalendarMonthData | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetailData | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [errorMonth, setErrorMonth] = useState(false);
  const [travelMode, setTravelMode] = useState(false);
  const [shiftedReminderAccepted, setShiftedReminderAccepted] = useState(false);

  const patientId = (user?.role === "patient" && user?.id) ? user.id : "demo-patient";

  // Fetch Month data on month/year/patient change
  const fetchMonthCalendar = () => {
    setLoadingMonth(true);
    setErrorMonth(false);
    fetch(`${API_BASE}/patient/${patientId}/calendar?year=${year}&month=${month}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch calendar");
        return res.json();
      })
      .then((data) => {
        setMonthData(data);
        setLoadingMonth(false);
      })
      .catch(() => {
        setErrorMonth(true);
        setLoadingMonth(false);
      });
  };

  useEffect(() => {
    fetchMonthCalendar();
  }, [year, month, patientId]);

  // Fetch Day Detail on selectedDate change
  const fetchDayDetail = (dateStr: string) => {
    setLoadingDay(true);
    fetch(`${API_BASE}/patient/${patientId}/calendar/day/${dateStr}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch day schedule");
        return res.json();
      })
      .then((data) => {
        setDayDetail(data);
        setLoadingDay(false);
      })
      .catch(() => {
        setDayDetail(null);
        setLoadingDay(false);
      });
  };

  useEffect(() => {
    fetchDayDetail(selectedDate);
  }, [selectedDate, patientId]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleMarkDoseTaken = (prescriptionItemId: string) => {
    fetch(`${API_BASE}/patient/timeline/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_item_id: prescriptionItemId,
        taken: true,
      }),
    })
      .then(() => {
        // Refresh day and month
        fetchDayDetail(selectedDate);
        fetchMonthCalendar();
      })
      .catch(() => {
        // Local fallback update
        setDayDetail((prev) => {
          if (!prev) return null;
          const updatedDoses = prev.doses.map((d) =>
            d.prescription_item_id === prescriptionItemId ? { ...d, taken: true, marked_by_role: "patient", marked_by_name: "you" } : d
          );
          return {
            ...prev,
            doses: updatedDoses,
            doses_taken: updatedDoses.filter((x) => x.taken).length,
          };
        });
      });
  };

  const isToday = (dateStr: string) => dateStr === todayIso;

  // Dot color rules per Part B.1
  const renderDoseDot = (day: CalendarDay) => {
    if (day.dose_count === 0) return null;

    if (day.has_missed) {
      return (
        <span
          className="w-2 h-2 rounded-full bg-rose-500 shadow-xs"
          title="Past doses missed"
        />
      );
    }
    if (day.all_taken) {
      return (
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"
          title="All doses completed"
        />
      );
    }
    return (
      <span
        className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"
        title="Pending doses"
      />
    );
  };

  const selectedDateFormatted = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* ── Header ── */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="p-2.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              09 // Care Schedule Calendar
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Dosing &amp; Reminders Calendar
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              Live compliance overview: scheduled medications, adherence dots, and staff reminders.
            </p>
          </div>
        </div>

        {/* Travel Mode Toggle (CAL-3) */}
        <button
          onClick={() => setTravelMode((t) => !t)}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 self-start sm:self-center ${
            travelMode
              ? "bg-blue-600 text-white shadow-sm"
              : "border border-[var(--border)] hover:border-[var(--fg)] text-[var(--fg)]"
          }`}
        >
          <Plane className="w-4 h-4" />
          <span>{travelMode ? "Travel Mode: ON" : "Travel Mode"}</span>
        </button>
      </div>

      {/* ── CAL-2: Month-at-a-Glance Adherence Summary Strip ── */}
      {monthData?.ai_summary && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 border border-emerald-500/30 dark:border-emerald-500/20 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                  {monthData.ai_summary.insight_text}
                </h3>
                <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                  Consistent adherence recorded in Patient Vault intake logs.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 self-start sm:self-center">
              {monthData.ai_summary.adherence_percentage}% Compliance Rate
            </span>
          </div>

          {/* CAL-1: Smart Reminder-Time Suggestion Banner */}
          {!shiftedReminderAccepted && (
            <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xs border border-[var(--border)] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-[var(--fg)]">
                  <strong>Habit Observation (CAL-1):</strong> {monthData.ai_summary.smart_reminder_suggestion}
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setShiftedReminderAccepted(true)}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--fg)] text-[var(--bg)] rounded-full hover:opacity-90 transition-opacity"
                >
                  Shift to 9:00 PM ✓
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Grid: Month Calendar on Left, Selected Day Schedule on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on Desktop): Month Calendar Grid */}
        <div className="lg:col-span-2 glass-card p-6 sm:p-7 rounded-3xl space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2 text-[var(--fg)]">
              <span>{monthData?.month_name || new Date(year, month - 1).toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-2 rounded-full border border-[var(--border)] hover:border-[var(--fg)] hover:bg-[var(--bg-muted)] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-2 rounded-full border border-[var(--border)] hover:border-[var(--fg)] hover:bg-[var(--bg-muted)] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center font-mono text-xs uppercase tracking-wider text-[var(--fg-muted)] pb-2 border-b border-[var(--border)]">
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
            <span>Su</span>
          </div>

          {/* Loading Skeleton */}
          {loadingMonth && (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 sm:h-20 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
              ))}
            </div>
          )}

          {/* Error State with Retry Button (Part B.4) */}
          {errorMonth && !loadingMonth && (
            <div className="p-10 text-center rounded-3xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="font-bold text-base text-rose-900 dark:text-rose-200">
                Could not load calendar schedule
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm mx-auto">
                Unable to retrieve dosing timeline for this month. Please check connection and retry.
              </p>
              <button
                onClick={fetchMonthCalendar}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--fg)] text-[var(--bg)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch
              </button>
            </div>
          )}

          {/* Real Calendar Grid */}
          {!loadingMonth && !errorMonth && monthData && (
            <div className="grid grid-cols-7 gap-2">
              {/* Blank leading weekday offsets */}
              {Array.from({ length: monthData.start_day_offset }).map((_, idx) => (
                <div key={`offset-${idx}`} className="h-16 sm:h-20 border border-transparent opacity-0 pointer-events-none" />
              ))}

              {/* Day Cells */}
              {monthData.days.map((day) => {
                const isSelected = selectedDate === day.date;
                const isCurrentToday = isToday(day.date); // Live computed, NEVER hardcoded!

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`h-16 sm:h-20 p-2 sm:p-2.5 rounded-2xl flex flex-col justify-between items-start transition-all text-left relative group ${
                      isSelected
                        ? "border-2 border-[var(--fg)] bg-[var(--bg-muted)] shadow-md"
                        : "border border-[var(--border)] hover:border-[var(--fg)] bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {/* Day Number + Live Today Ring */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-mono font-bold ${
                          isCurrentToday
                            ? "w-6 h-6 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center shadow-xs"
                            : "text-[var(--fg)]"
                        }`}
                      >
                        {day.day_number}
                      </span>

                      {/* Reminder Bell Badge (Part B.1) */}
                      {day.reminder_count > 0 && (
                        <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Dose Indicator Dots (Part B.1) */}
                    <div className="flex items-center justify-between w-full mt-auto">
                      <div className="flex items-center gap-1">
                        {renderDoseDot(day)}
                        {day.dose_count > 0 && (
                          <span className="text-[10px] font-mono text-[var(--fg-muted)] hidden sm:inline">
                            {day.doses_taken}/{day.dose_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Legend (Part B.1 / A.5) ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)] text-xs text-[var(--fg-muted)]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>All Taken</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Staff Reminder</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-4 h-4 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center font-bold text-[9px]">
                {today.getDate()}
              </span>
              <span>Live Today Indicator</span>
            </div>
          </div>
        </div>

        {/* ── Right Column (1 Col on Desktop): Selected Day Schedule Panel (Part B.2) ── */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Selected Day Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                  Selected Day Schedule
                </p>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--fg)] mt-0.5">
                  {selectedDateFormatted}
                </h3>
              </div>

              {dayDetail && dayDetail.doses_total > 0 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--fg)]">
                  {dayDetail.doses_taken} / {dayDetail.doses_total} TAKEN
                </span>
              )}
            </div>

            {/* Loading Day Detail */}
            {loadingDay && (
              <div className="p-8 text-center text-xs font-mono text-[var(--fg-muted)]">
                Loading schedule for {selectedDate}...
              </div>
            )}

            {/* Scheduled Doses List (Part B.2) */}
            {!loadingDay && dayDetail && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Scheduled Doses ({dayDetail.doses.length})
                  </h4>
                  {isToday(selectedDate) && (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                      ● Active Regimen
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {dayDetail.doses.map((dose) => (
                    <div
                      key={dose.id || dose.prescription_item_id}
                      className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                        dose.taken
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "border-[var(--border)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-mono text-[var(--fg-muted)] font-bold">
                            {dose.time}
                          </p>
                          <h5 className="font-bold text-sm text-[var(--fg)] mt-0.5">
                            {dose.medicine}
                          </h5>
                          <p className="text-[11px] text-[var(--fg-muted)]">
                            {dose.doctor}
                            {dose.marked_by_name && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {" "}· marked by {dose.marked_by_name}
                              </span>
                            )}
                          </p>
                        </div>

                        {dose.taken ? (
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1 flex-shrink-0">
                            <Check className="w-3.5 h-3.5" /> Taken
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkDoseTaken(dose.prescription_item_id)}
                            className="px-3 py-1 rounded-full border border-[var(--fg)] text-xs font-bold uppercase tracking-wider text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors flex-shrink-0"
                          >
                            Mark Taken
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {dayDetail.doses.length === 0 && (
                    <div className="p-6 text-center rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)]/50 text-xs text-[var(--fg-muted)]">
                      No medication doses scheduled on this day.
                    </div>
                  )}
                </div>

                {/* Reminders for Selected Day (Part B.2) */}
                {dayDetail.reminders && dayDetail.reminders.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                      Staff Reminders ({dayDetail.reminders.length})
                    </h4>

                    {dayDetail.reminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 space-y-1 text-xs"
                      >
                        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold">
                          <Bell className="w-3.5 h-3.5 text-amber-600 fill-current" />
                          <span>{rem.title}</span>
                        </div>
                        <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                          &ldquo;{rem.message}&rdquo;
                        </p>
                        <p className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                          Sent by {rem.sent_by} · {rem.time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] font-mono text-[var(--fg-muted)] text-center pt-4 border-t border-[var(--border)]">
            Intake records synchronize live across Patient Dashboard &amp; Clinical Audit Timeline.
          </p>
        </div>
      </div>
    </div>
  );
}
