"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Package,
  Clock,
  Send,
  Lock,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function PharmacyPortalPage() {
  const [dispenseQueue, setDispenseQueue] = useState<any[]>([
    {
      id: "rx-ramesh-1",
      patient_id: "patient-ramesh",
      patient_name: "Ramesh Kumar",
      doctor_name: "Dr. Nitin Sharma",
      verified_at: "10 mins ago",
      protocol_hash: "sha256:4f8e...92a1",
      items: [
        { name: "Metformin 500mg", dosage: "500mg", qty: 60, instructions: "1-0-1 after meals (30 days)" },
        { name: "Noveron 500mg", dosage: "500mg", qty: 30, instructions: "1-0-1 after food (15 days)" },
      ],
      safety_flags_acknowledged: ["Potential mild dizziness on evening Noveron dose"],
      dispensed: false,
    },
    {
      id: "rx-vikram-2",
      patient_id: "patient-vikram",
      patient_name: "Vikram Singh",
      doctor_name: "Dr. Rai",
      verified_at: "25 mins ago",
      protocol_hash: "sha256:7c2b...811d",
      items: [
        { name: "Tab. Gabapin NT 100mg", dosage: "100mg", qty: 15, instructions: "0-0-1 at bedtime (15 days)" },
        { name: "Tab. Benforce CD", dosage: "1 Tab", qty: 30, instructions: "1-0-0 morning (30 days)" },
      ],
      safety_flags_acknowledged: [],
      dispensed: false,
    },
  ]);

  const [dispensingId, setDispensingId] = useState<string | null>(null);

  const handleDispense = (id: string) => {
    setDispensingId(id);
    setTimeout(() => {
      setDispenseQueue((q) => q.map((item) => (item.id === id ? { ...item, dispensed: true } : item)));
      setDispensingId(null);
    }, 600);
  };

  const pendingList = dispenseQueue.filter((rx) => !rx.dispensed);
  const completedList = dispenseQueue.filter((rx) => rx.dispensed);

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            02 // DISPENSARY CONSOLE
          </span>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
            Pharmacy Dispensing Workbench
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Live stream of physician-verified prescriptions with cryptographic protocol lock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
            {pendingList.length} PENDING DISPENSE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Dispense Queue (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-600" />
            <span>Verified Prescriptions Stream</span>
          </h2>

          {pendingList.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-12 text-center text-[#64748B] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-[#0F172A] dark:text-white">All Prescriptions Dispensed</p>
              <p className="text-xs">Queue automatically updates when doctors complete immutable sign-offs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-white">{rx.patient_name}</h3>
                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200">
                          VERIFIED
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                        Prescribed by <strong>{rx.doctor_name}</strong> &bull; {rx.verified_at}
                      </div>
                    </div>

                    <div className="text-right font-mono text-[10px] text-[#64748B]">
                      Lock: {rx.protocol_hash}
                    </div>
                  </div>

                  {/* Safety Notes if Doctor Overrode Flag */}
                  {rx.safety_flags_acknowledged?.length > 0 && (
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Doctor-Acknowledged Precaution: </strong>
                        <span>{rx.safety_flags_acknowledged.join("; ")}</span>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2">
                    {rx.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#0F172A] dark:text-white">{item.name}</span>
                          <div className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono mt-0.5">
                            {item.instructions}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs bg-white dark:bg-[#111827] px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937]">
                          Qty: {item.qty}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleDispense(rx.id)}
                      disabled={dispensingId === rx.id}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{dispensingId === rx.id ? "Logging Dispense..." : "Confirm & Dispense Medication"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Dispenses & Stock Alerts (1 col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
              <Package className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Dispensed Log (Today)</h3>
            </div>

            {completedList.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">No medications dispensed yet today.</p>
            ) : (
              <div className="space-y-2">
                {completedList.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-200">{c.patient_name}</div>
                      <div className="text-[11px] text-[#64748B]">{c.items.length} item(s) dispensed</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      COMPLETED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}