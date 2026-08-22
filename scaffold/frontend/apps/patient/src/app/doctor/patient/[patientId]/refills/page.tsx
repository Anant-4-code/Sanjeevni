"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Calendar,
  AlertTriangle,
  Send,
  Clock,
  Pill,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

export default function DoctorRefillsAndOrdersPage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "demo-doctor";
  const patientId = params.patientId as string;

  const [refills, setRefills] = useState<any[]>([]);
  const [loadingRefills, setLoadingRefills] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({});
  const [denyModalRefill, setDenyModalRefill] = useState<any | null>(null);
  const [denyReason, setDenyReason] = useState("Requires in-person clinical assessment before further refill authorization.");

  // Lab order form state
  const [testName, setTestName] = useState("HbA1c (Glycated Hemoglobin)");
  const [category, setCategory] = useState("Diabetic Profile");
  const [clinicalNotes, setClinicalNotes] = useState("Fasting sample preferred. Routine 3-month review.");
  const [orderingLab, setOrderingLab] = useState(false);
  const [labOrderSuccess, setLabOrderSuccess] = useState<string | null>(null);

  // Follow-up state
  const [followUpDate, setFollowUpDate] = useState("2026-09-18");
  const [followUpReason, setFollowUpReason] = useState("Review blood glucose trajectory and medication tolerance");
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState<string | null>(null);

  const fetchRefills = useCallback(async () => {
    setLoadingRefills(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=${encodeURIComponent(doctorId)}`);
      const data = await res.json();
      const allRefills = data.refill_requests || [];
      // Filter for this patient if matches, otherwise show all pending
      const patientRefills = allRefills.filter((r: any) => !patientId || r.patient_id === patientId);
      // Sort by remaining days ascending (most urgent first)
      patientRefills.sort((a: any, b: any) => (a.remaining_days || 0) - (b.remaining_days || 0));
      setRefills(patientRefills);
    } catch (e) {
      console.error("Refills fetch failed:", e);
      setRefills([]);
    } finally {
      setLoadingRefills(false);
    }
  }, [doctorId, patientId]);

  useEffect(() => {
    fetchRefills();
  }, [fetchRefills]);

  const handleApprove = async (refillId: string) => {
    setActionLoading(refillId);
    try {
      await fetch(`${API_BASE}/doctor/refill-requests/${refillId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          doctor_notes: doctorNotes[refillId] || "Approved — continue same regimen and dosage.",
        }),
      });
      await fetchRefills();
    } catch (e) {
      console.error("Approve failed:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDenyConfirm = async () => {
    if (!denyModalRefill) return;
    const refillId = denyModalRefill.id;
    setActionLoading(refillId);
    try {
      await fetch(`${API_BASE}/doctor/refill-requests/${refillId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          reason: denyReason,
        }),
      });
      setDenyModalRefill(null);
      await fetchRefills();
    } catch (e) {
      console.error("Deny failed:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOrderLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderingLab(true);
    setLabOrderSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/doctor/orders/lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          test_name: testName,
          category,
          clinical_notes: clinicalNotes,
        }),
      });
      const data = await res.json();
      setLabOrderSuccess(`Diagnostic order #${data?.order?.id || "NEW"} placed and routed to Lab Workbench.`);
    } catch (e) {
      console.error("Lab order failed:", e);
    } finally {
      setOrderingLab(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedulingFollowUp(true);
    setFollowUpSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/doctor/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          scheduled_date: followUpDate,
          reason: followUpReason,
        }),
      });
      const data = await res.json();
      setFollowUpSuccess(`Follow-up scheduled for ${followUpDate}. Automated reminder dispatched.`);
    } catch (e) {
      console.error("Follow-up schedule error:", e);
    } finally {
      setSchedulingFollowUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Section: Refill Requests Queue ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
              Pending Refill Authorizations ({refills.length})
            </h3>
          </div>
          <button
            onClick={fetchRefills}
            className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A]"
          >
            <RefreshCw className={`w-3 h-3 ${loadingRefills ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>

        {loadingRefills ? (
          <p className="text-xs text-[#64748B] py-6 text-center">Loading pending refills...</p>
        ) : refills.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#64748B]">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
            <p className="font-semibold">No pending refill requests</p>
            <p className="text-[11px] mt-0.5">All medication refill requests for this patient have been addressed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refills.map((r) => {
              const isUrgent = (r.remaining_days || 0) <= 3;
              const isActioning = actionLoading === r.id;

              return (
                <div
                  key={r.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isUrgent
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
                      : "border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A] dark:text-white">{r.medicine_name}</span>
                        <span className="text-xs text-[#64748B] dark:text-gray-400 font-mono">({r.dosage} &bull; {r.frequency})</span>
                        {isUrgent && (
                          <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-full border border-rose-300">
                            🚨 CRITICAL ({r.remaining_days}d LEFT)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1">
                        Refills Issued: <strong>{r.refills_available || 1} of {r.max_refills || 3} allowed</strong> &bull; Requested: {r.requested_at || "Recent"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setDenyModalRefill(r)}
                        disabled={isActioning}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Deny Request
                      </button>

                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={isActioning}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                      >
                        {isActioning ? "Approving..." : "Approve Refill"}
                      </button>
                    </div>
                  </div>

                  {/* Doctor Notes on Approve */}
                  <div>
                    <input
                      type="text"
                      placeholder="Doctor response notes (optional: e.g. Continue same regimen)..."
                      value={doctorNotes[r.id] || ""}
                      onChange={(e) => setDoctorNotes({ ...doctorNotes, [r.id]: e.target.value })}
                      className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] dark:text-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section: Diagnostic Orders & Follow-Up Scheduler ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Place Lab Order */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <FlaskConical className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Order Diagnostic Lab Panel</h3>
          </div>

          <form onSubmit={handleOrderLab} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Test Name</label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white font-medium"
              >
                <option value="Diabetic Profile">Diabetic Profile (HbA1c, Fasting Sugar)</option>
                <option value="Biochemistry">Biochemistry (Lipid Panel, LFT, KFT)</option>
                <option value="Hematology">Hematology (CBC, ESR, Platelets)</option>
                <option value="Cardiac Biomarkers">Cardiac Biomarkers (Troponin, CK-MB)</option>
                <option value="Thyroid">Thyroid Profile (TSH, Free T3/T4)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Clinical Instructions</label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-2.5 text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={orderingLab}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{orderingLab ? "Dispatching Order..." : "Dispatch to Lab Workbench"}</span>
            </button>

            {labOrderSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{labOrderSuccess}</span>
              </div>
            )}
          </form>
        </div>

        {/* Follow-Up Scheduler */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Schedule Follow-Up Appointment</h3>
          </div>

          <form onSubmit={handleScheduleFollowUp} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Scheduled Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Clinical Reason</label>
              <textarea
                rows={4}
                value={followUpReason}
                onChange={(e) => setFollowUpReason(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-2.5 text-xs text-[#0F172A] dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={schedulingFollowUp}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{schedulingFollowUp ? "Booking..." : "Confirm & Send Patient Reminder"}</span>
            </button>

            {followUpSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{followUpSuccess}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Deny Modal */}
      {denyModalRefill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Deny Medication Refill</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-300">
              Provide a clinical reason for denying the refill request for{" "}
              <strong className="text-[#0F172A] dark:text-white">{denyModalRefill.medicine_name}</strong>.
            </p>
            <textarea
              rows={3}
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white focus:outline-none"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDenyModalRefill(null)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDenyConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}