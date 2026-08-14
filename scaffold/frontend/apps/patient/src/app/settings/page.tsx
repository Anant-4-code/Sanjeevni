"use client";

import { useState, useRef, useEffect } from "react";
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
  AlertTriangle,
  AlertOctagon,
  Plus,
  Trash2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AVAILABLE_DOCTORS, DoctorInfo } from "@/constants/doctors";

const FALLBACK_DOCTOR: DoctorInfo = {
  id: "doc-1",
  name: "Dr. G. Mithun",
  specialty: "Consultant Neuro Surgeon",
  category: "Neurosurgery",
  hospital: "Manikanta Neuro Centre, Kakaji Colony",
  phone: "+91 99899 85777",
  available_hours: "Mon - Sat: 10:00 AM - 02:00 PM, 06:00 PM - 09:00 PM",
  avatar_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&q=80",
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type AllergyItem = {
  id: string;
  substance: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
  reported_by: "patient" | "doctor";
  doctor_confirmed: boolean;
  created_at?: string;
};

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
  const [selectedSpecialtyTab, setSelectedSpecialtyTab] = useState("All");

  // §5 Allergy Profile State
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [newSubstance, setNewSubstance] = useState("");
  const [newReaction, setNewReaction] = useState("");
  const [newSeverity, setNewSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [allergyLoading, setAllergyLoading] = useState(false);

  const currentDoctor = user?.primary_doctor || (AVAILABLE_DOCTORS && AVAILABLE_DOCTORS[0]) || FALLBACK_DOCTOR;
  const activeCareTeam = user?.care_team && user.care_team.length > 0 ? user.care_team : [currentDoctor];

  const fetchAllergies = async () => {
    try {
      const pid = user?.id || "demo-patient";
      const res = await fetch(`${API_BASE}/patient/${pid}/allergies`);
      const data = await res.json();
      if (data.allergies) {
        setAllergies(data.allergies);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAllergies();
  }, [user?.id]);

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

  function handleSetLeadDoctor(doc: DoctorInfo) {
    const isAlreadyInTeam = activeCareTeam.some((d) => d.id === doc.id);
    const nextTeam = isAlreadyInTeam ? activeCareTeam : [...activeCareTeam, doc];
    updateProfile({ primary_doctor: doc, care_team: nextTeam });
    triggerSuccessToast(`${doc.name} assigned as Lead Primary Doctor!`);
  }

  function handleToggleCareTeamDoctor(doc: DoctorInfo) {
    const isAlreadyInTeam = activeCareTeam.some((d) => d.id === doc.id);
    if (isAlreadyInTeam) {
      if (activeCareTeam.length <= 1) {
        triggerSuccessToast("You must maintain at least one specialist in your Care Team.");
        return;
      }
      const nextTeam = activeCareTeam.filter((d) => d.id !== doc.id);
      const nextPrimary = currentDoctor.id === doc.id ? nextTeam[0] : currentDoctor;
      updateProfile({ care_team: nextTeam, primary_doctor: nextPrimary });
      triggerSuccessToast(`${doc.name} removed from your Care Team.`);
    } else {
      const nextTeam = [...activeCareTeam, doc];
      updateProfile({ care_team: nextTeam });
      triggerSuccessToast(`${doc.name} (${doc.category || doc.specialty}) added to your Care Team!`);
    }
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

  async function handleAddAllergySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubstance.trim() || allergyLoading) return;
    setAllergyLoading(true);
    try {
      const pid = user?.id || "demo-patient";
      const res = await fetch(`${API_BASE}/patient/allergy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: pid,
          substance: newSubstance.trim(),
          reaction: newReaction.trim(),
          severity: newSeverity,
          reported_by: "patient",
        }),
      });
      const data = await res.json();
      if (data.allergy) {
        setAllergies((prev) => [data.allergy, ...prev]);
        setNewSubstance("");
        setNewReaction("");
        setNewSeverity("mild");
        setShowAddAllergy(false);
        triggerSuccessToast(`Allergy to ${data.allergy.substance} recorded!`);
      }
    } catch {} finally {
      setAllergyLoading(false);
    }
  }

  async function handleDeleteAllergy(id: string, substance: string) {
    try {
      await fetch(`${API_BASE}/patient/allergy/${id}`, { method: "DELETE" });
      setAllergies((prev) => prev.filter((a) => a.id !== id));
      triggerSuccessToast(`Allergy record for ${substance} removed.`);
    } catch {}
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
          {/* MULTI-SPECIALIST CARE TEAM SECTION */}
          <div className="glass-card p-6 space-y-5 border-2 border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold">Care Team & Specialist Network</h3>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--bg-muted)] text-[var(--fg-muted)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {activeCareTeam.length} {activeCareTeam.length === 1 ? "Specialist" : "Specialists"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">Assigned clinicians across departments coordinating your healthcare</p>
                </div>
              </div>

              <button
                onClick={() => setDoctorModalOpen(true)}
                className="px-4 py-2 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-opacity self-start shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> Manage Specialists +
              </button>
            </div>

            {/* Care Team Grid */}
            <div className="space-y-3">
              {activeCareTeam.map((doc) => {
                const isLead = currentDoctor.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`glass-panel p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isLead
                        ? "border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                        {doc.avatar_url ? (
                          <img
                            src={doc.avatar_url}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                            {doc.name.slice(4, 6)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-[var(--fg)]">{doc.name}</h4>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {doc.category || "Specialist"}
                          </span>
                          {isLead && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                              ⭐ Primary Lead
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--fg-muted)] font-medium">{doc.specialty}</p>
                        <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {doc.hospital}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                      {doc.phone && (
                        <p className="text-[11px] font-mono text-[var(--fg-muted)] flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {doc.phone}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        {!isLead && (
                          <button
                            onClick={() => handleSetLeadDoctor(doc)}
                            className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--border)] hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                          >
                            Make Lead
                          </button>
                        )}
                        {activeCareTeam.length > 1 && (
                          <button
                            onClick={() => handleToggleCareTeamDoctor(doc)}
                            className="p-1.5 text-[var(--fg-muted)] hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remove Specialist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* §5: ALLERGY & KNOWN REACTION PROFILE */}
          <div className="glass-card p-6 space-y-5 border-2 border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Allergy & Reaction Profile</h3>
                  <p className="text-xs text-[var(--fg-muted)]">Cross-checked during OTC scans & prescription intake</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddAllergy(!showAddAllergy)}
                className="px-4 py-2 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-opacity self-start shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> {showAddAllergy ? "Cancel" : "Add Allergy +"}
              </button>
            </div>

            {/* Add Allergy Inline Form */}
            {showAddAllergy && (
              <form onSubmit={handleAddAllergySubmit} className="glass-panel p-4 rounded-2xl border border-[var(--border)] space-y-3 animate-fade-in">
                <p className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--fg-muted)]">Declare Known Allergy</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-[var(--fg-muted)] block mb-1">Substance / Drug Name *</label>
                    <input
                      type="text"
                      value={newSubstance}
                      onChange={(e) => setNewSubstance(e.target.value)}
                      placeholder="e.g. Penicillin, Aspirin, Ibuprofen..."
                      required
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--fg)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-[var(--fg-muted)] block mb-1">Reaction / Symptoms</label>
                    <input
                      type="text"
                      value={newReaction}
                      onChange={(e) => setNewReaction(e.target.value)}
                      placeholder="e.g. Skin Rash, Hives, Swelling..."
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--fg)]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[var(--fg-muted)]">Severity:</span>
                    {(["mild", "moderate", "severe"] as const).map((sev) => (
                      <button
                        type="button"
                        key={sev}
                        onClick={() => setNewSeverity(sev)}
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                          newSeverity === sev
                            ? sev === "severe"
                              ? "bg-red-600 text-white border-red-600"
                              : sev === "moderate"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-emerald-600 text-white border-emerald-600"
                            : "border-[var(--border)] hover:border-[var(--fg)] text-[var(--fg-muted)]"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!newSubstance.trim() || allergyLoading}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    Save Record
                  </button>
                </div>
              </form>
            )}

            {/* Existing Allergies List */}
            {allergies.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--fg-muted)]">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-600 opacity-60" />
                <p className="font-bold">No declared drug or food allergies on file.</p>
                <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">Add known reactions to protect OTC and prescription checks.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {allergies.map((alg) => (
                  <div
                    key={alg.id}
                    className="glass-panel p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--fg)]">{alg.substance}</span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            alg.severity === "severe"
                              ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                              : alg.severity === "moderate"
                              ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                              : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {alg.severity}
                        </span>
                        {alg.doctor_confirmed && (
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                            Doctor Confirmed
                          </span>
                        )}
                      </div>
                      {alg.reaction && (
                        <p className="text-xs text-[var(--fg-muted)]">Reaction: {alg.reaction}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteAllergy(alg.id, alg.substance)}
                      className="p-1.5 text-[var(--fg-muted)] hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Remove Allergy Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      {/* MULTI-SPECIALIST CARE TEAM ASSIGNMENT MODAL */}
      {doctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
                <h3 className="font-display text-xl font-bold">Manage Care Team & Specialists</h3>
                <p className="text-xs text-[var(--fg-muted)]">
                  Assign specialist clinicians across departments to your coordinated health network
                </p>
              </div>
            </div>

            {/* Specialty Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border)]">
              {["All", "Neurosurgery", "Neurology", "Internal Medicine", "Cardiology", "Orthopedics", "Endocrinology & Diabetes"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedSpecialtyTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                      selectedSpecialtyTab === tab
                        ? "bg-[var(--fg)] text-[var(--bg)] shadow-sm"
                        : "border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--fg-muted)]"
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Doctors List */}
            <div className="space-y-3">
              {(AVAILABLE_DOCTORS || [FALLBACK_DOCTOR])
                .filter((doc) =>
                  selectedSpecialtyTab === "All" ? true : doc.category === selectedSpecialtyTab
                )
                .map((doc) => {
                  const isInCareTeam = activeCareTeam.some((d) => d.id === doc.id);
                  const isLead = currentDoctor.id === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`glass-panel p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isLead
                          ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-md"
                          : isInCareTeam
                          ? "border-blue-400/60 bg-blue-50/20 dark:bg-blue-950/20"
                          : "border-[var(--border)] hover:border-[var(--fg)]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                          {doc.avatar_url ? (
                            <img
                              src={doc.avatar_url}
                              alt={doc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                              {doc.name.slice(4, 6)}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-[var(--fg)]">{doc.name}</h4>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {doc.category || "Specialist"}
                            </span>
                            {isLead && (
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                ⭐ Primary Lead
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--fg-muted)] font-medium">{doc.specialty}</p>
                          <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {doc.hospital}
                          </p>
                          {doc.phone && (
                            <p className="text-[10px] font-mono text-[var(--fg-muted)] flex items-center gap-1 pt-0.5">
                              <Phone className="w-3 h-3" /> {doc.phone}
                              {doc.available_hours && ` · ${doc.available_hours}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {isInCareTeam ? (
                          <>
                            {!isLead && (
                              <button
                                onClick={() => handleSetLeadDoctor(doc)}
                                className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-[var(--border)] hover:border-emerald-500 hover:text-emerald-600 transition-all whitespace-nowrap"
                              >
                                Make Lead
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleCareTeamDoctor(doc)}
                              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-red-300 dark:border-red-800 text-red-600 hover:bg-red-600 hover:text-white transition-all whitespace-nowrap flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleCareTeamDoctor(doc)}
                            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-all whitespace-nowrap flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Specialist
                          </button>
                        )}
                      </div>
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
