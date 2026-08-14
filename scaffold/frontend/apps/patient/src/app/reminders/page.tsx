"use client";

import { useState } from "react";
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
} from "lucide-react";

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

const DEMO_REMINDERS: Reminder[] = [];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(DEMO_REMINDERS);

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

  const activeReminders = reminders.filter((r) => r.status !== "dismissed");
  const dismissedReminders = reminders.filter((r) => r.status === "dismissed");

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="hover:opacity-75">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              11 // Staff & System Nudges
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-[var(--fg)]" />
              Reminders Inbox
            </h1>
          </div>
        </div>

        <span className="text-xs font-mono border border-[var(--border)] px-3 py-1 text-[var(--fg-muted)]">
          {activeReminders.length} ACTIVE
        </span>
      </div>

      {/* Active Reminders */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-semibold">
          Active Staff & Care Nudges ({activeReminders.length})
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
