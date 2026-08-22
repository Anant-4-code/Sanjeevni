"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Phone,
  Stethoscope,
  X,
  Lock,
  Download,
} from "lucide-react";
import { useAuth, DoctorInfo } from "@/context/AuthContext";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { API_BASE } from "@/lib/api";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
];

const AVAILABLE_SPECIALISTS: DoctorInfo[] = [
  {
    id: "doc-sharma-1",
    name: "Dr. Nitin Sharma",
    specialty: "Internal Medicine & Endocrinology",
    hospital: "Sanjeevani Clinic",
    license_number: "MH-12345-2018",
    qualifications: "MBBS, MD",
    phone: "+91-98765-43210",
    category: "Internal Medicine",
  },
  {
    id: "doc-rai-1",
    name: "Dr. V. K. Rai",
    specialty: "Consultant Cardiologist",
    hospital: "Manikanta Heart Institute",
    license_number: "TS-98765-2015",
    qualifications: "MBBS, MD, DM (Cardio)",
    phone: "+91-99899-85777",
    category: "Cardiology",
  },
  {
    id: "doc-patel-1",
    name: "Dr. Anita Patel",
    specialty: "Endocrinology & Diabetology",
    hospital: "Metro Diabetes Care",
    license_number: "KA-55443-2019",
    qualifications: "MBBS, DNB",
    phone: "+91-98844-33221",
    category: "Endocrinology & Diabetes",
  },
];

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // User Settings State (with API sync)
  const [settings, setSettings] = useState<any>({
    notify_channels: ["in_app", "whatsapp"],
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    ui_language: "en",
    regional_language: "en",
    ai_risk_forecast_enabled: true,
    ai_smart_search_enabled: true,
    ai_differential_suggestions_enabled: true,
    ai_daily_tip_enabled: true,
    ai_auto_triage_enabled: true,
    ai_inventory_forecast_enabled: true,
    ai_abnormal_flagging_enabled: true,
  });

  // Doctor Credentials State
  const [credentials, setCredentials] = useState<any>({
    license_number: "MH-12345-2018",
    specialty: "Internal Medicine & Endocrinology",
    qualifications: "MBBS, MD",
    clinic_name: "Sanjeevani Multispeciality Clinic",
    clinic_address: "Apollo Health Arcade, Jubilee Hills, Hyderabad",
  });

  // Staff Availability State
  const [availability, setAvailability] = useState<any[]>([
    { day_of_week: 1, day: "Monday", start_time: "09:00", end_time: "17:00", is_available: true },
    { day_of_week: 2, day: "Tuesday", start_time: "09:00", end_time: "17:00", is_available: true },
    { day_of_week: 3, day: "Wednesday", start_time: "09:00", end_time: "17:00", is_available: true },
    { day_of_week: 4, day: "Thursday", start_time: "09:00", end_time: "17:00", is_available: true },
    { day_of_week: 5, day: "Friday", start_time: "09:00", end_time: "15:00", is_available: true },
    { day_of_week: 6, day: "Saturday", start_time: "10:00", end_time: "13:00", is_available: false },
    { day_of_week: 0, day: "Sunday", start_time: "00:00", end_time: "00:00", is_available: false },
  ]);

  // Care Team state
  const activeCareTeam = user?.care_team && user.care_team.length > 0 ? user.care_team : [AVAILABLE_SPECIALISTS[0]];
  const primaryDoc = user?.primary_doctor || activeCareTeam[0];

  // Fetch settings & credentials on load
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_BASE}/settings?user_id=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((d) => setSettings((prev: any) => ({ ...prev, ...d })))
      .catch(() => {});

    if (user.role === "doctor") {
      fetch(`${API_BASE}/settings/credentials?doctor_id=${encodeURIComponent(user.id)}`)
        .then((r) => r.json())
        .then((d) => setCredentials((prev: any) => ({ ...prev, ...d })))
        .catch(() => {});
    }
  }, [user?.id, user?.role]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleToggleAi = async (key: string) => {
    const nextVal = !settings[key];
    const updated = { ...settings, [key]: nextVal };
    setSettings(updated);

    try {
      await fetch(`${API_BASE}/settings?user_id=${encodeURIComponent(user?.id || "demo")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextVal }),
      });
      showToast("AI preferences updated!");
    } catch {}
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/settings/credentials?doctor_id=${encodeURIComponent(user?.id || "demo")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      showToast("Doctor credentials & clinic info saved!");
    } catch {
      showToast("Credentials updated locally.");
    }
  };

  const handleToggleCareTeamDoctor = (doc: DoctorInfo) => {
    const isInTeam = activeCareTeam.some((d) => d.id === doc.id);
    if (isInTeam) {
      if (activeCareTeam.length <= 1) {
        showToast("You must maintain at least one specialist in your Care Team.");
        return;
      }
      const nextTeam = activeCareTeam.filter((d) => d.id !== doc.id);
      const nextPrimary = primaryDoc.id === doc.id ? nextTeam[0] : primaryDoc;
      updateProfile({ care_team: nextTeam, primary_doctor: nextPrimary });
      showToast(`${doc.name} removed from your Care Team.`);
    } else {
      const nextTeam = [...activeCareTeam, doc];
      updateProfile({ care_team: nextTeam });
      showToast(`${doc.name} added to your Care Team!`);
    }
  };

  const handleSetLeadDoctor = (doc: DoctorInfo) => {
    const isInTeam = activeCareTeam.some((d) => d.id === doc.id);
    const nextTeam = isInTeam ? activeCareTeam : [...activeCareTeam, doc];
    updateProfile({ primary_doctor: doc, care_team: nextTeam });
    showToast(`${doc.name} assigned as Lead Primary Doctor!`);
  };

  return (
    <SettingsLayout saveMessage={toastMsg}>
      {(activeTab) => (
        <div className="space-y-6">
          {/* 1. PROFILE SECTION */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <ProfileCard
                variant="full"
                user={{
                  full_name: user?.full_name,
                  email: user?.email,
                  phone: user?.phone,
                  role: user?.role,
                  avatar_url: user?.avatar_url,
                }}
                onEditAvatar={() => setAvatarModalOpen(true)}
                actionButton={
                  <button
                    onClick={() => setAvatarModalOpen(true)}
                    className="w-full py-2 px-3 border border-[var(--border)] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-muted)] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" /> Edit Profile Avatar
                  </button>
                }
              />

              <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Account Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.full_name || ""}
                      className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email || ""}
                      className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.phone || "+91-98765-43210"}
                      className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                      Role &amp; Permissions
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${user?.role?.toUpperCase()} (Authenticated)`}
                      className="w-full p-2.5 bg-gray-100 dark:bg-gray-800 border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl text-gray-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. AI FEATURES SECTION (Spec 15 Part B.6) */}
          {activeTab === "ai_features" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-5">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">AI Intelligence &amp; Feature Preferences</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Control predictive clinical assistants and automation triggers
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "ai_risk_forecast_enabled",
                    title: "AI-1: Patient Risk Forecast Card",
                    desc: "Predicts panel patients with declining adherence or low well-being scores on doctor queue.",
                  },
                  {
                    key: "ai_smart_search_enabled",
                    title: "AI-9: Smart Record Search ('Ask about this patient')",
                    desc: "Natural-language query across multi-document history with citation badges.",
                  },
                  {
                    key: "ai_differential_suggestions_enabled",
                    title: "AI-3: Smart Differential Suggestions",
                    desc: "Non-diagnostic rule-out checklist aid during consultation (doctor-only).",
                  },
                  {
                    key: "ai_daily_tip_enabled",
                    title: "AI-8: Personalized Daily Health Tip",
                    desc: "Personalized medication timing and guidance on patient dashboard.",
                  },
                  {
                    key: "ai_auto_triage_enabled",
                    title: "AI-4: Auto-Triage Severity Classification",
                    desc: "Keyword and clinical acuity suggestions during patient registration.",
                  },
                  {
                    key: "ai_inventory_forecast_enabled",
                    title: "AI-5: Pharmacy Inventory Forecast",
                    desc: "Stock-out predictions and purchase order suggestions based on dispense velocity.",
                  },
                  {
                    key: "ai_abnormal_flagging_enabled",
                    title: "AI-7: Lab Abnormal Result Flagging & Plain Summary",
                    desc: "Automatically drafts plain-language patient summaries and highlights out-of-range metrics.",
                  },
                ].map((item) => {
                  const isEnabled = settings[item.key] !== false;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937]"
                    >
                      <div className="max-w-xl">
                        <p className="text-xs font-bold text-[#0F172A] dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleToggleAi(item.key)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                          isEnabled
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {isEnabled ? "ENABLED" : "DISABLED"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DOCTOR CREDENTIALS TAB */}
          {activeTab === "credentials" && (
            <form onSubmit={handleSaveCredentials} className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 flex items-center justify-center text-blue-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Physician Credentials &amp; Clinic Header</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Printed on verified digital prescriptions and referral summaries
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Medical Council License #
                  </label>
                  <input
                    type="text"
                    value={credentials.license_number || ""}
                    onChange={(e) => setCredentials({ ...credentials, license_number: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Primary Clinical Specialty
                  </label>
                  <input
                    type="text"
                    value={credentials.specialty || ""}
                    onChange={(e) => setCredentials({ ...credentials, specialty: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Degrees &amp; Qualifications
                  </label>
                  <input
                    type="text"
                    value={credentials.qualifications || ""}
                    onChange={(e) => setCredentials({ ...credentials, qualifications: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Clinic / Hospital Name
                  </label>
                  <input
                    type="text"
                    value={credentials.clinic_name || ""}
                    onChange={(e) => setCredentials({ ...credentials, clinic_name: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Clinic Address
                  </label>
                  <input
                    type="text"
                    value={credentials.clinic_address || ""}
                    onChange={(e) => setCredentials({ ...credentials, clinic_address: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Save Credentials
              </button>
            </form>
          )}

          {/* 4. CARE TEAM & SPECIALISTS TAB */}
          {activeTab === "care_team" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold">Assigned Care Team</h3>
                    <p className="text-xs text-[#64748B] dark:text-gray-400">
                      Coordinated clinicians managing your active treatments
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {AVAILABLE_SPECIALISTS.map((doc) => {
                  const isInTeam = activeCareTeam.some((d) => d.id === doc.id);
                  const isLead = primaryDoc.id === doc.id;
                  return (
                    <ProfileCard
                      key={doc.id}
                      variant="compact"
                      user={{
                        full_name: doc.name,
                        specialty: doc.specialty,
                        hospital: doc.hospital,
                        license_number: doc.license_number,
                        qualifications: doc.qualifications,
                        phone: doc.phone,
                        is_lead: isLead,
                      }}
                      actionButton={
                        <div className="flex items-center gap-2">
                          {isInTeam ? (
                            <>
                              {!isLead && (
                                <button
                                  onClick={() => handleSetLeadDoctor(doc)}
                                  className="px-3 py-1 text-[11px] font-bold rounded-full border border-gray-300 dark:border-gray-700 hover:border-emerald-500"
                                >
                                  Make Lead
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleCareTeamDoctor(doc)}
                                className="px-3 py-1 text-[11px] font-bold rounded-full text-rose-600 border border-rose-200 dark:border-rose-900 hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleToggleCareTeamDoctor(doc)}
                              className="px-3 py-1 text-[11px] font-bold rounded-full bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]"
                            >
                              + Add Specialist
                            </button>
                          )}
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. STAFF AVAILABILITY TAB */}
          {activeTab === "availability" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Working Hours &amp; Schedule</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Defines your active queue slots and consultation availability
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {availability.map((day, idx) => (
                  <div
                    key={day.day_of_week}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] text-xs"
                  >
                    <span className="font-bold w-28">{day.day}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.start_time}
                        disabled={!day.is_available}
                        onChange={(e) => {
                          const copy = [...availability];
                          copy[idx].start_time = e.target.value;
                          setAvailability(copy);
                        }}
                        className="p-1 bg-[#F8F7F4] dark:bg-[#1F2937] border border-gray-300 dark:border-gray-700 rounded-lg text-xs"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={day.end_time}
                        disabled={!day.is_available}
                        onChange={(e) => {
                          const copy = [...availability];
                          copy[idx].end_time = e.target.value;
                          setAvailability(copy);
                        }}
                        className="p-1 bg-[#F8F7F4] dark:bg-[#1F2937] border border-gray-300 dark:border-gray-700 rounded-lg text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const copy = [...availability];
                        copy[idx].is_available = !copy[idx].is_available;
                        setAvailability(copy);
                      }}
                      className={`px-3 py-1 rounded-full font-bold text-[10px] ${
                        day.is_available
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {day.is_available ? "OPEN" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => showToast("Weekly schedule updated!")}
                className="px-6 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] text-xs font-bold rounded-xl"
              >
                Save Availability
              </button>
            </div>
          )}

          {/* 6. NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Notification Channels</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Direct medication alerts, lab status updates, and refill notices
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { name: "WhatsApp Notifications", desc: "Interactive one-tap dose verification links" },
                  { name: "In-App Push Alerts", desc: "Realtime alerts when report results are published" },
                  { name: "SMS Backup Alerts", desc: "Critical fallback alerts if internet is inactive" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937]"
                  >
                    <div>
                      <p className="font-bold text-[#0F172A] dark:text-white">{item.name}</p>
                      <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. LANGUAGE TAB */}
          {activeTab === "language" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 flex items-center justify-center text-teal-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Language &amp; Translation</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Patient audio instructions and multilingual UI translations
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Interface Language
                  </label>
                  <select className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl outline-none">
                    <option value="en">English (Clinical standard)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 8. PASSWORD & SECURITY TAB */}
          {activeTab === "security" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Password &amp; Security</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">Manage account credentials and session security</p>
                </div>
              </div>

              <div className="space-y-3 text-xs max-w-md">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    className="w-full p-2.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl outline-none"
                  />
                </div>
                <button
                  onClick={() => showToast("Password updated successfully!")}
                  className="px-6 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] text-xs font-bold rounded-xl"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* 9. DATA & PRIVACY TAB */}
          {activeTab === "data_privacy" && (
            <div className="glass-card p-6 border border-[var(--border)] rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center text-cyan-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">Data Privacy &amp; Portability</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-400">
                    Export complete medical history or manage consent logs
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#0F172A] dark:text-white">Export Personal Health Archive</p>
                    <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                      Download all indexed lab reports, prescriptions, and symptom logs as a signed PDF package.
                    </p>
                  </div>
                  <button
                    onClick={() => showToast("Archive export job initiated. Download will begin shortly.")}
                    className="px-4 py-2 bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] rounded-xl font-bold flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsLayout>
  );
}
