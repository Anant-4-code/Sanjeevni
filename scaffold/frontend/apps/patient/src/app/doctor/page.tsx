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
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  Sliders,
  FlaskConical,
  Check,
  X,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const DOCTOR_ID = "demo-doctor";

type Tab = "overview" | "ocr_xray" | "prescribe" | "soap" | "refills_orders";

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
    { medication_id: "med-1", name: "", dosage: "", frequency: "1-0-1", duration_days: 10, condition_tag: "GENERAL" },
  ]);
  const [guardrailChecking, setGuardrailChecking] = useState(false);
  const [guardrailResult, setGuardrailResult] = useState<{ safe: boolean; flags: any[] }>({
    safe: true,
    flags: [],
  });
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Set<string>>(new Set());
  const [overrideModalFlag, setOverrideModalFlag] = useState<any>(null);
  const [patientFacingNotes, setPatientFacingNotes] = useState("");
  const [signOffStatus, setSignOffStatus] = useState<"idle" | "signing" | "verified">("idle");
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // OCR Side-by-Side State
  const [ocrFields, setOcrFields] = useState<any[]>([]);
  const [ocrEdited, setOcrEdited] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // X-Ray Canvas State
  const [xrayConfidenceThreshold, setXrayConfidenceThreshold] = useState(0.7);
  const [showFractureBox, setShowFractureBox] = useState(true);
  const [showAnomalyBox, setShowAnomalyBox] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dictation / SOAP state
  const [isRecording, setIsRecording] = useState(false);
  const [dictationProcessing, setDictationProcessing] = useState(false);
  const [soapNote, setSoapNote] = useState<any>(null);
  const [isEditingSoap, setIsEditingSoap] = useState(false);

  // Refill Queue state
  const [refills, setRefills] = useState<any[]>([]);
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillNotes, setRefillNotes] = useState<Record<string, string>>({});

  // Diagnostic Lab Orders state
  const [diagnosticOrders, setDiagnosticOrders] = useState<any[]>([]);
  const [newLabTest, setNewLabTest] = useState("Complete Blood Count (CBC)");
  const [newLabCategory, setNewLabCategory] = useState("Hematology");
  const [newLabNotes, setNewLabNotes] = useState("");
  const [labOrdering, setLabOrdering] = useState(false);
  const [labSuccess, setLabSuccess] = useState(false);

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

      // Seed draft meds from active prescriptions if empty
      if (data.active_prescriptions_mine && data.active_prescriptions_mine.length > 0) {
        setDraftMeds(
          data.active_prescriptions_mine.map((rx: any) => ({
            medication_id: rx.id,
            name: rx.medication_name,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration_days: rx.duration_days,
            condition_tag: rx.condition_tag || "GENERAL",
          }))
        );
      } else {
        setDraftMeds([
          { medication_id: "med-1", name: "", dosage: "", frequency: "1-0-1", duration_days: 10, condition_tag: "GENERAL" },
        ]);
      }

      // Seed OCR fields
      if (data.scans?.prescription_scan?.ocr_fields) {
        setOcrFields(data.scans.prescription_scan.ocr_fields);
      } else {
        setOcrFields([]);
      }

      // Seed Diagnostic Orders
      if (data.diagnostic_orders) {
        setDiagnosticOrders(data.diagnostic_orders);
      } else {
        setDiagnosticOrders([]);
      }
    } catch (e) {
      console.error("Patient detail fetch error:", e);
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
      console.error("Refill fetch error:", e);
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
        console.error("Guardrail check error:", e);
      } finally {
        setGuardrailChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [draftMeds, selectedPatientId]);

  // Draw X-ray Bounding Boxes on Canvas
  useEffect(() => {
    if (activeTab !== "ocr_xray" || !canvasRef.current || !patientData?.scans?.xray_scan) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background simulated dark radiological gradient
    ctx.fillStyle = "#0A0F1D";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Anatomical bone contour simulation
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(100, 40);
    ctx.bezierCurveTo(150, 100, 160, 200, 140, 280);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(180, 40);
    ctx.bezierCurveTo(220, 120, 210, 210, 190, 280);
    ctx.stroke();

    const detections = patientData.scans.xray_scan.detections || [];
    detections.forEach((det: any) => {
      if (det.confidence < xrayConfidenceThreshold) return;
      if (det.label === "fracture" && !showFractureBox) return;
      if (det.label === "boneanomaly" && !showAnomalyBox) return;

      const { x, y, w, h } = det.box;
      const isCritical = det.label === "fracture" || det.label === "cardiomegaly";
      const color = isCritical ? "#DC2626" : "#D97706";

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Fill transparent overlay
      ctx.fillStyle = isCritical ? "rgba(220, 38, 38, 0.12)" : "rgba(217, 119, 6, 0.12)";
      ctx.fillRect(x, y, w, h);

      // Label badge
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, 160, 20);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px monospace";
      ctx.fillText(
        `${det.label.toUpperCase()} (${Math.round(det.confidence * 100)}%)`,
        x + 6,
        y - 6
      );
    });
  }, [activeTab, patientData, xrayConfidenceThreshold, showFractureBox, showAnomalyBox]);

  // 5. Immutable Sign-Off
  const handleVerifyPrescription = async () => {
    if (!selectedPatientId || !patientData) return;
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
            patient_name: patientData.patient?.full_name,
            medications: draftMeds,
            instructions: patientFacingNotes,
            signed_at: new Date().toISOString(),
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

  // 8. Place Diagnostic Lab Order
  const handlePlaceLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setLabOrdering(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/orders/lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          doctor_id: DOCTOR_ID,
          test_name: newLabTest,
          category: newLabCategory,
          clinical_notes: newLabNotes,
        }),
      });
      const data = await res.json();
      if (data.status === "created") {
        setDiagnosticOrders([data.order, ...diagnosticOrders]);
        setLabSuccess(true);
        setTimeout(() => setLabSuccess(false), 3500);
        setNewLabNotes("");
      }
    } catch (e) {
      console.error("Lab order failed:", e);
    } finally {
      setLabOrdering(false);
    }
  };

  // 9. Follow-up appointment scheduling
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

  // Acknowledge smart alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/doctor/alerts/${alertId}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: DOCTOR_ID }),
      });
      if (selectedPatientId) fetchPatient(selectedPatientId);
    } catch (e) {
      console.error("Acknowledge alert error:", e);
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
          {/* Ambient Dictation Button */}
          <button
            onClick={handleToggleDictation}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isRecording
                ? "bg-red-600 text-white animate-pulse shadow-md"
                : dictationProcessing
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-gray-50"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-3.5 h-3.5" /> Recording Ambient Audio...
              </>
            ) : dictationProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Transcript...
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-red-500" /> Ambient Voice Dictation
              </>
            )}
          </button>

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
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748B]">
                02 // LIVE PATIENT TRIAGE
              </span>
              <h2 className="font-display text-lg font-bold">Waiting Room ({filteredQueue.length})</h2>
            </div>
            <span className="text-xs font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
              Acuity Sorted
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient or symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          {/* Patient Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {queueLoading ? (
              <div className="space-y-3 p-4 text-center text-xs text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
                Loading consultation queue...
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No patients in queue</div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedPatientId === item.patient_id;
                const severity = item.chief_complaints?.severity_level || 1;
                const isCritical = severity === 3;
                const isUrgent = severity === 2;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPatientId(item.patient_id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all relative ${
                      isSelected
                        ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md"
                        : isCritical
                        ? "bg-red-50/50 hover:bg-red-50 border-red-200 text-[#0F172A]"
                        : "bg-[#F8F7F4] hover:bg-gray-100 border-[#E2E8F0] text-[#0F172A]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm truncate max-w-[160px]">
                        {item.patients?.full_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            isCritical
                              ? "bg-red-100 text-red-700 border border-red-300"
                              : isUrgent
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {isCritical ? "CRITICAL" : isUrgent ? "URGENT" : "ROUTINE"}
                        </span>
                        <span className="text-[10px] font-mono opacity-60">#{item.token_number}</span>
                      </div>
                    </div>

                    <p className={`text-xs line-clamp-1 mb-2 ${isSelected ? "text-gray-300" : "text-gray-600"}`}>
                      {item.chief_complaints?.text}
                    </p>

                    <div className="flex items-center justify-between text-[10px] opacity-70 font-mono">
                      <span>
                        {item.patients?.age}y · {item.patients?.gender}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Waiting ~12m
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── RIGHT: PHYSICIAN WORKSPACE ── */}
        <main className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col min-h-[calc(100vh-110px)]">
          {patientLoading ? (
            <div className="p-12 text-center text-xs text-gray-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-black" />
              <p>Loading patient clinical profile & history...</p>
            </div>
          ) : !patientData ? (
            <div className="p-12 text-center text-gray-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-bold text-gray-700">Select a patient from the queue</p>
              <p className="text-xs">Review clinical history, verify OCR scans, and run guardrail safety checks.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Profile Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] font-bold">
                      03 // PHYSICIAN WORKSPACE
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      TOKEN #{patientData.patient?.token_number || 14}
                    </span>
                  </div>
                  <h1 className="font-display text-2xl font-black text-[#0F172A]">
                    {patientData.patient?.full_name}
                  </h1>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {patientData.patient?.age} Years · {patientData.patient?.gender} · Phone: {patientData.patient?.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] text-center min-w-[90px]">
                    <p className="text-[9px] font-mono uppercase text-[#64748B]">Adherence</p>
                    <p className="text-base font-black text-emerald-600">{patientData.adherence_score}%</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] text-center min-w-[90px]">
                    <p className="text-[9px] font-mono uppercase text-[#64748B]">Allergies</p>
                    <p className="text-base font-black text-red-600">
                      {patientData.allergy_profile?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs (All 5 Roles / Features) */}
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
                {[
                  { id: "overview", label: "Record & Trends", icon: Activity },
                  { id: "ocr_xray", label: "Side-by-Side OCR & X-Ray", icon: Eye },
                  { id: "prescribe", label: "Prescribe & Safety Guardrails", icon: Pill },
                  { id: "soap", label: "SOAP Dictation", icon: FileText },
                  { id: "refills_orders", label: `Refills & Lab Orders (${refills.length})`, icon: FlaskConical },
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
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-1">
                        Adherence Score (30d)
                      </p>
                      <p className="text-2xl font-black text-emerald-600">{patientData.adherence_score}%</p>
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
                            className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                              alert.severity === "critical"
                                ? "bg-red-50 border-red-200 text-red-900"
                                : alert.severity === "warning"
                                ? "bg-amber-50 border-amber-200 text-amber-900"
                                : "bg-blue-50 border-blue-200 text-blue-900"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-xs">{alert.title}</p>
                                <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
                              </div>
                            </div>
                            {!alert.acknowledged ? (
                              <button
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-[#0F172A] border border-black/10 transition-colors whitespace-nowrap"
                              >
                                Acknowledge
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700">✓ Acknowledged</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Doctor Polypharmacy Regimens */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        Cross-Doctor Active Prescriptions (Polypharmacy Visibility)
                      </p>
                      <span className="text-[10px] font-mono text-gray-500">
                        {patientData.active_prescriptions_others?.length || 0} active from other specialists
                      </span>
                    </div>

                    {patientData.active_prescriptions_others &&
                    patientData.active_prescriptions_others.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientData.active_prescriptions_others.map((rx: any) => (
                          <div
                            key={rx.id}
                            className="p-3.5 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8F7F4] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#0F172A]">{rx.medication_name}</span>
                              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {rx.condition_tag || "SPECIALIST"}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              {rx.dosage} · {rx.frequency} · Prescribed by {rx.doctor_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No other active prescriptions on record.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 2: SIDE-BY-SIDE OCR & X-RAY CANVAS (DR-2 & DR-3) ── */}
              {activeTab === "ocr_xray" && (
                <div className="space-y-6">
                  {/* Sub-header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        04 // AI DIAGNOSTIC EVIDENCE & OCR VERIFICATION
                      </p>
                      <h3 className="font-display text-xl font-bold">Side-by-Side Review & Canvas</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        YOLOv7-p6 Bone Model: Active
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Raw Scan & Bounding Box Viewer */}
                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-[#0F172A]">
                          X-Ray Canvas Overlay (Fracture Detections)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.0))}
                            className="p-1 text-gray-600 hover:text-black rounded border bg-white"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
                            className="p-1 text-gray-600 hover:text-black rounded border bg-white"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Canvas Element */}
                      <div className="relative overflow-hidden rounded-xl border border-gray-300 bg-black flex items-center justify-center min-h-[300px]">
                        <canvas
                          ref={canvasRef}
                          width={360}
                          height={300}
                          style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease" }}
                          className="rounded-lg max-w-full"
                        />
                      </div>

                      {/* Canvas Controls */}
                      <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span>Confidence Threshold ({Math.round(xrayConfidenceThreshold * 100)}%)</span>
                          <input
                            type="range"
                            min="0.5"
                            max="0.95"
                            step="0.05"
                            value={xrayConfidenceThreshold}
                            onChange={(e) => setXrayConfidenceThreshold(parseFloat(e.target.value))}
                            className="w-24 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showFractureBox}
                              onChange={(e) => setShowFractureBox(e.target.checked)}
                            />
                            <span className="text-red-700 font-bold">🔴 Fracture (YOLO 92%)</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showAnomalyBox}
                              onChange={(e) => setShowAnomalyBox(e.target.checked)}
                            />
                            <span className="text-amber-700 font-bold">🟡 Bone Anomaly</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right: Side-by-Side OCR Verification */}
                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-[#0F172A]">
                          Side-by-Side OCR Verification (Editable)
                        </span>
                        {ocrEdited && (
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            doctor_edited = true
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto">
                        {ocrFields.map((field, idx) => (
                          <div key={idx} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">
                                DRUG ITEM #{idx + 1}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                {Math.round(field.confidence * 100)}% confidence
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono uppercase text-gray-500 block mb-1">
                                  Medication Name
                                </label>
                                <input
                                  type="text"
                                  value={field.name}
                                  onChange={(e) => {
                                    const next = [...ocrFields];
                                    next[idx].name = e.target.value;
                                    setOcrFields(next);
                                    setOcrEdited(true);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono uppercase text-gray-500 block mb-1">
                                  Dosage
                                </label>
                                <input
                                  type="text"
                                  value={field.dosage}
                                  onChange={(e) => {
                                    const next = [...ocrFields];
                                    next[idx].dosage = e.target.value;
                                    setOcrFields(next);
                                    setOcrEdited(true);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono uppercase text-gray-500 block mb-1">
                                  Frequency
                                </label>
                                <input
                                  type="text"
                                  value={field.frequency}
                                  onChange={(e) => {
                                    const next = [...ocrFields];
                                    next[idx].frequency = e.target.value;
                                    setOcrFields(next);
                                    setOcrEdited(true);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono uppercase text-gray-500 block mb-1">
                                  Condition Tag (Patient-Facing)
                                </label>
                                <input
                                  type="text"
                                  value={field.condition_tag}
                                  onChange={(e) => {
                                    const next = [...ocrFields];
                                    next[idx].condition_tag = e.target.value;
                                    setOcrFields(next);
                                    setOcrEdited(true);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white font-bold text-emerald-800"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          // Copy verified OCR items into draft meds
                          setDraftMeds(
                            ocrFields.map((f) => ({
                              medication_id: f.medication_id || `med-${Date.now()}`,
                              name: `${f.name} ${f.dosage}`,
                              dosage: f.dosage,
                              frequency: f.frequency,
                              duration_days: f.duration_days || 10,
                              condition_tag: f.condition_tag || "GENERAL",
                            }))
                          );
                          setActiveTab("prescribe");
                        }}
                        className="w-full py-2.5 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        Adopt Verified OCR Fields into Prescription &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: PRESCRIBE & LIVE PHARMACOLOGICAL GUARDRAILS (DR-4 & DR-5) ── */}
              {activeTab === "prescribe" && (
                <div className="space-y-6">
                  {/* Guardrail Warning Banner */}
                  {!guardrailResult.safe && guardrailResult.flags.length > 0 && (
                    <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 space-y-3 animate-fade-in shadow-xs">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-xs uppercase tracking-wider text-red-700">
                            ⚠ SEVERE PHARMACOLOGICAL INTERACTION DETECTED
                          </p>
                          {guardrailResult.flags.map((flag, idx) => (
                            <div key={idx} className="mt-1.5 p-2 bg-white/70 rounded-lg border border-red-200">
                              <p className="text-xs font-bold text-red-950">
                                {flag.medication_name} conflicts with {flag.conflicting_with}
                              </p>
                              <p className="text-xs text-red-800 mt-0.5">{flag.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200">
                        <button
                          onClick={() => {
                            // Remove offending medication
                            const offendingNames = guardrailResult.flags.map((f) => f.medication_name.toLowerCase());
                            setDraftMeds(
                              draftMeds.filter(
                                (m) => !offendingNames.some((off) => m.name.toLowerCase().includes(off))
                              )
                            );
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-100"
                        >
                          Remove Conflicting Drug
                        </button>
                        <button
                          onClick={() => setOverrideModalFlag(guardrailResult.flags[0])}
                          className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Acknowledge & Override Flag
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Override Confirmation Modal */}
                  {overrideModalFlag && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-red-200 space-y-4 shadow-xl">
                        <div className="flex items-center gap-2 text-red-600 font-bold">
                          <Lock className="w-5 h-5" />
                          <h3>Confirm Clinical Override</h3>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          You are overriding a severe pharmacological guardrail warning for{" "}
                          <strong>{overrideModalFlag.medication_name}</strong>. This override will be
                          cryptographically recorded in immutable audit logs.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-3 border-t">
                          <button
                            onClick={() => setOverrideModalFlag(null)}
                            className="px-3 py-1.5 text-xs font-bold border rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const next = new Set(acknowledgedFlags);
                              next.add(overrideModalFlag.medication_name);
                              setAcknowledgedFlags(next);
                              setOverrideModalFlag(null);
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Confirm & Log Override
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Medication Form */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold">Draft Prescriptions</h3>
                      <button
                        onClick={() =>
                          setDraftMeds([
                            ...draftMeds,
                            { medication_id: `med-${Date.now()}`, name: "", dosage: "", frequency: "1-0-1", duration_days: 10, condition_tag: "GENERAL" },
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
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center"
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
                              CONDITION TAG
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. DIABETES"
                              value={med.condition_tag || ""}
                              onChange={(e) => {
                                const next = [...draftMeds];
                                next[idx].condition_tag = e.target.value.toUpperCase();
                                setDraftMeds(next);
                              }}
                              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#0F172A] font-bold text-emerald-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-gray-500 block mb-1">
                              DAYS
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
                        PATIENT-FACING INSTRUCTIONS (Shown on Patient App Timeline)
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

              {/* ── TAB 4: SOAP NOTES & DICTATION (DR-6) ── */}
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

              {/* ── TAB 5: REFILLS & DIAGNOSTIC LAB ORDERS (DR-7 & DR-8) ── */}
              {activeTab === "refills_orders" && (
                <div className="space-y-8">
                  {/* Refill Queue */}
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
                      <div className="p-8 text-center border border-dashed border-[#E2E8F0] rounded-2xl text-gray-400">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
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

                  {/* Diagnostic Lab Orders Panel (DR-8) */}
                  <div className="space-y-4 pt-6 border-t border-[#E2E8F0]">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        Diagnostic Order Placement (Direct Lab Workbench Fan-Out)
                      </p>
                      <h3 className="font-display text-xl font-bold">Diagnostic Lab Orders</h3>
                    </div>

                    {labSuccess && (
                      <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold">
                        ✓ Diagnostic order dispatched to Lab Workbench!
                      </div>
                    )}

                    {/* Order Placement Form */}
                    <form onSubmit={handlePlaceLabOrder} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-gray-500 block mb-1">
                            Diagnostic Test
                          </label>
                          <select
                            value={newLabTest}
                            onChange={(e) => {
                              setNewLabTest(e.target.value);
                              if (e.target.value.includes("HbA1c")) setNewLabCategory("Diabetic Profile");
                              else if (e.target.value.includes("Lipid")) setNewLabCategory("Biochemistry");
                              else if (e.target.value.includes("Troponin")) setNewLabCategory("Cardiac Biomarkers");
                              else setNewLabCategory("Hematology");
                            }}
                            className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none"
                          >
                            <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                            <option value="HbA1c (Glycated Hemoglobin)">HbA1c (Glycated Hemoglobin)</option>
                            <option value="Fasting Lipid Profile">Fasting Lipid Profile</option>
                            <option value="Serum Troponin I & CK-MB">Serum Troponin I & CK-MB</option>
                            <option value="Serum Creatinine & eGFR">Serum Creatinine & eGFR</option>
                            <option value="Thyroid Profile (T3, T4, TSH)">Thyroid Profile (T3, T4, TSH)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-gray-500 block mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            value={newLabCategory}
                            readOnly
                            className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-gray-100 text-gray-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase text-gray-500 block mb-1">
                          Clinical Notes / Fasting Instructions
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Fasting sample required, check for anemia & infection"
                          value={newLabNotes}
                          onChange={(e) => setNewLabNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={labOrdering}
                        className="px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        {labOrdering ? "Placing Order..." : "Place Diagnostic Order &rarr;"}
                      </button>
                    </form>

                    {/* Existing Orders Table */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono uppercase text-[#64748B]">Recent Lab Diagnostics History</p>
                      {diagnosticOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#0F172A]">{order.test_name}</span>
                              <span
                                className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                                  order.status === "results_ready"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : order.status === "analyzing"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {order.status === "results_ready"
                                  ? "Results Ready"
                                  : order.status === "analyzing"
                                  ? "Analyzing"
                                  : "Pending Draw"}
                              </span>
                            </div>
                            {order.doctor_summary && (
                              <p className="text-xs text-emerald-800 mt-1 font-medium">{order.doctor_summary}</p>
                            )}
                            {order.patient_summary && (
                              <p className="text-[11px] text-gray-500 italic mt-0.5">
                                Plain-language: &ldquo;{order.patient_summary}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">By {order.ordered_by}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Follow-Up Scheduler Panel */}
                  <div className="space-y-4 pt-6 border-t border-[#E2E8F0]">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[#64748B]">
                        Automated Patient Reminder Scheduling
                      </p>
                      <h3 className="font-display text-xl font-bold">Schedule Follow-Up Consultation</h3>
                    </div>

                    {followUpSuccess && (
                      <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold">
                        ✓ Follow-up appointment scheduled! Automated patient reminder dispatched.
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-gray-500 block mb-1">
                          Follow-Up Date
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-gray-500 block mb-1">
                          Clinical Reason
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HbA1c review & BP titration"
                          value={followUpReason}
                          onChange={(e) => setFollowUpReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleScheduleFollowUp}
                      className="px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Book Follow-Up & Dispatch Reminder &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
