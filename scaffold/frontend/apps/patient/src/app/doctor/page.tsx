"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  ChevronRight,
  User,
  Pill,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

interface QueueItem {
  id: string;
  patient_id: string;
  token_number: number;
  status: string;
  queued_at: string;
  patients: {
    full_name: string;
    age: number;
    gender: string;
    phone: string;
  };
  chief_complaints: {
    text: string;
    severity_level: number;
    severity_source?: string;
  };
}

export default function DoctorQueuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const doctorId = user?.id || "demo-doctor";

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refills, setRefills] = useState<any[]>([]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue?doctor_id=${encodeURIComponent(doctorId)}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (e) {
      console.error("Queue load failed:", e);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  const fetchRefills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=${encodeURIComponent(doctorId)}`);
      const data = await res.json();
      setRefills(data.refill_requests || []);
    } catch (e) {
      console.error("Refills fetch failed:", e);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchQueue();
    fetchRefills();
  }, [fetchQueue, fetchRefills]);

  const filteredQueue = queue.filter((item) => {
    const matchesSeverity =
      filterSeverity === "all" || item.chief_complaints?.severity_level === filterSeverity;
    const qLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.patients?.full_name?.toLowerCase().includes(qLower) ||
      item.chief_complaints?.text?.toLowerCase().includes(qLower) ||
      String(item.token_number).includes(qLower);
    return matchesSeverity && matchesSearch;
  });

  const criticalCount = queue.filter((q) => q.chief_complaints?.severity_level === 3).length;
  const urgentCount = queue.filter((q) => q.chief_complaints?.severity_level === 2).length;
  const routineCount = queue.filter((q) => q.chief_complaints?.severity_level === 1).length;

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
              CLINICAL TRIAGE & QUEUE
            </span>
          </div>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white">
            Physician Consultation Queue
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            Logged in as <strong className="text-[#0F172A] dark:text-white">{user?.full_name || "Attending Physician"}</strong> &bull; {user?.specialty || "General Medicine"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterSeverity("all")}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterSeverity === "all"
              ? "bg-[#0F172A] text-white border-[#0F172A] dark:bg-white dark:text-[#0F172A] dark:border-white shadow-md"
              : "bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1F2937] hover:border-gray-400"
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">Total Waiting</div>
          <div className="text-2xl font-black mt-1">{queue.length}</div>
        </button>

        <button
          onClick={() => setFilterSeverity(3)}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterSeverity === 3
              ? "bg-rose-600 text-white border-rose-600 shadow-md"
              : "bg-white dark:bg-[#111827] border-rose-200 dark:border-rose-950/50 hover:border-rose-400"
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-500 font-bold">
            🚨 Level 3 (Critical)
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{criticalCount}</div>
        </button>

        <button
          onClick={() => setFilterSeverity(2)}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterSeverity === 2
              ? "bg-amber-500 text-white border-amber-500 shadow-md"
              : "bg-white dark:bg-[#111827] border-amber-200 dark:border-amber-950/50 hover:border-amber-400"
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">
            ⚠️ Level 2 (Urgent)
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{urgentCount}</div>
        </button>

        <button
          onClick={() => setFilterSeverity(1)}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterSeverity === 1
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white dark:bg-[#111827] border-blue-200 dark:border-blue-950/50 hover:border-blue-400"
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-blue-500 font-bold">
            ℹ️ Level 1 (Routine)
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{routineCount}</div>
        </button>
      </div>

      {/* Main Grid: Queue on Left, Refill Quick Review on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient by name, token #, or complaint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#0F172A] dark:focus:border-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F172A] dark:text-white" />
              <p className="text-xs">Loading live acuity queue...</p>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
              <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No patients matching filter</p>
              <p className="text-xs mt-1">Queue updates live as reception registers intake.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((item) => {
                const sLevel = item.chief_complaints?.severity_level || 1;
                const badgeStyle =
                  sLevel === 3
                    ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    : sLevel === 2
                    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";

                const badgeLabel = sLevel === 3 ? "CRITICAL" : sLevel === 2 ? "URGENT" : "ROUTINE";

                return (
                  <Link
                    key={item.id}
                    href={`/doctor/patient/${item.patient_id}/timeline`}
                    className="block bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#0F172A] dark:hover:border-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] flex flex-col items-center justify-center font-bold flex-shrink-0">
                          <span className="text-[9px] font-mono leading-none opacity-70">TOKEN</span>
                          <span className="text-sm leading-tight font-black">#{item.token_number}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-white group-hover:text-blue-600 transition-colors">
                              {item.patients?.full_name}
                            </h3>
                            <span className="text-xs text-[#64748B] dark:text-gray-400">
                              {item.patients?.age}y &bull; {item.patients?.gender}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                              {badgeLabel}
                            </span>
                          </div>

                          <p className="text-xs text-[#64748B] dark:text-gray-300 mt-1 line-clamp-1">
                            <strong className="text-[#0F172A] dark:text-gray-200">Complaint:</strong> {item.chief_complaints?.text}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-[#64748B] dark:text-gray-400 mt-2 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.queued_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span>&bull;</span>
                            <span>Phone: {item.patients?.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-white group-hover:translate-x-1 transition-transform flex-shrink-0">
                        <span>Open Chart</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Refill Quick Queue (1 col) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Pending Refill Requests</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                {refills.length} PENDING
              </span>
            </div>

            {refills.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-6">No pending refill requests</p>
            ) : (
              <div className="space-y-3">
                {refills.slice(0, 4).map((r) => (
                  <Link
                    key={r.id}
                    href={`/doctor/patient/${r.patient_id}/refills`}
                    className="block p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] hover:border-purple-300 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#0F172A] dark:text-white">{r.patient_name}</span>
                      <span className="text-rose-600 font-mono text-[10px]">{r.remaining_days}d supply left</span>
                    </div>
                    <div className="text-[#64748B] dark:text-gray-400 mt-0.5">
                      {r.medicine_name} ({r.dosage})
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
