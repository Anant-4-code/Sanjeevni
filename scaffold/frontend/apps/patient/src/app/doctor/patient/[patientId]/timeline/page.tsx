"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  HeartPulse,
  Pill,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";
import AdherenceWellbeingTrend from "@/components/AdherenceWellbeingTrend";

export default function DoctorPatientTimelinePage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "doc-sharma-1";
  const patientId = params.patientId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/doctor/patient/${patientId}?doctor_id=${encodeURIComponent(doctorId)}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Timeline load failed:", e);
      } finally {
        setLoading(false);
      }
    }
    if (patientId) load();
  }, [patientId, doctorId]);

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl" />
        <div className="h-48 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl" />
      </div>
    );
  }

  const {
    active_prescriptions_mine = [],
    active_prescriptions_others = [],
    allergy_profile = [],
    symptom_summary = {},
  } = data;

  return (
    <div className="space-y-6">
      {/* ── Section: Live Adherence & Wellbeing Trend (Spec B & C) ── */}
      <AdherenceWellbeingTrend patientId={patientId} />

      {/* ── Section: Active Medications (Prescribed by this Physician) ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Active Regimen (My Prescriptions)</h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {active_prescriptions_mine.length} ACTIVE DRUGS
          </span>
        </div>

        {active_prescriptions_mine.length === 0 ? (
          <p className="text-xs text-[#64748B] py-4 text-center">No active medications prescribed under your care.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active_prescriptions_mine.map((rx: any, idx: number) => (
              <div
                key={rx.id || idx}
                className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">{rx.name}</h4>
                    <p className="text-xs text-[#64748B] dark:text-gray-400 font-mono mt-0.5">{rx.dosage} &bull; {rx.frequency}</p>
                  </div>
                  {rx.condition_tag && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {rx.condition_tag}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <span>Duration: {rx.duration_days} days</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">&bull; Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section: Cross-Doctor Prescriptions (Other Specialists) ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Cross-Doctor Active Medications</h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
            {active_prescriptions_others.length} CONCURRENT
          </span>
        </div>

        {active_prescriptions_others.length === 0 ? (
          <p className="text-xs text-[#64748B] py-4 text-center">No concurrent prescriptions from other doctors found.</p>
        ) : (
          <div className="space-y-2.5">
            {active_prescriptions_others.map((rx: any, idx: number) => (
              <div
                key={rx.id || idx}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A] dark:text-white">{rx.name}</span>
                    <span className="text-xs text-[#64748B] dark:text-gray-400 font-mono">({rx.dosage} &bull; {rx.frequency})</span>
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-gray-400">
                    Prescribed by <strong className="text-[#0F172A] dark:text-gray-200">{rx.doctor_name || "Specialist"}</strong> ({rx.specialty || "OPD"})
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] text-[#64748B]">
                  Verified: {rx.verified_at || "Recent"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section: Allergy Profile & Symptom Journal Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allergies Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Allergy & Hypersensitivity Profile</h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              {allergy_profile.length} DOCUMENTED
            </span>
          </div>

          {allergy_profile.length === 0 ? (
            <p className="text-xs text-[#64748B] py-3 text-center">No known drug or environmental allergies logged.</p>
          ) : (
            <div className="space-y-2">
              {allergy_profile.map((a: any, idx: number) => (
                <div
                  key={a.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/20 text-xs"
                >
                  <div>
                    <span className="font-bold text-rose-900 dark:text-rose-200">{a.allergen_name}</span>
                    <span className="text-[#64748B] dark:text-gray-400 text-[11px] ml-2">Reaction: {a.reaction_type}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-rose-700 dark:text-rose-300">
                    {a.severity || "Moderate"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symptoms Summary Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Recent Symptom Journal</h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              7-DAY STREAK
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#F8F7F4] dark:bg-[#1F2937]/50 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937]">
              <div className="flex items-center justify-between font-semibold text-[#0F172A] dark:text-white">
                <span>Mean Wellness Score</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">4.2 / 5.0 (Stable)</span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1">
                Patient reported mild dizziness on evening doses, but blood sugars remain well within normal fasting ranges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}