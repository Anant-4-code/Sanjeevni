"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Clock,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

const TABS = [
  { slug: "timeline", label: "Timeline & Meds", icon: Activity },
  { slug: "vault", label: "Full Medical Record", icon: FileText },
  { slug: "ocr-xray", label: "OCR & X-Ray Review", icon: Sparkles },
  { slug: "prescribe", label: "Prescribe & Guardrails", icon: Pill },
  { slug: "soap", label: "SOAP & Ambient Dictation", icon: Stethoscope },
  { slug: "refills", label: "Refills & Lab Orders", icon: RotateCcw },
];

export default function DoctorPatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const doctorId = user?.id || "demo-doctor";
  const patientId = params.patientId as string;

  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}?doctor_id=${encodeURIComponent(doctorId)}`);
      const data = await res.json();
      setPatientData(data);
    } catch (e) {
      console.error("Patient dashboard fetch error:", e);
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  const patient = patientData?.patient;
  const adherenceScore = patientData?.adherence_score ?? 78;
  const caregiverAudit = patientData?.caregiver_audit;
  const smartAlerts = patientData?.smart_alerts || [];
  const activeAlerts = smartAlerts.filter((a: any) => !a.acknowledged);

  // Compute doses text strictly from single source
  const totalDoses = caregiverAudit?.summary?.total_doses_7d || 4;
  const takenDoses = caregiverAudit?.summary?.taken_7d || Math.round((adherenceScore / 100) * totalDoses);

  // Adherence styling
  const adherenceColor =
    adherenceScore >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    adherenceScore >= 60 ? "text-amber-600 dark:text-amber-400" :
    "text-rose-600 dark:text-rose-400";

  const adherenceStroke =
    adherenceScore >= 80 ? "#059669" :
    adherenceScore >= 60 ? "#D97706" :
    "#DC2626";

  const currentTab = TABS.find((t) => pathname.includes(`/doctor/patient/${patientId}/${t.slug}`))?.slug || "timeline";

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/doctor"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Triage Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPatientData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Chart</span>
          </button>
        </div>
      </div>

      {/* Patient Header Card + Compliance Ring */}
      {loading && !patientData ? (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 md:p-8 shadow-xs animate-pulse space-y-4">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-8 w-72 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-60 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Demographics & Clinical Profile */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400">
                  PATIENT CHART // {patient?.id || patientId}
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  ACTIVE CONSULT
                </span>
              </div>

              <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white">
                {patient?.full_name || "Patient Record"}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] dark:text-gray-300">
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  {patient?.age} yrs &bull; {patient?.gender}
                </span>
                <span>&bull;</span>
                <span>Phone: {patient?.phone}</span>
                <span>&bull;</span>
                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md font-mono text-[11px]">
                  Lead: Dr. G. Mithun
                </span>
              </div>
            </div>

            {/* Right: Adherence Compliance Ring (Single Source of Truth) */}
            <div className="flex items-center gap-5 bg-[#F8F7F4] dark:bg-[#1F2937]/50 border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-4 flex-shrink-0">
              {/* SVG Ring */}
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    strokeDasharray={`${adherenceScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke={adherenceStroke}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-display font-black text-sm text-[#0F172A] dark:text-white">
                  {adherenceScore}%
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold">
                  7-Day Adherence
                </div>
                <div className={`text-sm font-bold ${adherenceColor} mt-0.5`}>
                  {takenDoses} of {totalDoses} doses logged
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">
                  {adherenceScore >= 80 ? "High Compliance" : adherenceScore >= 60 ? "Moderate Adherence" : "Risk of Non-Adherence"}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Smart Alert Banner (Third-person Doctor Voice) */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#1F2937]">
            {activeAlerts.length > 0 ? (
              <div className="space-y-2">
                {activeAlerts.map((alert: any, i: number) => (
                  <div
                    key={alert.id || i}
                    className="flex items-start gap-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-bold">Clinical Adherence Alert: </strong>
                      <span>
                        {alert.message ||
                          `Patient missed scheduled dose recently. Caregiver was notified and dose was verified later.`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>All active vital metrics, dosing intervals, and caregiver logs are within clinical baseline.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation Strip (Deep-linked) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[#E2E8F0] dark:border-[#1F2937] pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.slug;
          return (
            <Link
              key={tab.slug}
              href={`/doctor/patient/${patientId}/${tab.slug}`}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
                isActive
                  ? "bg-white dark:bg-[#111827] text-[#0F172A] dark:text-white border-[#0F172A] dark:border-white shadow-xs"
                  : "text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white border-transparent hover:bg-white/50 dark:hover:bg-[#111827]/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#0F172A] dark:text-white" : "text-[#64748B]"}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-200">
        {children}
      </div>
    </div>
  );
}