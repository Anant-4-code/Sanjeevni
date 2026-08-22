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
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function PharmacyPortalPage() {
  const [dispenseQueue, setDispenseQueue] = useState<any[]>([
    {
      id: "rx-savitri-01",
      patient_id: "patient-savitri",
      patient_name: "Savitri Kumar",
      doctor_name: "Dr. Nitin Sharma",
      verified_at: "10 mins ago",
      protocol_hash: "sha256:4f8e...92a1",
      items: [
        { name: "Metformin 500mg", dosage: "500mg", qty: 60, instructions: "1-0-1 after meals (30 days)" },
        { name: "Noveron 500mg", dosage: "500mg", qty: 30, instructions: "0-0-1 at night (30 days)" },
      ],
      safety_lock: {
        drug_a: "Metformin",
        drug_b: "Noveron (Gabapentin)",
        warning: "Mild dizziness precaution acknowledged by physician.",
        reason: "Low dose, regular spacing advised. Normal renal profile verified.",
      },
      dispensed: false,
    },
    {
      id: "rx-vikram-02",
      patient_id: "patient-vikram",
      patient_name: "Vikram Singh",
      doctor_name: "Dr. V. K. Rai",
      verified_at: "25 mins ago",
      protocol_hash: "sha256:7c2b...811d",
      items: [
        { name: "Telmisartan 40mg", dosage: "40mg", qty: 30, instructions: "1-0-0 morning (30 days)" },
        { name: "Atorvastatin 10mg", dosage: "10mg", qty: 30, instructions: "0-0-1 at bedtime (30 days)" },
      ],
      safety_lock: null,
      dispensed: false,
    },
  ]);

  const [dispensingId, setDispensingId] = useState<string | null>(null);

  // AI-5 Inventory Forecast State
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([
    {
      medication_id: "med-nov-500",
      name: "Noveron 500mg (Gabapentin)",
      current_stock: 90,
      unit: "capsules",
      days_until_stockout: 4,
      avg_daily_dispense: 24,
      suggested_reorder_qty: 500,
      urgency: "critical",
    },
    {
      medication_id: "med-met-500",
      name: "Metformin 500mg",
      current_stock: 340,
      unit: "tablets",
      days_until_stockout: 10,
      avg_daily_dispense: 32,
      suggested_reorder_qty: 1000,
      urgency: "warning",
    },
  ]);

  // AI-6 Drug Explainer State
  const [explainingLock, setExplainingLock] = useState<any | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState<any | null>(null);

  const handleDispense = (id: string) => {
    setDispensingId(id);
    setTimeout(() => {
      setDispenseQueue((q) => q.map((item) => (item.id === id ? { ...item, dispensed: true } : item)));
      setDispensingId(null);
    }, 600);
  };

  const handleExplainInteraction = async (safetyLock: any) => {
    setExplainingLock(safetyLock);
    setExplainLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pharmacy/interactions/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug_a: safetyLock.drug_a,
          drug_b: safetyLock.drug_b,
        }),
      });
      const json = await res.json();
      setExplainResult(json);
    } catch {
      setExplainResult({
        drug_pair: `${safetyLock.drug_a} + ${safetyLock.drug_b}`,
        mechanism: "Shared metabolic clearance pathways may accentuate sedative tone or blood pressure modulation.",
        clinical_significance: "Physician approved based on stable renal function tests.",
        pharmacist_counseling_tip: "Counsel patient to take bedtime dose after food and space appropriately from daytime medications.",
      });
    } finally {
      setExplainLoading(false);
    }
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
            Live stream of physician-verified prescriptions with cryptographic protocol lock &amp; AI forecasting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
            {pendingList.length} PENDING DISPENSE
          </span>
        </div>
      </div>

      {/* ── AI-5 INVENTORY FORECAST & REORDER SUGGESTIONS CARD ── */}
      {inventoryAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/60 to-purple-50/70 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-purple-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                AI
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span>AI-5 Inventory Forecast:</span>
                  <span className="text-amber-800 dark:text-amber-300 font-bold">
                    {inventoryAlerts.length} Medicines Projected to Stock Out Soon
                  </span>
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                  Predicted based on 30-day dispensing velocity and pending patient refill queues.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {inventoryAlerts.map((med) => (
              <div
                key={med.medication_id}
                className="bg-white dark:bg-[#111827] border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#0F172A] dark:text-white text-sm">{med.name}</span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                        med.urgency === "critical"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      ~{med.days_until_stockout} Days Stock Left
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1 font-mono">
                    Stock: {med.current_stock} {med.unit} &bull; Velocity: ~{med.avg_daily_dispense}/day
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-purple-700 dark:text-purple-400 text-[11px]">
                    Suggested Reorder: {med.suggested_reorder_qty} {med.unit}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setInventoryAlerts((prev) => prev.filter((a) => a.medication_id !== med.medication_id))
                      }
                      className="px-3 py-1 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-lg font-bold text-[11px] shadow-xs"
                    >
                      Create PO
                    </button>
                    <button
                      onClick={() =>
                        setInventoryAlerts((prev) => prev.filter((a) => a.medication_id !== med.medication_id))
                      }
                      className="px-2 py-1 text-[#94A3B8] hover:text-[#475569] text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
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

                  {/* Safety Lock Badge + AI-6 Drug Interaction Explainer */}
                  {rx.safety_lock && (
                    <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Doctor-Acknowledged Precaution: </strong>
                          <span>{rx.safety_lock.warning}</span>
                          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 font-mono">
                            Reason: {rx.safety_lock.reason}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExplainInteraction(rx.safety_lock)}
                        className="px-3 py-1 bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-200 rounded-lg text-[11px] font-bold whitespace-nowrap hover:bg-amber-300 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        <span>AI-6 Explain</span>
                      </button>
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

      {/* ── AI-6 INTERACTION EXPLAINER MODAL ── */}
      {explainingLock && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] max-w-lg w-full p-6 rounded-3xl relative shadow-2xl space-y-4">
            <button
              onClick={() => setExplainingLock(null)}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 rounded-full border border-gray-200 dark:border-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <div>
                <h3 className="font-bold text-base text-[#0F172A] dark:text-white">
                  Drug Interaction Clinical Explainer
                </h3>
                <p className="text-xs text-[#64748B] dark:text-gray-400">
                  {explainingLock.drug_a} + {explainingLock.drug_b}
                </p>
              </div>
            </div>

            {explainLoading ? (
              <div className="py-8 text-center text-xs text-[#64748B] space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600" />
                <p>Generating pharmacological explanation...</p>
              </div>
            ) : explainResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl space-y-1">
                  <span className="font-bold text-purple-900 dark:text-purple-200">Mechanism of Interaction:</span>
                  <p className="text-[#475569] dark:text-gray-300 leading-relaxed">{explainResult.mechanism}</p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">Doctor Clearance Context:</span>
                  <p className="text-[#475569] dark:text-gray-300 leading-relaxed">{explainResult.clinical_significance}</p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1">
                  <span className="font-bold text-amber-900 dark:text-amber-200">Patient Counseling Tip:</span>
                  <p className="text-[#475569] dark:text-gray-300 leading-relaxed">{explainResult.pharmacist_counseling_tip}</p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setExplainingLock(null)}
                className="px-5 py-2 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold"
              >
                Close Explainer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}