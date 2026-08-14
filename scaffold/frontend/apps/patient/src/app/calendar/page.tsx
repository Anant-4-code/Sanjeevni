"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  CheckCircle2,
  Volume2,
} from "lucide-react";

type DaySchedule = {
  day: number;
  dosesTotal: number;
  dosesTaken: number;
  hasReminder?: boolean;
  reminderText?: string;
  items: {
    time: string;
    medicine: string;
    condition: string;
    doctor: string;
    taken: boolean;
  }[];
};

const AUGUST_DAYS: Record<number, DaySchedule> = {};

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const currentMonth = "August 2026";
  const daysInMonth = 31;
  const startDayOffset = 5; // August 1 2026 is Saturday (offset for Mon-Sun grid)

  const dayData = AUGUST_DAYS[selectedDay] || {
    day: selectedDay,
    dosesTotal: 0,
    dosesTaken: 0,
    items: [],
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="hover:opacity-75">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              09 // Care Schedule Calendar
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Dosing & Reminders Calendar</h1>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid: Month Grid on Left, Selected Day Schedule on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols on PC): Month Calendar Grid */}
        <div className="lg:col-span-2 border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <span>{currentMonth}</span>
            </h2>

            <div className="flex items-center gap-2">
              <button aria-label="Previous month" className="p-2 border border-[var(--border)] rounded-full hover:border-[var(--fg)]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button aria-label="Next month" className="p-2 border border-[var(--border)] rounded-full hover:border-[var(--fg)]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center font-mono text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-3 pb-2 border-b border-[var(--border)]">
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
            <span>Su</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offsets */}
            {Array.from({ length: startDayOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="h-14 sm:h-20 border border-transparent opacity-0" />
            ))}

            {/* Days 1 to 31 */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected = selectedDay === dayNum;
              const isToday = dayNum === 14;
              const info = AUGUST_DAYS[dayNum];

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-14 sm:h-20 border p-2 flex flex-col justify-between items-start transition-colors rounded-sm text-left ${
                    isSelected
                      ? "border-[var(--fg)] bg-[var(--bg-muted)] shadow-sm"
                      : "border-[var(--border)] hover:border-[var(--fg)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold font-mono ${
                        isToday ? "w-6 h-6 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center" : ""
                      }`}
                    >
                      {dayNum}
                    </span>
                    {info?.hasReminder && (
                      <Bell className="w-3 h-3 text-amber-600 fill-current" />
                    )}
                  </div>

                  {/* Dot Indicator */}
                  {info && (
                    <div className="flex items-center gap-1 w-full">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          info.dosesTaken === info.dosesTotal
                            ? "bg-[var(--fg)]"
                            : info.dosesTaken > 0
                            ? "bg-amber-600"
                            : "border border-[var(--fg)]"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-[var(--fg-muted)] hidden sm:inline">
                        {info.dosesTaken}/{info.dosesTotal}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 Col on PC): Selected Day Detail */}
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">Selected Day</p>
                <h3 className="font-display text-xl font-bold">August {selectedDay}, 2026</h3>
              </div>
              <span className="text-xs font-mono border border-[var(--border)] px-2.5 py-1">
                {dayData.dosesTaken} / {dayData.dosesTotal} TAKEN
              </span>
            </div>

            {/* Reminder Alert Banner for Day if any */}
            {dayData.hasReminder && (
              <div className="border border-amber-500/40 bg-amber-50/50 p-4 mb-6 text-xs text-amber-900 rounded-sm flex items-start gap-3">
                <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] text-amber-800 mb-0.5">STAFF REMINDER</p>
                  <p className="leading-relaxed">{dayData.reminderText}</p>
                </div>
              </div>
            )}

            {/* Doses List for Selected Day */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-semibold">
                Scheduled Doses ({dayData.items.length})
              </h4>

              {dayData.items.map((item, i) => (
                <div
                  key={i}
                  className={`border p-4 flex items-center justify-between rounded-sm ${
                    item.taken ? "border-[var(--fg)] bg-[var(--bg-muted)]" : "border-[var(--border)]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-mono text-[var(--fg-muted)] mb-0.5">{item.time}</p>
                    <p className="font-bold text-sm">
                      {item.medicine}{" "}
                      <span className="text-[10px] font-mono uppercase text-[var(--fg-muted)]">[{item.condition}]</span>
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">{item.doctor}</p>
                  </div>

                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 border rounded-full ${
                      item.taken ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]" : "border-[var(--border)] text-[var(--fg-muted)]"
                    }`}
                  >
                    {item.taken ? "Taken ✓" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[var(--fg-muted)] text-center pt-6 border-t border-[var(--border)] mt-6">
            Dose completions recorded on this calendar automatically update your adherence score.
          </p>
        </div>
      </div>
    </div>
  );
}
