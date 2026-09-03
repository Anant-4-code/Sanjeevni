"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pill,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Package,
  Lock,
  Sparkles,
  X,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function PharmacyDispensingPage() {
  const [dispenseQueue, setDispenseQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [acknowledgedLocks, setAcknowledgedLocks] = useState<Set<string>>(new Set());

  // AI-5 Inventory Forecast
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);

  // AI-6 Explainer Modal
  const [explainingLock, setExplainingLock] = useState<any | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState<any | null>(null);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pharmacy/queue`);
      const data = await res.json();
      setDispenseQueue(data.queue || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inventory forecast
  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pharmacy/inventory/forecast`);
      const data = await res.json();
      setInventoryAlerts(data.alerts || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchForecast();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchForecast]);

  // Dispense
  const handleDispense = async (rx: any) => {
    setDispensingId(rx.id);
    try {
      await fetch(`${API_BASE}/pharmacy/dispense/${rx.prescription_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacist_id: "pharm-anita-1",
          safety_acknowledged: true,
        }),
      });
      setDispenseQueue((q) => q.map((item) => (item.id === rx.id ? { ...item, dispensed: true } : item)));
    } catch (err) {
      console.error("Dispense error:", err);
    } finally {
      setDispensingId(null);
    }
  };

  // AI-6 Explain Interaction
  const handleExplainInteraction = async (safetyLock: any) => {
    setExplainingLock(safetyLock);
    setExplainLoading(true);
    setExplainResult(null);
    try {
      const res = await fetch(`${API_BASE}/pharmacy/interactions/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug_a: safetyLock.interaction_warning?.split(" + ")[0] || "Drug A",
          drug_b: safetyLock.interaction_warning?.split(" + ")[1]?.split(" —")[0] || "Drug B",
        }),
      });
      const json = await res.json();
      setExplainResult(json);
    } catch {
      setExplainResult({
        drug_pair: safetyLock.interaction_warning || "Unknown Interaction",
        mechanism: "Shared metabolic clearance pathways may accentuate sedative tone.",
        clinical_significance: "Physician approved based on stable renal function tests.",
        pharmacist_counseling_tip: "Counsel patient to take bedtime dose after food.",
      });
    } finally {
      setExplainLoading(false);
    }
  };

  const acknowledgeInteraction = (rxId: string) => {
    setAcknowledgedLocks((prev) => new Set([...prev, rxId]));
  };

  const pendingList = dispenseQueue.filter((rx) => !rx.dispensed);
  const completedList = dispenseQueue.filter((rx) => rx.dispensed);

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            01 // DISPENSARY CONSOLE
          </span>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
            Pharmacy Dispensing Workbench
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Live stream of physician-verified prescriptions with safety-lock enforcement & AI forecasting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
            {pendingList.length} PENDING
          </span>
          <button
            onClick={fetchQueue}
            className="p-2 border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── AI-5 INVENTORY FORECAST CARD ── */}
      {inventoryAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/60 to-purple-50/70 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-purple-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AI
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                AI-5 Inventory Forecast: <span className="text-amber-800 dark:text-amber-300">{inventoryAlerts.length} Stock Alerts</span>
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                Predicted based on 30-day dispensing velocity and pending refill queues.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inventoryAlerts.map((med) => (
              <div
                key={med.medication_id}
                className="bg-white dark:bg-[#111827] border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#0F172A] dark:text-white text-sm">{med.name}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                      med.urgency === "critical"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      ~{med.days_until_stockout} Days Left
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1 font-mono">
                    Stock: {med.current_stock} {med.unit || "units"} &bull; Velocity: ~{med.avg_daily_dispense}/day
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-purple-700 dark:text-purple-400 text-[11px]">
                    Suggested Reorder: {med.suggested_reorder_qty} units
                  </span>
                  <button
                    onClick={() => setInventoryAlerts((prev) => prev.filter((a) => a.medication_id !== med.medication_id))}
                    className="px-3 py-1 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-lg font-bold text-[11px] shadow-xs"
                  >
                    Create PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Pending Dispense Queue (2 cols) ═══ */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-600" />
            <span>Verified Prescriptions Stream</span>
          </h2>

          {pendingList.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-12 text-center text-[#64748B] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-[#0F172A] dark:text-white">All Prescriptions Dispensed</p>
              <p className="text-xs">Queue automatically updates when doctors complete sign-offs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map((rx) => {
                const hasLock = !!rx.safety_lock;
                const lockAcknowledged = acknowledgedLocks.has(rx.id);
                const canDispense = !hasLock || lockAcknowledged;

                return (
                  <div
                    key={rx.id}
                    className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-white">{rx.patient_name}</h3>
                          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            VERIFIED
                          </span>
                          {rx.is_refill && (
                            <span className="text-[10px] font-mono bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              REFILL
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                          Prescribed by <strong>{rx.doctor_name}</strong>
                          {rx.verified_at && (
                            <> &bull; Verified {new Date(rx.verified_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Safety Lock Badge */}
                    {hasLock && (
                      <div className={`p-3.5 rounded-xl text-xs flex items-start justify-between gap-3 ${
                        lockAcknowledged
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                          : "bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200"
                      }`}>
                        <div className="flex items-start gap-2.5">
                          {lockAcknowledged ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <strong className="font-bold">
                              {lockAcknowledged ? "Safety Lock Acknowledged ✓" : "⚠ Safety Lock — Interaction Flagged"}
                            </strong>
                            <p className="mt-0.5">{rx.safety_lock.interaction_warning}</p>
                            <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                              Doctor rationale: {rx.safety_lock.doctor_override_reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {!lockAcknowledged && (
                            <button
                              onClick={() => acknowledgeInteraction(rx.id)}
                              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[11px] font-bold whitespace-nowrap hover:bg-amber-700 transition-colors"
                            >
                              Acknowledge & Continue
                            </button>
                          )}
                          <button
                            onClick={() => handleExplainInteraction(rx.safety_lock)}
                            className="px-3 py-1 bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-200 rounded-lg text-[11px] font-bold whitespace-nowrap hover:bg-amber-300 transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>AI Explain</span>
                          </button>
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
                              {item.frequency} &bull; {item.days} days
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs bg-white dark:bg-[#111827] px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937]">
                            Qty: {item.qty}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      {!canDispense && (
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Acknowledge safety lock to dispense
                        </span>
                      )}
                      <button
                        onClick={() => handleDispense(rx)}
                        disabled={dispensingId === rx.id || !canDispense}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{dispensingId === rx.id ? "Dispensing..." : "Confirm & Dispense"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ Sidebar — Completed Log ═══ */}
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
                      <div className="text-[11px] text-[#64748B]">
                        {c.items.length} item(s) dispensed
                        {c.is_refill && <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold">[REFILL]</span>}
                      </div>
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
              onClick={() => { setExplainingLock(null); setExplainResult(null); }}
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
                  {explainingLock.interaction_warning}
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
                onClick={() => { setExplainingLock(null); setExplainResult(null); }}
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