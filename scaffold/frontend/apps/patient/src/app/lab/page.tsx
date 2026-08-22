"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  CheckCircle2,
  Upload,
  FileText,
  Activity,
  ArrowRight,
  Sparkles,
  Plus,
  RefreshCw,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface LabOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  test_name: string;
  ordered_at: string;
  status: "pending_draw" | "analyzing" | "results_ready";
}

export default function LabPortalPage() {
  const [orders, setOrders] = useState<LabOrder[]>([
    {
      id: "ord-1",
      patient_id: "patient-ramesh",
      patient_name: "Ramesh Kumar",
      doctor_name: "Dr. Nitin Sharma",
      test_name: "HbA1c & Fasting Lipid Panel",
      ordered_at: "1 hr ago",
      status: "pending_draw",
    },
    {
      id: "ord-2",
      patient_id: "patient-vikram",
      patient_name: "Vikram Singh",
      doctor_name: "Dr. Rai",
      test_name: "Complete Blood Count (CBC) & ESR",
      ordered_at: "3 hrs ago",
      status: "analyzing",
    },
    {
      id: "ord-3",
      patient_id: "patient-priya",
      patient_name: "Priya Sharma",
      doctor_name: "Dr. Patel",
      test_name: "Thyroid Profile (TSH, Free T3/T4)",
      ordered_at: "Yesterday",
      status: "results_ready",
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(orders[0]);
  const [hba1cVal, setHba1cVal] = useState("6.4");
  const [fastingGlucose, setFastingGlucose] = useState("138");
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");

  const handleUpdateStatus = (id: string, newStatus: "pending_draw" | "analyzing" | "results_ready") => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
  };

  const handlePublishResults = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("uploading");
    setTimeout(() => {
      if (selectedOrder) {
        handleUpdateStatus(selectedOrder.id, "results_ready");
      }
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    }, 1000);
  };

  const COLUMNS = [
    { key: "pending_draw", label: "01 // Pending Blood Draw", color: "border-amber-200 bg-amber-50/50" },
    { key: "analyzing", label: "02 // Analyzing in Machine", color: "border-blue-200 bg-blue-50/50" },
    { key: "results_ready", label: "03 // Results Published", color: "border-emerald-200 bg-emerald-50/50" },
  ];

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            04 // PATHOLOGY & DIAGNOSTICS
          </span>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
            Laboratory Diagnostics Workbench
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Process test requisitions, enter biomarkers, and auto-generate dual clinical/plain-language summaries.
          </p>
        </div>
      </div>

      {/* ── Section: Diagnostic Orders Kanban ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono uppercase font-bold text-[#64748B] dark:text-gray-400">
                  {col.label}
                </span>
                <span className="text-xs font-bold font-mono bg-white dark:bg-[#111827] px-2 py-0.5 rounded-md border border-[#E2E8F0] dark:border-[#1F2937]">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B] border border-dashed border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
                    No orders in this stage
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedOrder?.id === order.id
                          ? "bg-white dark:bg-[#111827] border-[#0F172A] dark:border-white shadow-md"
                          : "bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#1F2937] hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">{order.patient_name}</h4>
                        <span className="text-[10px] font-mono text-[#64748B]">{order.ordered_at}</span>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-gray-300 font-semibold mt-1">
                        {order.test_name}
                      </p>
                      <div className="text-[11px] text-[#64748B] dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span>By {order.doctor_name}</span>
                        {order.status === "pending_draw" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(order.id, "analyzing");
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            Mark Sample Drawn &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Section: Structured Biomarker Entry & AI Plain-Language Translation ── */}
      {selectedOrder && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] font-bold">
                ACTIVE LAB ENTRY // {selectedOrder.id}
              </span>
              <h3 className="font-display text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">
                {selectedOrder.patient_name} &mdash; {selectedOrder.test_name}
              </h3>
            </div>
          </div>

          <form onSubmit={handlePublishResults} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">
                  HbA1c Value (%) &mdash; Ref: &lt; 5.7% Normal, 5.7-6.4% Prediabetes, &ge; 6.5% Diabetes
                </label>
                <input
                  type="text"
                  value={hba1cVal}
                  onChange={(e) => setHba1cVal(e.target.value)}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">
                  Fasting Blood Sugar (mg/dL) &mdash; Ref: 70 - 99 mg/dL
                </label>
                <input
                  type="text"
                  value={fastingGlucose}
                  onChange={(e) => setFastingGlucose(e.target.value)}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            {/* AI Plain Language Summary Preview */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Auto-Generated Patient Plain-Language Translation (Saved to Patient Vault)</span>
              </div>
              <p className="text-emerald-950 dark:text-emerald-200 text-[11px] leading-relaxed">
                "Your 3-month average blood sugar (HbA1c) is <strong>{hba1cVal}%</strong>, which is within the borderline target range for your diabetes regimen. Fasting glucose is <strong>{fastingGlucose} mg/dL</strong>. Your doctor will review this at your next visit."
              </p>
            </div>

            <button
              type="submit"
              disabled={status === "uploading"}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{status === "uploading" ? "Publishing to Vault & Doctor Chart..." : "Publish Verified Lab Results"}</span>
            </button>

            {status === "done" && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Results published successfully! Indexed into Patient Vault & Doctor Full Record.</span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}