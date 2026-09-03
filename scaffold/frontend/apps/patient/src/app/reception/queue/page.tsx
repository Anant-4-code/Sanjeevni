"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Clock, Users, Activity } from "lucide-react";
import { API_BASE } from "@/lib/api";

const SEVERITY_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "ROUTINE", cls: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  2: { label: "URGENT", cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  3: { label: "CRITICAL", cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse" },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  waiting: { label: "Waiting", cls: "text-amber-700 dark:text-amber-300" },
  in_consult: { label: "In Consult", cls: "text-emerald-700 dark:text-emerald-300" },
  completed: { label: "Done", cls: "text-[#64748B] dark:text-gray-400" },
};

export default function ReceptionQueueBoardPage() {
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reception/queue/board`);
      const data = await res.json();
      setBoard(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Queue board fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchBoard]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            02 // LIVE QUEUE BOARD
          </span>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
            Live Queue Board
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBoard}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg text-xs font-bold text-[#0F172A] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <span className="text-[10px] text-[#94A3B8] dark:text-gray-500">
            Updated {lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Summary Strip */}
      {board && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <div className="text-2xl font-black font-display text-[#0F172A] dark:text-white">{board.total_waiting}</div>
              <div className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold">Total Waiting</div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <div className="text-2xl font-black font-display text-[#0F172A] dark:text-white">{board.avg_wait_minutes} min</div>
              <div className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold">Avg Wait Today</div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Queues Grid */}
      {loading && !board ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F172A] dark:text-white" />
          <p className="text-xs">Loading live queue data...</p>
        </div>
      ) : board?.doctors?.length === 0 ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
          <Activity className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
          <p className="font-bold text-sm text-[#0F172A] dark:text-white">All Clear</p>
          <p className="text-xs mt-1">No patients currently in queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {board?.doctors?.map((doc: any) => {
            const waitingPatients = doc.patients.filter((p: any) => p.status === "waiting");
            const inConsult = doc.patients.filter((p: any) => p.status === "in_consult");
            return (
              <div
                key={doc.doctor_id}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-xs overflow-hidden"
              >
                {/* Doctor Header */}
                <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4] dark:bg-[#0D1117]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#0F172A] dark:text-white truncate">{doc.doctor_name}</h3>
                    <span className="text-[10px] font-mono font-bold bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] px-2 py-0.5 rounded-full">
                      {waitingPatients.length} waiting
                    </span>
                  </div>
                </div>

                {/* Patient Rows */}
                <div className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937]">
                  {/* In-consult first */}
                  {inConsult.map((p: any) => (
                    <div key={p.queue_id} className="px-5 py-3 bg-emerald-50/40 dark:bg-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-display text-emerald-700 dark:text-emerald-300">#{p.token_number}</span>
                          <span className="text-xs font-bold text-[#0F172A] dark:text-white">{p.patient_name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">IN CONSULT</span>
                      </div>
                    </div>
                  ))}

                  {/* Waiting patients */}
                  {waitingPatients.map((p: any) => {
                    const sev = SEVERITY_BADGE[p.severity_level] || SEVERITY_BADGE[1];
                    return (
                      <div key={p.queue_id} className="px-5 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-display text-[#0F172A] dark:text-white">#{p.token_number}</span>
                            <span className="text-xs font-bold text-[#0F172A] dark:text-white">{p.patient_name}</span>
                            {p.severity_level >= 2 && (
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${sev.cls}`}>
                                {sev.label}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {p.waiting_minutes}m
                          </span>
                        </div>
                        {p.complaint && (
                          <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5 truncate pl-7">
                            {p.complaint}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {waitingPatients.length === 0 && inConsult.length === 0 && (
                    <div className="px-5 py-6 text-center text-xs text-[#94A3B8] dark:text-gray-500">
                      Queue empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
