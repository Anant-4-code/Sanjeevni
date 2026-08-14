"use client";

import { useState, useRef } from "react";
import {
  ArrowLeft,
  Globe,
  Bell,
  LogOut,
  ChevronRight,
  FlaskConical,
  FileText,
  Shield,
  Camera,
  UserCheck,
  Stethoscope,
  Phone,
  Clock,
  Building2,
  CheckCircle2,
  X,
  Upload,
  UserPlus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, AVAILABLE_DOCTORS, DoctorInfo } from "@/context/AuthContext";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
];

const MENU_ITEMS = [
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
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const currentDoctor = user?.primary_doctor || AVAILABLE_DOCTORS[0];

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

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        updateProfile({ avatar_url: ev.target.result as string });
        setAvatarModalOpen(false);
        triggerSuccessToast("Profile photo updated successfully!");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSelectPresetAvatar(url: string) {
    updateProfile({ avatar_url: url });
    setAvatarModalOpen(false);
    triggerSuccessToast("Avatar selected successfully!");
  }

  function handleRemoveAvatar() {
    updateProfile({ avatar_url: "" });
    setAvatarModalOpen(false);
    triggerSuccessToast("Profile photo removed.");
  }

  function handleSelectDoctor(doc: DoctorInfo) {
    updateProfile({ primary_doctor: doc });
    setDoctorModalOpen(false);
    triggerSuccessToast(`Primary doctor assigned to ${doc.name}!`);
  }

  function triggerSuccessToast(msg: string) {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg("");
    }, 3000);
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              Settings // Profile & Primary Care Team
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Settings & Account</h1>
          </div>
        </div>
      </div>

      {/* Floating Success Toast */}
      {saveSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 glass-card px-5 py-3 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: User Profile Card & Photo Manager */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 text-center space-y-4 relative">
            {/* Avatar container with hover camera icon */}
            <div className="relative inline-block mx-auto group">
              <div className="w-24 h-24 rounded-full bg-[var(--bg-muted)] border-2 border-[var(--border)] overflow-hidden flex items-center justify-center text-2xl font-extrabold shadow-md">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[var(--fg)]">{initials}</span>
                )}
              </div>

              <button
                onClick={() => setAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 p-2 bg-[var(--fg)] text-[var(--bg)] rounded-full shadow-md hover:scale-105 transition-transform"
                title="Change Profile Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="font-bold text-lg text-[var(--fg)]">{user?.full_name || "Patient"}</h2>
              <p className="text-xs text-[var(--fg-muted)] font-mono">{user?.email || "patient@sanjeevani.health"}</p>
              {user?.phone && <p className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">{user.phone}</p>}
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-600 border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                ● VERIFIED {user?.role ? user.role.toUpperCase() : "PATIENT"}
              </span>
            </div>

            <button
              onClick={() => setAvatarModalOpen(true)}
              className="w-full py-2 px-3 border border-[var(--border)] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-muted)] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" /> Edit Profile Avatar
            </button>
          </div>

          <div className="glass-card p-5 space-y-2">
            <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--fg)]" />
              Privacy & Encryption Status
            </h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Your health data is protected under Supabase RLS policies, immutable audit logs, and encrypted vault storage.
            </p>
          </div>
        </div>

        {/* Right Column: Primary Doctor Assignment & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* PRIMARY DOCTOR & CARE TEAM SECTION */}
          <div className="glass-card p-6 space-y-5 border-2 border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Assigned Primary Doctor</h3>
                  <p className="text-xs text-[var(--fg-muted)]">Your lead clinician for consultations & prescription sign-offs</p>
                </div>
              </div>

              <button
                onClick={() => setDoctorModalOpen(true)}
                className="px-4 py-2 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-opacity self-start shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" /> Change Doctor →
              </button>
            </div>

            {/* Current Doctor Card */}
            <div className="glass-panel p-5 rounded-2xl border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[var(--border)] flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                  {currentDoctor.avatar_url ? (
                    <img
                      src={currentDoctor.avatar_url}
                      alt={currentDoctor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                      {currentDoctor.name.slice(4, 6)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-[var(--fg)]">{currentDoctor.name}</h4>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      Active Lead
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--fg-muted)]">{currentDoctor.specialty}</p>
                  <p className="text-xs text-[var(--fg-muted)] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> {currentDoctor.hospital}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--fg-muted)] sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
                {currentDoctor.phone && (
                  <p className="flex items-center sm:justify-end gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5" /> {currentDoctor.phone}
                  </p>
                )}
                {currentDoctor.available_hours && (
                  <p className="flex items-center sm:justify-end gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5" /> {currentDoctor.available_hours}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Settings Navigation Menu */}
          <div className="glass-card divide-y divide-[var(--border)] overflow-hidden">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-muted)] transition-colors group"
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

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 px-6 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all rounded-full shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of Account
          </button>
        </div>
      </div>

      {/* AVATAR / PHOTO MANAGER MODAL */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative shadow-2xl space-y-6">
            <button
              onClick={() => setAvatarModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--fg-muted)] hover:text-[var(--fg)] p-1.5 rounded-full border border-[var(--border)]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center">
                <Camera className="w-5 h-5 text-[var(--fg)]" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Edit Profile Photo</h3>
                <p className="text-xs text-[var(--fg-muted)]">Upload custom photo or select a preset avatar</p>
              </div>
            </div>

            {/* Upload Custom Photo Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
            >
              <Upload className="w-4 h-4" /> Upload Photo from Device
            </button>

            {/* Preset Avatars Selection */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold block">
                Or Select Preset Medical Avatar:
              </label>
              <div className="flex items-center justify-center gap-3">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPresetAvatar(url)}
                    className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--border)] hover:border-[var(--fg)] hover:scale-110 transition-all shadow-sm"
                  >
                    <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {user?.avatar_url && (
              <button
                onClick={handleRemoveAvatar}
                className="w-full py-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline text-center block pt-2"
              >
                Remove Photo & Use Initials
              </button>
            )}
          </div>
        </div>
      )}

      {/* PRIMARY DOCTOR ASSIGNMENT MODAL */}
      {doctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 sm:p-8 relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDoctorModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--fg-muted)] hover:text-[var(--fg)] p-1.5 rounded-full border border-[var(--border)]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Assign Primary Doctor</h3>
                <p className="text-xs text-[var(--fg-muted)]">Choose your lead physician for direct care coordination</p>
              </div>
            </div>

            <div className="space-y-3">
              {AVAILABLE_DOCTORS.map((doc) => {
                const isSelected = currentDoctor.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`glass-panel p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-md"
                        : "border-[var(--border)] hover:border-[var(--fg)]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                        {doc.avatar_url ? (
                          <img src={doc.avatar_url} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                            {doc.name.slice(4, 6)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[var(--fg)]">{doc.name}</h4>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--fg-muted)] font-medium">{doc.specialty}</p>
                        <p className="text-[11px] text-[var(--fg-muted)]">{doc.hospital}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectDoctor(doc)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                        isSelected
                          ? "bg-emerald-600 text-white cursor-default"
                          : "bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
                      }`}
                    >
                      {isSelected ? "Assigned" : "Assign →"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
