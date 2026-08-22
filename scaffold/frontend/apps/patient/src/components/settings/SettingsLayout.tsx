"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  Bell,
  Globe,
  Sparkles,
  Award,
  Clock,
  Heart,
  Database,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth, UserRole } from "@/context/AuthContext";

export interface SettingsTab {
  id: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const ALL_TABS: SettingsTab[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "ai_features", label: "AI Features", icon: Sparkles },
  { id: "credentials", label: "Doctor Credentials", icon: Award, roles: ["doctor"] },
  { id: "care_team", label: "Care Team & Specialists", icon: Heart, roles: ["patient"] },
  { id: "availability", label: "Working Hours", icon: Clock, roles: ["doctor", "receptionist", "pharmacist", "lab_tech"] },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "language", label: "Language", icon: Globe },
  { id: "security", label: "Password & Security", icon: Shield },
  { id: "data_privacy", label: "Data & Privacy", icon: Database },
];

export interface SettingsLayoutProps {
  children: (activeTab: string) => React.ReactNode;
  defaultTab?: string;
  saveMessage?: string;
}

export function SettingsLayout({ children, defaultTab = "profile", saveMessage }: SettingsLayoutProps) {
  const { user } = useAuth();
  const currentRole = user?.role || "patient";

  const visibleTabs = ALL_TABS.filter((tab) => {
    if (!tab.roles) return true;
    return tab.roles.includes(currentRole as UserRole);
  });

  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between border border-[var(--border)] rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href={
              currentRole === "doctor"
                ? "/doctor"
                : currentRole === "receptionist"
                ? "/reception"
                : currentRole === "pharmacist"
                ? "/pharmacy"
                : currentRole === "lab_tech"
                ? "/lab"
                : "/dashboard"
            }
            aria-label="Back to Portal"
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              SETTINGS // {currentRole.toUpperCase()} CONSOLE
            </p>
            <h1 className="font-display text-2xl font-bold">Preferences &amp; Account</h1>
          </div>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveMessage && (
        <div className="fixed top-6 right-6 z-50 glass-card px-5 py-3 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xl animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Nav + Right Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Nav Bar */}
        <div className="md:col-span-1 space-y-1">
          <div className="glass-card p-2 border border-[var(--border)] rounded-2xl space-y-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? "bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs"
                      : "text-[#64748B] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-[#0F172A] dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Section */}
        <div className="md:col-span-3">
          {children(activeTab)}
        </div>
      </div>
    </div>
  );
}
