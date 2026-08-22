"use client";

import React from "react";
import { User, Phone, Building2, Award, Stethoscope, ShieldCheck } from "lucide-react";

export interface ProfileCardProps {
  variant: "full" | "compact" | "header";
  user: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    avatar_url?: string;
    age?: number;
    gender?: string;
    specialty?: string;
    hospital?: string;
    license_number?: string;
    qualifications?: string;
    token_number?: number;
    registered_at?: string;
    is_lead?: boolean;
  };
  onEditAvatar?: () => void;
  actionButton?: React.ReactNode;
}

export function ProfileCard({ variant, user, onEditAvatar, actionButton }: ProfileCardProps) {
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // 1. FULL VARIANT: Used in Settings Page and Owner Profile View
  if (variant === "full") {
    return (
      <div className="glass-card p-6 text-center space-y-4 relative border border-[var(--border)] rounded-2xl shadow-xs">
        <div className="relative inline-block mx-auto group">
          <div className="w-24 h-24 rounded-full bg-[var(--bg-muted)] border-2 border-[var(--border)] overflow-hidden flex items-center justify-center text-2xl font-extrabold shadow-md">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name || "User"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[var(--fg)]">{initials}</span>
            )}
          </div>
          {onEditAvatar && (
            <button
              onClick={onEditAvatar}
              className="absolute bottom-0 right-0 p-2 bg-[var(--fg)] text-[var(--bg)] rounded-full shadow-md hover:scale-105 transition-transform"
              title="Change Profile Photo"
            >
              <User className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <h2 className="font-bold text-lg text-[var(--fg)]">{user?.full_name || "User"}</h2>
          <p className="text-xs text-[var(--fg-muted)] font-mono">{user?.email || "user@sanjeevani.health"}</p>
          {user?.phone && <p className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">{user.phone}</p>}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-600 border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
            ● VERIFIED {user?.role ? user.role.toUpperCase() : "PATIENT"}
          </span>
        </div>

        {actionButton}
      </div>
    );
  }

  // 2. COMPACT VARIANT: Used in Care Team & Specialist Cards
  if (variant === "compact") {
    return (
      <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        user?.is_lead
          ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-xs"
          : "border-[var(--border)] bg-white dark:bg-[#111827] hover:border-gray-400"
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name || "Doctor"} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-sm text-[var(--fg)]">{user?.full_name}</h4>
              {user?.specialty && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {user.specialty}
                </span>
              )}
              {user?.is_lead && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  ⭐ Primary Lead
                </span>
              )}
            </div>
            {user?.qualifications && (
              <p className="text-xs text-[var(--fg-muted)] font-medium">{user.qualifications}</p>
            )}
            {user?.hospital && (
              <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {user.hospital}
              </p>
            )}
            {user?.phone && (
              <p className="text-[10px] font-mono text-[var(--fg-muted)] flex items-center gap-1 pt-0.5">
                <Phone className="w-3 h-3" /> {user.phone}
              </p>
            )}
          </div>
        </div>

        {actionButton && <div className="flex items-center gap-2 w-full sm:w-auto justify-end">{actionButton}</div>}
      </div>
    );
  }

  // 3. HEADER VARIANT: Used at the top of Doctor Patient Tabs
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-white">
              {user?.full_name || "Patient Record"}
            </h3>
            {user?.token_number && (
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                TOKEN #{user.token_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
            <span>{user?.age ? `${user.age}y` : ""} {user?.gender ? `• ${user.gender}` : ""}</span>
            {user?.id && <span>• ID: {user.id}</span>}
          </div>
        </div>
      </div>

      {actionButton && <div className="flex items-center gap-2">{actionButton}</div>}
    </div>
  );
}
