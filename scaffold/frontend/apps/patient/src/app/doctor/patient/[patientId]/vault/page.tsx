"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  lab_report: { icon: "🧪", label: "Lab Reports", color: "text-blue-500" },
  xray_scan: { icon: "🦴", label: "X-Rays / Imaging", color: "text-purple-500" },
  mri_ct_scan: { icon: "🧠", label: "MRI / CT", color: "text-indigo-500" },
  prescription: { icon: "💊", label: "Prescriptions", color: "text-emerald-500" },
  discharge_summary: { icon: "📄", label: "Discharge Summaries", color: "text-amber-500" },
  vaccination: { icon: "💉", label: "Vaccinations", color: "text-teal-500" },
  referral_letter: { icon: "✉️", label: "Referrals", color: "text-orange-500" },
  other: { icon: "📁", label: "Other Records", color: "text-gray-500" },
};

export default function DoctorPatientVaultPage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "demo-doctor";
  const patientId = params.patientId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (categoryFilter !== "all") qParams.set("category", categoryFilter);
      if (doctorFilter !== "all") qParams.set("doctor_id", doctorFilter);
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}/full-record?${qParams}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch full record:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId, categoryFilter, doctorFilter]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleVerify = async (docId: string) => {
    setVerifyingDocId(docId);
    try {
      await fetch(`${API_BASE}/doctor/documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });
      await fetchRecord();
    } catch (err) {
      console.error("Verify failed:", err);
    } finally {
      setVerifyingDocId(null);
    }
  };

  const doctorNames = useMemo(() => {
    if (!data?.prescriptions_timeline) return [];
    const names = new Set(data.prescriptions_timeline.map((rx: any) => rx.doctor_name));
    return Array.from(names) as string[];
  }, [data]);

  const categoryCounts = useMemo(() => {
    if (!data?.documents) return {};
    const counts: Record<string, number> = {};
    for (const [cat, docs] of Object.entries(data.documents)) {
      counts[cat] = (docs as any[]).length;
    }
    return counts;
  }, [data]);

  const totalDocs = Object.values(categoryCounts).reduce((a: number, b: number) => a + b, 0);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl animate-pulse">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F172A] dark:text-white" />
        <p className="text-xs">Aggregating complete multi-document history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            SPEC 12 // LIFETIME ARCHIVE
          </span>
          <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-white">
            Universal Document Repository
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white font-medium outline-none"
          >
            <option value="all">All Doctors</option>
            {doctorNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white font-medium outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Section: Lab Trend Charts (HbA1c & Fasting Glucose) ── */}
      {data?.lab_trends && data.lab_trends.length > 0 && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Longitudinal Biomarker Trends</h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              {data.lab_trends.length} TEST PANELS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.lab_trends.map((trend: any) => (
              <TrendCard key={trend.test_name} trend={trend} />
            ))}
          </div>
        </div>
      )}

      {/* ── Section: All Categorized Documents ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">All Indexed Documents ({totalDocs})</h3>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
            return (
              <span
                key={cat}
                className="text-xs px-3 py-1 rounded-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] text-[#0F172A] dark:text-gray-200 flex items-center gap-1.5"
              >
                <span>{cfg.icon}</span>
                <span className="font-medium">{cfg.label}</span>
                <span className="font-bold font-mono opacity-70">({count})</span>
              </span>
            );
          })}
        </div>

        {/* Document Cards */}
        <div className="space-y-2.5 pt-2">
          {Object.entries(data?.documents || {}).flatMap(([cat, docs]: [string, any]) =>
            docs.map((doc: any) => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
              const isPatientUploaded = doc.source === "patient_uploaded";
              const isVerifying = verifyingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                    isPatientUploaded
                      ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20"
                      : "border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <span className="text-2xl flex-shrink-0">{cfg.icon}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#0F172A] dark:text-white truncate">{doc.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                        <span className="font-mono">{doc.document_date}</span>
                        <span>&bull;</span>
                        {isPatientUploaded ? (
                          <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Not clinically verified &mdash; uploaded by patient</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Clinic-Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-shrink-0">
                    {isPatientUploaded && (
                      <button
                        onClick={() => handleVerify(doc.id)}
                        disabled={isVerifying}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isVerifying ? "Verifying..." : "Verify Document"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: any }) {
  const points = trend.points || [];
  if (points.length < 2) return null;

  const values = points.map((p: any) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const first = values[0];
  const last = values[values.length - 1];
  const improving = last < first;

  const W = 320;
  const H = 70;
  const PAD = 10;

  const svgPoints = points.map((p: any, i: number) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - minVal) / range) * (H - PAD * 2);
    return { x, y, value: p.value, date: p.date };
  });

  const pathD = svgPoints.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="bg-[#F8F7F4] dark:bg-[#1F2937]/50 border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-sm text-[#0F172A] dark:text-white">{trend.test_name}</span>
          <span className="text-xs text-[#64748B] dark:text-gray-400 ml-1.5">({trend.unit})</span>
        </div>
        <span className={`text-xs font-bold flex items-center gap-1 ${improving ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
          {improving ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          <span>{improving ? "Improving" : "Elevated"}</span>
        </span>
      </div>

      <div className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono">
        {first}{trend.unit} &rarr; {last}{trend.unit} &bull; Ref: {trend.reference_range} {trend.unit}
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 pt-1">
        <path d={pathD} fill="none" stroke={improving ? "#059669" : "#D97706"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {svgPoints.map((p: any, i: number) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={improving ? "#059669" : "#D97706"} stroke="#FFFFFF" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="bold">
              {p.value}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex justify-between text-[10px] text-[#64748B] font-mono pt-1 border-t border-gray-200 dark:border-gray-700">
        {svgPoints.map((p: any, i: number) => (
          <span key={i}>{p.date}</span>
        ))}
      </div>
    </div>
  );
}