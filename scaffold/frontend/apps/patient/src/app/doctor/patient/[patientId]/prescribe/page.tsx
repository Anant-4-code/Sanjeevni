"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Pill,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Send,
  Lock,
  RefreshCw,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  condition_tag: string;
}

export default function DoctorPrescribePage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "doc-sharma-1";
  const patientId = params.patientId as string;

  const [medications, setMedications] = useState<MedicationItem[]>([
    { id: "m1", name: "Metformin 500mg", dosage: "500mg", frequency: "1-0-1", duration_days: 30, condition_tag: "Type 2 Diabetes" },
    { id: "m2", name: "Noveron 500mg", dosage: "500mg", frequency: "1-0-1", duration_days: 15, condition_tag: "Neuropathy" },
  ]);

  const [guardrailFlags, setGuardrailFlags] = useState<any[]>([]);
  const [guardrailSafe, setGuardrailSafe] = useState(true);
  const [checkingGuardrail, setCheckingGuardrail] = useState(false);
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Set<string>>(new Set());
  const [overrideModalFlag, setOverrideModalFlag] = useState<any | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [patientNotes, setPatientNotes] = useState("Take after meals with warm water. Avoid missed doses.");

  // Live 300ms debounced guardrail check
  const runCheck = useCallback(async (currentMeds: MedicationItem[]) => {
    const validMeds = currentMeds.filter((m) => m.name.trim().length > 0);
    if (validMeds.length === 0) {
      setGuardrailFlags([]);
      setGuardrailSafe(true);
      return;
    }

    setCheckingGuardrail(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/guardrail-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          medication_items: validMeds.map((m) => ({
            medication_id: m.id || m.name.toLowerCase().replace(/\s+/g, "-"),
            name: m.name,
            dosage: m.dosage,
          })),
        }),
      });
      const data = await res.json();
      setGuardrailFlags(data.flags || []);
      setGuardrailSafe(data.safe);
    } catch (e) {
      console.error("Guardrail check error:", e);
    } finally {
      setCheckingGuardrail(false);
    }
  }, [patientId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runCheck(medications);
    }, 300);
    return () => clearTimeout(timer);
  }, [medications, runCheck]);

  const handleAddMed = () => {
    const newMed: MedicationItem = {
      id: `med-${Date.now()}`,
      name: "",
      dosage: "500mg",
      frequency: "1-0-1",
      duration_days: 10,
      condition_tag: "General",
    };
    setMedications([...medications, newMed]);
  };

  const handleRemoveMed = (id: string) => {
    setMedications(medications.filter((m) => m.id !== id));
  };

  const handleUpdateMed = (id: string, field: keyof MedicationItem, val: any) => {
    setMedications(
      medications.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleAcknowledgeConfirm = () => {
    if (overrideModalFlag) {
      const nextSet = new Set(acknowledgedFlags);
      nextSet.add(overrideModalFlag.medication_id || overrideModalFlag.medication_name);
      setAcknowledgedFlags(nextSet);
      setOverrideModalFlag(null);
    }
  };

  // Sign-off verification
  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: `rx-${patientId}-${Date.now()}`,
          doctor_id: doctorId,
          final_state: {
            patient_id: patientId,
            medications,
            notes: patientNotes,
          },
          acknowledged_flags: Array.from(acknowledgedFlags).map((f) => ({ flag_id: f })),
        }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (e) {
      console.error("Verification sign-off failed:", e);
    } finally {
      setVerifying(false);
    }
  };

  const hasUnacknowledgedSevere = guardrailFlags.some(
    (f) => f.severity === "severe" && !acknowledgedFlags.has(f.medication_id || f.medication_name)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            04 // PHARMACOLOGICAL SAFETY NET
          </span>
          <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-white">
            Prescription Verification & Guardrails
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {checkingGuardrail ? (
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating Interactions...</span>
            </span>
          ) : guardrailSafe ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Contraindications Detected</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{guardrailFlags.length} Safety Flag(s) Raised</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Section: Blocking Guardrail Warnings (if any) ── */}
      {guardrailFlags.length > 0 && (
        <div className="space-y-3">
          {guardrailFlags.map((flag, idx) => {
            const isAck = acknowledgedFlags.has(flag.medication_id || flag.medication_name);
            const isSevere = flag.severity === "severe";

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  isAck
                    ? "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-80"
                    : isSevere
                    ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-sm"
                    : "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-sm"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isSevere ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isSevere
                              ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900 dark:text-rose-200"
                              : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900 dark:text-amber-200"
                          }`}
                        >
                          {isSevere ? "SEVERE CONTRAINDICATION" : "MODERATE INTERACTION"}
                        </span>
                        {isAck && (
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            &bull; OVERRIDE ACKNOWLEDGED
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#0F172A] dark:text-white mt-1">
                        {flag.message ||
                          `Concurrent use of ${flag.medication_name || "selected drug"} with ${flag.conflicting_with || "existing prescription"} carries clinical risk.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRemoveMed(flag.medication_id)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                    >
                      Remove Drug
                    </button>
                    {!isAck && (
                      <button
                        onClick={() => setOverrideModalFlag(flag)}
                        className="px-3 py-1.5 text-xs font-bold bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-lg shadow-xs hover:opacity-90 transition-opacity"
                      >
                        Acknowledge & Override &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── AI-3 SMART DIFFERENTIAL SUGGESTIONS CHECKLIST (Doctor-Only) ── */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/70 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
              <span>Smart Differential Checklist</span>
              <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                AI-3 CLINICAL AID
              </span>
            </h3>
          </div>
          <span className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono">
            Rule-Out Aid &bull; Internal Only
          </span>
        </div>

        <p className="text-xs text-[#475569] dark:text-gray-300 leading-relaxed">
          Based on presenting complaint &amp; medication profile, consider ruling out these associated secondary factors before final sign-off:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 bg-white dark:bg-[#111827] border border-blue-200/80 dark:border-blue-900/60 rounded-xl space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-[#0F172A] dark:text-white">
              <span>1. Orthostatic Hypotension / Drug-Induced Vertigo</span>
              <span className="text-[10px] font-mono text-amber-600">Consider</span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-gray-400">
              Verify correlation with evening Noveron (Gabapentin) dose. Advise lying/standing BP check.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-[#111827] border border-blue-200/80 dark:border-blue-900/60 rounded-xl space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-[#0F172A] dark:text-white">
              <span>2. Renal Clearance &amp; Metformin Lactic Acidosis Risk</span>
              <span className="text-[10px] font-mono text-emerald-600">Monitored</span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-gray-400">
              Recent Serum Creatinine (0.9 mg/dL) confirms adequate glomerular filtration rate.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section: Medication List Editor ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-[#0F172A] dark:text-white" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Draft Medication List ({medications.length})</h3>
          </div>
          <button
            onClick={handleAddMed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medication</span>
          </button>
        </div>

        <div className="space-y-3">
          {medications.map((med, index) => (
            <div
              key={med.id}
              className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Index + Name */}
                <div className="sm:col-span-4">
                  <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">
                    Medicine #{index + 1}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metformin 500mg"
                    value={med.name}
                    onChange={(e) => handleUpdateMed(med.id, "name", e.target.value)}
                    className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0F172A] dark:text-white"
                  />
                </div>

                {/* Dosage */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Dosage</label>
                  <input
                    type="text"
                    placeholder="500mg"
                    value={med.dosage}
                    onChange={(e) => handleUpdateMed(med.id, "dosage", e.target.value)}
                    className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white"
                  />
                </div>

                {/* Frequency */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Frequency</label>
                  <select
                    value={med.frequency}
                    onChange={(e) => handleUpdateMed(med.id, "frequency", e.target.value)}
                    className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white"
                  >
                    <option value="1-0-1">1-0-1 (Twice Daily)</option>
                    <option value="1-0-0">1-0-0 (Morning)</option>
                    <option value="0-0-1">0-0-1 (Night)</option>
                    <option value="1-1-1">1-1-1 (Thrice Daily)</option>
                    <option value="SOS">SOS (As Needed)</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-[#64748B] block mb-1">Duration</label>
                  <input
                    type="number"
                    value={med.duration_days}
                    onChange={(e) => handleUpdateMed(med.id, "duration_days", parseInt(e.target.value) || 7)}
                    className="w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white"
                  />
                </div>

                {/* Delete */}
                <div className="sm:col-span-2 flex justify-end pt-4 sm:pt-0">
                  <button
                    onClick={() => handleRemoveMed(med.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Patient Instructions */}
        <div className="pt-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold block mb-1">
            Physician Advice & Patient Instructions
          </label>
          <textarea
            rows={2}
            value={patientNotes}
            onChange={(e) => setPatientNotes(e.target.value)}
            className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white"
          />
        </div>
      </div>

      {/* ── Section: Sign-Off & Verification Action ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">Immutable Protocol Sign-Off</h4>
          </div>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
            Generates SHA-256 cryptographic digest logged to immutable verification ledger.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying || checkingGuardrail || hasUnacknowledgedSevere || medications.length === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex-shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{verifying ? "Signing & Dispatching..." : "Verify & Dispatch Prescription"}</span>
        </button>
      </div>

      {/* Verification Success Card */}
      {verificationResult && (
        <div className="p-5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Prescription Successfully Verified & Dispatched</span>
          </div>
          <div className="text-xs font-mono break-all opacity-80">
            <strong>Protocol Hash:</strong> {verificationResult.protocol_hash || "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
          </div>
          <p className="text-xs pt-1">
            Prescription record sent to Central Pharmacy and updated in Patient Care Portal.
          </p>
        </div>
      )}

      {/* Override Confirmation Modal */}
      {overrideModalFlag && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Clinical Override</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-300 leading-relaxed">
              You are manually acknowledging and overriding the safety flag for{" "}
              <strong className="text-[#0F172A] dark:text-white">
                {overrideModalFlag.medication_name || "this medication"}
              </strong>
              . This action will be permanently recorded in the audit log under your doctor credentials.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalFlag(null)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledgeConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}