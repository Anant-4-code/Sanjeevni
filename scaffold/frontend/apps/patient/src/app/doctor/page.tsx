"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  Search,
  RotateCcw,
  Calendar,
  Pill,
  FileText,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const DOCTOR_ID = "demo-doctor";

type Tab = "overview" | "prescribe" | "soap" | "refills";

export default function DoctorPortalPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Prescribing State
  const [draftMeds, setDraftMeds] = useState<any[]>([
    { medication_id: "med-1", name: "", dosage: "", frequency: "1-0-1", duration_days: 10 },
  ]);
  const [guardrailChecking, setGuardrailChecking] = useState(false);
  const [guardrailResult, setGuardrailResult] = useState<{ safe: boolean; flags: any[] }>({
    safe: true,
    flags: [],
  });
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Set<string>>(new Set());
  const [patientFacingNotes, setPatientFacingNotes] = useState("");
  const [signOffStatus, setSignOffStatus] = useState<"idle" | "signing" | "verified">("idle");
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Dictation / SOAP state
  const [isRecording, setIsRecording] = useState(false);
  const [dictationProcessing, setDictationProcessing] = useState(false);
  const [soapNote, setSoapNote] = useState<any>(null);
  const [isEditingSoap, setIsEditingSoap] = useState(false);

  // Refill Queue state
  const [refills, setRefills] = useState<any[]>([]);
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillNotes, setRefillNotes] = useState<Record<string, string>>({});

  // Follow-up scheduling
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [followUpSuccess, setFollowUpSuccess] = useState(false);

  // 1. Fetch Queue
  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      const q = data.queue || [];
      setQueue(q);
      if (q.length > 0 && !selectedPatientId) {
        setSelectedPatientId(q[0].patient_id);
      }
    } catch (e) {
      console.error("Queue fetch error:", e);
    } finally {
      setQueueLoading(false);
    }
  }, [selectedPatientId]);

  // 2. Fetch Selected Patient Details
  const fetchPatient = useCallback(async (patientId: string) => {
    setPatientLoading(true);
    setSignOffStatus("idle");
    setVerificationResult(null);
    try {
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setPatientData(data);
      if (data.active_prescriptions_mine && data.active_prescriptions_mine.length > 0) {
        setDraftMeds(
          data.active_prescriptions_mine.map((rx: any) => ({
            medication_id: rx.id || rx.medication_id,
            name: rx.medication_name,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration_days: rx.duration_days,
          }))
        );
      } else {
        setDraftMeds([
          { medication_id: "med-1", name: "", dosage: "", frequency: "1-0-1", duration_days: 10 },
        ]);
      }
    } catch (e) {
      console.error("Patient details error:", e);
    } finally {
      setPatientLoading(false);
    }
  }, []);

  // 3. Fetch Refills
  const fetchRefills = useCallback(async () => {
    setRefillLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setRefills(data.refill_requests || []);
    } catch (e) {
      console.error("Refills fetch error:", e);
    } finally {
      setRefillLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchRefills();
  }, [fetchQueue, fetchRefills]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatient(selectedPatientId);
    }
  }, [selectedPatientId, fetchPatient]);

  // 4. Live Guardrail Check (Debounced)
  useEffect(() => {
    if (!selectedPatientId) return;
    const validMeds = draftMeds.filter((m) => m.name && m.name.trim().length > 1);
    if (validMeds.length === 0) {
      setGuardrailResult({ safe: true, flags: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setGuardrailChecking(true);
      try {
        const res = await fetch(`${API_BASE}/doctor/guardrail-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: selectedPatientId,
            medication_items: validMeds,
          }),
        });
        const data = await res.json();
        setGuardrailResult(data);
      } catch (e) {
        console.error("Guardrail error:", e);
      } finally {
        setGuardrailChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [draftMeds, selectedPatientId]);

  // 5. Verification Sign-Off
  const handleVerifyPrescription = async () => {
    if (!selectedPatientId) return;
    setSignOffStatus("signing");
    try {
      const res = await fetch(`${API_BASE}/doctor/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: `rx-${selectedPatientId}-${Date.now()}`,
          doctor_id: DOCTOR_ID,
          final_state: {
            patient_id: selectedPatientId,
            medications: draftMeds,
            notes: patientFacingNotes,
          },
          acknowledged_flags: Array.from(acknowledgedFlags),
        }),
      });
      const data = await res.json();
      setVerificationResult(data);
      setSignOffStatus("verified");
    } catch (e) {
      console.error("Verification failed:", e);
      setSignOffStatus("idle");
    }
  };

  // 6. Dictation / SOAP note processing
  const handleToggleDictation = async () => {
    if (isRecording) {
      setIsRecording(false);
      setDictationProcessing(true);
      try {
        const res = await fetch(`${API_BASE}/doctor/dictation?prescription_id=rx-${selectedPatientId}`, {
          method: "POST",
        });
        const data = await res.json();
        setSoapNote(data.soap_note);
        setActiveTab("soap");
      } catch (e) {
        console.error("Dictation processing failed:", e);
      } finally {
        setDictationProcessing(false);
      }
    } else {
      setIsRecording(true);
    }
  };

  // 7. Refill actions
  const handleApproveRefill = async (refillId: string) => {
    try {
      await fetch(`${API_BASE}/doctor/refill-requests/${refillId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: DOCTOR_ID,
          doctor_notes: refillNotes[refillId] || "Approved — continue prescribed regimen",
        }),
      });
      fetchRefills();
      if (selectedPatientId) fetchPatient(selectedPatientId);
    } catch (e) {
      console.error("Approve refill error:", e);
    }
  };

  const handleDenyRefill = async (refillId: string) => {
    try {
      await fetch(`${API_BASE}/doctor/refill-requests/${refillId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: DOCTOR_ID,
          reason: refillNotes[refillId] || "Requires physical consultation before refill",
        }),
      });
      fetchRefills();
    } catch (e) {
      console.error("Deny refill error:", e);
    }
  };

  // 8. Follow-up appointment scheduling
  const handleScheduleFollowUp = async () => {
    if (!followUpDate || !selectedPatientId) return;
    try {
      await fetch(`${API_BASE}/doctor/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          doctor_id: DOCTOR_ID,
          scheduled_date: followUpDate,
          reason: followUpReason,
        }),
      });
      setFollowUpSuccess(true);
      setTimeout(() => setFollowUpSuccess(false), 4000);
      setFollowUpDate("");
      setFollowUpReason("");
    } catch (e) {
      console.error("Follow up error:", e);
    }
  };

  // Filtered queue
  const filteredQueue = queue.filter((q) => {
    if (!searchQuery) return true;
    const name = q.patients?.full_name?.toLowerCase() || "";
    const complaint = q.chief_complaints?.text?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || complaint.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#0F172A] flex flex-col font-sans">
      {/* ── TOP HEADER (Matching Patient Theme) ── */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E2E8F0] px-6 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm">
              S
            </div>
            <span>SANJEEVANI</span>
          </Link>
          <div className="h-4 w-px bg-[#E2E8F0]" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-[#ECFDF5] text-[#059669] px-2.5 py-1 rounded-full font-bold border border-[#6EE7B7]">
              DR // CLINICAL WORKSPACE
            </span>
          </div>
        </div>

        {/* Quick Actions & Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchQueue();
              fetchRefills();
              if (selectedPatientId) fetchPatient(selectedPatientId);
            }}
            className="p-2 text-gray-500 hover:text-black rounded-lg border border-[#E2E8F0] bg-white transition-colors"
            title="Refresh clinical data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/dashboard"
            className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white transition-colors"
          >
            Switch to Patient View &rarr;
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
            <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
              DR
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold leading-none">Dr. Nitin Sharma</p>
              <p className="text-[10px] text-[#64748B] font-mono">Lead Physician</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE GRID ── */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* ── LEFT: CONSULTATION QUEUE ── */}
        <aside className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col h-[calc(100vh-110px)] sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B]">
                02 // LIVE PATIENT TRIAGE
              </p>
              <h2 className="font-display text-xl font-bold">Waiting Room ({queue.length})</h2>
            </div>
            <span className="text-xs font-mono font-bold bg-[#F8F7F4] border border-[#E2E8F0] px-2.5 py-1 rounded-full">
              {queue.filter((q) => q.chief_complaints?.severity_level === 3).length} Critical
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search queue by name or symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A] transition-colors"
            />
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {queueLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-medium">No patients waiting in queue</p>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedPatientId === item.patient_id;
                const sev = item.chief_complaints?.severity_level || 1;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPatientId(item.patient_id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md"
                        : "bg-[#F8F7F4] hover:bg-gray-100 border-[#E2E8F0] text-[#0F172A]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm">{item.patients?.full_name}</span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : sev === 3
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : sev === 2
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {sev === 3 ? "CRITICAL" : sev === 2 ? "URGENT" : "ROUTINE"}
                      </span>
                    </div>

                    <p
                      className={`text-xs line-clamp-2 mb-2 leading-relaxed ${
                        isSelected ? "text-gray-300" : "text-[#64748B]"
                      }`}
                    >
                      {item.chief_complaints?.text}
                    </p>

                    <div
                      className={`flex items-center justify-between text-[10px] font-mono ${
                        isSelected ? "text-gray-400" : "text-gray-400"
                      }`}
                    >
                      <span>Token #{item.token_number}</span>
                      <span>
                        {item.patients?.age}y · {item.patients?.gender}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── RIGHT: PATIENT WORKSPACE ── */}
        <main className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col min-h-[calc(100vh-110px)]">
          {patientLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-3">
              <RefreshCw className="w-8 h-8 text-black animate-spin" />
              <p className="text-sm font-medium text-gray-500">Loading comprehensive clinical record...</p>
            </div>
          ) : !patientData || !patientData.patient ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-center text-gray-400">
              <Stethoscope className="w-12 h-12 mb-3 text-gray-300" />
              <h3 className="font-bold text-base text-gray-700">Select a Patient to Begin Consultation</h3>
              <p className="text-xs max-w-sm mt-1">
                Choose any patient from the waiting room to load clinical history, pharmacological checks, and prescribing workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] uppercase tracking-wider mb-1">
                    <span>ID: {patientData.patient.id}</span>
                    <span>·</span>
                    <span>{patientData.patient.gender}</span>
                    <span>·</span>
                    <span>{patientData.patient.age} Yrs</span>
                    <span>·</span>
                    <span>{patientData.patient.phone}</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0F172A]">
                    {patientData.patient.full_name}
                  </h1>
                </div>

                {/* Ambient Voice Documentation Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleDictation}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                      isRecording
                        ? "bg-red-600 text-white animate-pulse shadow-md"
                        : "bg-[#F8F7F4] text-[#0F172A] hover:bg-gray-200 border border-[#E2E8F0]"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4" /> Stop Dictating
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-red-500" /> Ambient Voice Dictation
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
                {[
                  { id: "overview", label: "Patient Record & Trends", icon: Activity },
                  { id: "prescribe", label: "Prescribe & Safety Guardrails", icon: Pill },
                  { id: "soap", label: "SOAP Notes", icon: FileText },
                  { id: "refills", label: `Refills (${refills.length})`, icon: Clock },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as Tab)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === t.id
                        ? "bg-[#0F172A] text-white shadow-sm"
                        : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F7F4]"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── TAB 1: OVERVIEW & CLINICAL CONTEXT ── */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Quick Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-1">
                        Adherence Score (30d)
                      </p>
                      <p className="text-2xl font-black text-emerald-600">
                        {patientData.adherence_score}%
                      </p>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${patientData.adherence_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-1">
                        Symptom Well-Being
                      </p>
                      <p className="text-2xl font-black text-[#0F172A]">
                        {patientData.symptom_summary?.avg_feeling || "3.0"}
                        <span className="text-xs text-gray-400 font-normal"> / 5.0</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {patientData.symptom_summary?.logs_this_month || 0} entries this month
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-1">
                        Known Allergies
                      </p>
                      <p className="text-2xl font-black text-red-600">
                        {patientData.allergy_profile?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {patientData.allergy_profile?.map((a: any) => a.allergen_name).join(", ") || "None"}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-1">
                        Caregiver Verified
                      </p>
                      <p className="text-2xl font-black text-[#0F172A]">
                        {patientData.caregiver_audit?.summary?.marked_by_caregiver || 0}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">doses logged by family (7d)</p>
                    </div>
                  </div>

                  {/* Smart Alerts */}
                  {patientData.smart_alerts && patientData.smart_alerts.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        Smart Care Alerts
                      </p>
                      <div className="space-y-2">
                        {patientData.smart_alerts.map((alert: any) => (
                          <div
                            key={alert.id}
                            className={`p-4 rounded-xl border flex items-start gap-3 ${
                              alert.severity === "critical"
                                ? "bg-red-50 border-red-200 text-red-900"
                                : alert.severity === "warning"
                                ? "bg-amber-50 border-amber-200 text-amber-900"
                                : "bg-blue-50 border-blue-200 text-blue-900"
                            }`}
                          >
                            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs uppercase tracking-wider">
                                  {alert.title}
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed">{alert.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Doctor Prescriptions */}
                  {patientData.active_prescriptions_others && patientData.active_prescriptions_others.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Other Physicians' Active Regimens (Cross-Doctor Visibility)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientData.active_prescriptions_others.map((rx: any) => (
                          <div
                            key={rx.id}
                            className="p-4 rounded-xl border border-amber-200 bg-amber-50/60"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-[#0F172A]">{rx.medication_name}</span>
                              <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                                {rx.condition_tag}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {rx.dosage} · {rx.frequency} · {rx.duration_days} days
                            </p>
                            <p className="text-[11px] text-amber-800 font-semibold mt-2">
                              Prescribed by: {rx.doctor_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visit Prep Talking Points */}
                  {patientData.visit_prep?.suggested_topics && (
                    <div className="p-5 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-3">
                      <p className="text-xs font-mono uppercase tracking-widest text-[#0F172A] font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> AI Visit Prep & Discussion Topics
                      </p>
                      <ul className="space-y-2">
                        {patientData.visit_prep.suggested_topics.map((t: string, i: number) => (
                          <li key={i} className="text-xs text-[#0F172A] flex items-start gap-2">
                            <span className="text-[#059669] font-bold mt-0.5">&#10003;</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow Up Scheduler */}
                  <div className="p-5 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-3">
                    <p className="text-xs font-mono uppercase tracking-widest text-[#64748B] font-bold">
                      Schedule Follow-Up Appointment
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-gray-500 block mb-1">DATE</label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-gray-500 block mb-1">CLINICAL REASON</label>
                        <input
                          type="text"
                          placeholder="e.g. Blood pressure review"
                          value={followUpReason}
                          onChange={(e) => setFollowUpReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleScheduleFollowUp}
                          disabled={!followUpDate}
                          className="w-full py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                          Book Follow-Up &rarr;
                        </button>
                      </div>
                    </div>
                    {followUpSuccess && (
                      <p className="text-xs font-bold text-emerald-600">
                        Follow-up scheduled! Patient reminder generated.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 2: PRESCRIBE & LIVE GUARDRAILS ── */}
              {activeTab === "prescribe" && (
                <div className="space-y-6">
                  {/* Guardrail Status Banner */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      guardrailChecking
                        ? "bg-blue-50 border-blue-200 text-blue-900"
                        : guardrailResult.safe
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-red-50 border-red-200 text-red-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider">
                        {guardrailChecking ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                            Checking pharmacological interactions across all active doctor regimens...
                          </>
                        ) : guardrailResult.safe ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            All Guardrails Clear — No Drug-Drug or Drug-Allergy Conflicts Detected
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            Pharmacological Alert — {guardrailResult.flags.length} Flag(s) Detected
                          </>
                        )}
                      </div>
                    </div>

                    {/* Flags List */}
                    {!guardrailResult.safe && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-red-200">
                        {guardrailResult.flags.map((flag, idx) => {
                          const isAck = acknowledgedFlags.has(flag.medication_id || flag.medication_name);
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                isAck
                                  ? "bg-white/80 border-gray-300 text-gray-700"
                                  : "bg-white border-red-300 text-red-900 shadow-xs"
                              }`}
                            >
                              <div>
                                <p className="font-bold">
                                  [{flag.severity.toUpperCase()}] {flag.medication_name} &harr; {flag.conflicting_with}
                                </p>
                                <p className="text-gray-600 mt-0.5 leading-relaxed">{flag.message}</p>
                              </div>
                              <button
                                onClick={() => {
                                  const next = new Set(acknowledgedFlags);
                                  const key = flag.medication_id || flag.medication_name;
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  setAcknowledgedFlags(next);
                                }}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                                  isAck
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-red-600 text-white hover:bg-red-700"
                                }`}
                              >
                                {isAck ? "✓ Overridden & Ack'd" : "Acknowledge & Override"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Medications Form */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-[#64748B]">
                        Prescription Items
                      </h3>
                      <button
                        onClick={() =>
                          setDraftMeds([
                            ...draftMeds,
                            {
                              medication_id: `med-${Date.now()}`,
                              name: "",
                              dosage: "",
                              frequency: "1-0-1",
                              duration_days: 10,
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Drug
                      </button>
                    </div>

                    <div className="space-y-3">
                      {draftMeds.map((med, idx) => (
                        <div
                          key={med.medication_id || idx}
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 items-center"
                        >
                          <div>
                            <label className="text-[10px] font-mono text-gray-500 block mb-1">
                              MEDICINE NAME
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Metformin 500mg"
                              value={med.name}
                              onChange={(e) => {
                                const next = [...draftMeds];
                                next[idx].name = e.target.value;
                                setDraftMeds(next);
                              }}
                              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-gray-500 block mb-1">
                              DOSAGE
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 500mg"
                              value={med.dosage}
                              onChange={(e) => {
                                const next = [...draftMeds];
                                next[idx].dosage = e.target.value;
                                setDraftMeds(next);
                              }}
                              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-gray-500 block mb-1">
                              FREQUENCY
                            </label>
                            <select
                              value={med.frequency}
                              onChange={(e) => {
                                const next = [...draftMeds];
                                next[idx].frequency = e.target.value;
                                setDraftMeds(next);
                              }}
                              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A]"
                            >
                              <option value="1-0-0">1-0-0 (Morning)</option>
                              <option value="0-1-0">0-1-0 (Afternoon)</option>
                              <option value="0-0-1">0-0-1 (Night)</option>
                              <option value="1-0-1">1-0-1 (Morning & Night)</option>
                              <option value="1-1-1">1-1-1 (Thrice a day)</option>
                              <option value="2-0-2">2-0-2 (Twice daily)</option>
                              <option value="as directed">As Directed</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-gray-500 block mb-1">
                              DURATION (DAYS)
                            </label>
                            <input
                              type="number"
                              value={med.duration_days}
                              onChange={(e) => {
                                const next = [...draftMeds];
                                next[idx].duration_days = parseInt(e.target.value) || 1;
                                setDraftMeds(next);
                              }}
                              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          <div className="pt-4">
                            <button
                              onClick={() => {
                                const next = draftMeds.filter((_, i) => i !== idx);
                                setDraftMeds(next);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove medication"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Patient Notes */}
                    <div>
                      <label className="text-[10px] font-mono text-gray-500 block mb-1">
                        PATIENT-FACING INSTRUCTIONS (Shown in Patient App)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Take with lukewarm water after meals. Avoid heavy dairy within 2 hours."
                        value={patientFacingNotes}
                        onChange={(e) => setPatientFacingNotes(e.target.value)}
                        className="w-full p-3 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>

                    {/* Immutable Sign-off Action */}
                    <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        {signOffStatus === "verified" && verificationResult && (
                          <div className="text-xs text-emerald-800 font-mono">
                            <p className="font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cryptographic Sign-Off Completed
                            </p>
                            <p className="text-[10px] text-gray-500 truncate max-w-xs">
                              {verificationResult.protocol_hash}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleVerifyPrescription}
                        disabled={
                          signOffStatus === "signing" ||
                          (!guardrailResult.safe &&
                            acknowledgedFlags.size < guardrailResult.flags.length)
                        }
                        className="w-full sm:w-auto px-6 py-3 bg-[#0F172A] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md"
                      >
                        {signOffStatus === "signing"
                          ? "Signing & Verifying..."
                          : signOffStatus === "verified"
                          ? "✓ Verified & Dispatched"
                          : "Verify & Dispatch Prescription &rarr;"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: SOAP NOTES & DICTATION ── */}
              {activeTab === "soap" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        Clinical Documentation
                      </p>
                      <h3 className="font-display text-xl font-bold">SOAP Note Analysis</h3>
                    </div>
                    <button
                      onClick={() => setIsEditingSoap(!isEditingSoap)}
                      className="px-3 py-1.5 text-xs font-bold border border-[#E2E8F0] rounded-xl bg-white hover:bg-gray-50 transition-colors"
                    >
                      {isEditingSoap ? "Save Changes" : "Edit Note"}
                    </button>
                  </div>

                  {dictationProcessing ? (
                    <div className="p-8 text-center bg-[#F8F7F4] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-black" />
                      <p className="text-xs font-bold">Transcribing & Generating Structured SOAP Note...</p>
                    </div>
                  ) : soapNote ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(soapNote).map(([key, val]: [string, any]) => (
                        <div key={key} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#0F172A] text-white">
                            {key === "S"
                              ? "Subjective (S)"
                              : key === "O"
                              ? "Objective (O)"
                              : key === "A"
                              ? "Assessment (A)"
                              : "Plan (P)"}
                          </span>
                          {isEditingSoap ? (
                            <textarea
                              rows={4}
                              value={val}
                              onChange={(e) =>
                                setSoapNote({ ...soapNote, [key]: e.target.value })
                              }
                              className="w-full p-2 text-xs border border-[#E2E8F0] rounded-lg bg-white"
                            />
                          ) : (
                            <p className="text-xs text-[#0F172A] leading-relaxed whitespace-pre-line">
                              {val}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center border border-dashed border-[#E2E8F0] rounded-2xl">
                      <Mic className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-700">No Audio Dictation Recorded</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click "Ambient Voice Dictation" in the top bar to record and auto-generate SOAP notes.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: REFILL QUEUE ── */}
              {activeTab === "refills" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        Pending Pharmacy Approvals
                      </p>
                      <h3 className="font-display text-xl font-bold">Medication Refill Requests</h3>
                    </div>
                    <button
                      onClick={fetchRefills}
                      className="p-2 border border-[#E2E8F0] rounded-xl bg-white hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {refills.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-[#E2E8F0] rounded-2xl text-gray-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p className="text-xs font-medium">All medication refill requests are clear.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {refills.map((refill) => (
                        <div
                          key={refill.id}
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-[#0F172A]">
                                {refill.medicine_name} ({refill.dosage})
                              </span>
                              <span className="text-[10px] font-mono uppercase font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                                {refill.remaining_days}d remaining
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              Patient: {refill.patient_name} · Refills left: {refill.refills_available}/{refill.max_refills}
                            </p>
                            {refill.request_notes && (
                              <p className="text-xs text-gray-500 italic mt-1">
                                &ldquo;{refill.request_notes}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Clinical instructions..."
                              value={refillNotes[refill.id] || ""}
                              onChange={(e) =>
                                setRefillNotes({ ...refillNotes, [refill.id]: e.target.value })
                              }
                              className="px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none"
                            />
                            <button
                              onClick={() => handleApproveRefill(refill.id)}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyRefill(refill.id)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-300 transition-colors"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
