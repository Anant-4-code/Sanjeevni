"use client";

import { ArrowLeft, Globe, Bell, LogOut, ChevronRight, FlaskConical, FileText, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const MENU_ITEMS = [
  {
    icon: Globe,
    label: "Language Preference",
    description: "English (India) · Multi-lingual Translation Active",
    href: "#",
  },
  {
    icon: Bell,
    label: "Notifications & Alerts",
    description: "WhatsApp & SMS deep-link notifications active",
    href: "/reminders",
  },
  {
    icon: FlaskConical,
    label: "Lab Results Vault",
    description: "View plain-language lab summaries",
    href: "/labs",
  },
  {
    icon: FileText,
    label: "Health Records & Export",
    description: "Export full care history as PDF",
    href: "/records",
  },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "P";

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              10 // Preferences & Security
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Settings & Account</h1>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: User Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center text-xl font-extrabold mx-auto shadow-sm">
              {initials}
            </div>
            <div>
              <h2 className="font-bold text-lg text-[var(--fg)]">{user.full_name}</h2>
              <p className="text-xs text-[var(--fg-muted)] font-mono">{user.email}</p>
              {user.phone && <p className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">{user.phone}</p>}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-600 border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
              ● VERIFIED {user.role.toUpperCase()}
            </span>
          </div>

          <div className="glass-card p-5 space-y-2">
            <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--fg)]" />
              Privacy Status
            </h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Your health data is protected under Supabase RLS policies, append-only verification logs, and end-to-end encrypted storage.
            </p>
          </div>
        </div>

        {/* Right Column: Settings Options */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card divide-y divide-[var(--border)] overflow-hidden">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 px-6 py-5 hover:bg-[var(--bg-muted)] transition-colors group"
              >
                <item.icon className="w-5 h-5 text-[var(--fg-muted)] group-hover:text-[var(--fg)] flex-shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--fg)]">{item.label}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>

          {/* Functional Logout button */}
          <button
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 px-6 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all rounded-full shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of Account
          </button>

          <p className="text-[11px] text-[var(--fg-muted)] text-center font-mono">
            Sanjeevani Health Portal v1.0.0 · Build 2026
          </p>
        </div>
      </div>
    </div>
  );
}
