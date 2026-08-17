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
  ZoomIn,
  ZoomOut,
  FlaskConical,
  Check,
  X,
  Lock,
  FolderArchive,
  Sun,
  Moon,
  ExternalLink,
  Bone,
  Building2,
  User,
  HeartPulse,
  TrendingUp,
  Camera,
  QrCode,
  History,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const DOCTOR_ID = "demo-doctor";

type Tab = "timeline" | "records_vault" | "ocr_xray" | "prescribe" | "soap" | "refills_orders";
type DocCategory = "all" | "Prescription" | "Lab Report" | "Imaging & Radiology" | "Discharge Summary";

/* ── Adherence Ring (Matching Patient Dashboard Stroke-Only SVG) ─────────────────── */
function AdherenceRing({ score, size = 110 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = "#10B981"; // Emerald
  if (score < 50) strokeColor = "#EF4444"; // Red
  else if (score < 80) strokeColor = "#F59E0B"; // Amber

  return (
    <div className="flex-shrink-0 relative group">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--border)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeColor}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          className="fill-[var(--fg)] font-extrabold"
          fontSize="26"
        >
          {score}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          textAnchor="middle"
          className="fill-[var(--fg-muted)] font-semibold uppercase tracking-wider"
          fontSize="9"
        >
          compliance
        </text>
      </svg>
    </div>
  );
}

export default function DoctorPortalPage() {
  const { user } = useAuth();

  // Queue & Selected Patient
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>("patient-vikram");
  const [patientData, setPatientData] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [searchQuery, setSearchQuery] = useState("");

  // Medical Records Vault State
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [selectedDocCategory, setSelectedDocCategory] = useState<DocCategory>("all");
  const [recordSearchQuery, setRecordSearchQuery] = useState("");
  const [inspectedDoc, setInspectedDoc] = useState<any | null>(null);

  // Prescribing State
  const [draftMeds, setDraftMeds] = useState<any[]>([
    { medication_id: "med-1", name: "Atenolol 50mg", dosage: "50mg", frequency: "1-0-0", duration_days: 30, condition_tag: "HEART CARE" },
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
  const [refillNotes, setRefillNotes] = useState<Record<string, string>>({});

  // Diagnostic Lab Orders state
  const [diagnosticOrders, setDiagnosticOrders] = useState<any[]>([]);
  const [newLabTest, setNewLabTest] = useState("Complete Blood Count (CBC)");
  const [newLabCategory, setNewLabCategory] = useState("Hematology");
  const [newLabNotes, setNewLabNotes] = useState("");
  const [labOrdering, setLabOrdering] = useState(false);
  const [labSuccess, setLabSuccess] = useState(false);

  // 1. Fetch Queue
  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      const q = data.queue || [];
      setQueue(q);
      if (q.length > 0) {
        setSelectedPatientId((prev) => prev || q[0].patient_id);
      }
    } catch (e) {
      console.error("Queue fetch error:", e);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  // 2. Fetch Selected Patient Details
  const fetchPatient = useCallback(async (patientId: string) => {
    setPatientLoading(true);
    setSignOffStatus("idle");
    setVerificationResult(null);
    setInspectedDoc(null);
    try {
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setPatientData(data);

      if (data.medical_records) {
        setMedicalRecords(data.medical_records);
      } else {
        setMedicalRecords([]);
      }

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
          { medication_id: "med-1", name: "Atenolol 50mg", dosage: "50mg", frequency: "1-0-0", duration_days: 30, condition_tag: "HEART CARE" },
        ]);
      }

      if (data.scans?.prescription_scan?.ocr_fields) {
        setOcrFields(data.scans.prescription_scan.ocr_fields);
      } else {
        setOcrFields([]);
      }

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
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setRefills(data.refill_requests || []);
    } catch (e) {
      console.error("Refill fetch error:", e);
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

  // Live Guardrail Check
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
    if (activeTab !== "ocr_xray" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0A0F1D";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(100, 40);
    ctx.bezierCurveTo(150, 100, 160, 200, 140, 280);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(180, 40);
    ctx.bezierCurveTo(220, 120, 210, 210, 190, 280);
    ctx.stroke();

    const detections = patientData?.scans?.xray_scan?.detections || [
      { label: "fracture", confidence: 0.92, box: { x: 140, y: 95, w: 75, h: 50 }, anatomical_site: "Left distal radius fracture" },
      { label: "boneanomaly", confidence: 0.78, box: { x: 210, y: 160, w: 45, h: 40 }, anatomical_site: "Mild osteopenia" },
    ];

    detections.forEach((det: any) => {
      if (det.confidence < xrayConfidenceThreshold) return;
      if (det.label === "fracture" && !showFractureBox) return;
      if (det.label === "boneanomaly" && !showAnomalyBox) return;

      const { x, y, w, h } = det.box;
      const isCritical = det.label === "fracture" || det.label === "consolidation";
      const color = isCritical ? "#DC2626" : "#D97706";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = isCritical ? "rgba(220, 38, 38, 0.15)" : "rgba(217, 119, 6, 0.15)";
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 22, 170, 22);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `${det.label.toUpperCase()} (${Math.round(det.confidence * 100)}%)`,
        x + 6,
        y - 6
      );
    });
  }, [activeTab, patientData, xrayConfidenceThreshold, showFractureBox, showAnomalyBox]);

  // Immutable Sign-Off
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
          acknowledged_flags: Array.from(acknowledgedFlags.values()),
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

  // Dictation
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
        console.error("Dictation failed:", e);
      } finally {
        setDictationProcessing(false);
      }
    } else {
      setIsRecording(true);
    }
  };

  // Refill approval
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

  // Lab order
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

  // Filtered queue
  const filteredQueue = queue.filter((q) => {
    if (!searchQuery) return true;
    const name = q.patients?.full_name?.toLowerCase() || "";
    const complaint = q.chief_complaints?.text?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || complaint.includes(searchQuery.toLowerCase());
  });

  // Filtered Medical Documents
  const filteredRecords = medicalRecords.filter((rec) => {
    const matchesCategory = selectedDocCategory === "all" || rec.category === selectedDocCategory;
    const matchesSearch =
      !recordSearchQuery ||
      rec.title.toLowerCase().includes(recordSearchQuery.toLowerCase()) ||
      rec.doctor_name.toLowerCase().includes(recordSearchQuery.toLowerCase()) ||
      rec.summary.toLowerCase().includes(recordSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* ── HERO BANNER & PROTOCOL STATUS (MATCHING SCREENSHOT 1 & 2 EXACTLY) ── */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              LIVE CLINICAL PROTOCOL · ATTENDING DOCTOR WORKSPACE
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
            Daily Dosing & Safety Schedule
          </h1>
          <p className="text-sm text-[var(--fg-muted)] max-w-xl leading-relaxed">
            Active Patient: <strong className="text-[var(--fg)] font-bold">{patientData?.patient?.full_name || "Vikram Singh"}</strong> ({patientData?.patient?.age || 52}y · {patientData?.patient?.gender || "Male"}) — Token #{patientData?.patient?.token_number || 14}. You have <strong className="text-[var(--fg)] font-bold">3 doses remaining</strong> today. Criticality-tiered monitoring is actively active.
          </p>
        </div>

        {/* Adherence Score Ring Display */}
        <div className="flex items-center gap-4 bg-[var(--bg-muted)]/50 p-4 rounded-2xl border border-[var(--border)] self-start md:self-auto shadow-inner">
          <AdherenceRing score={patientData?.adherence_score || 78} />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">Compliance Rate</p>
            <p className="text-xs text-[var(--fg-muted)] font-mono">
              {patientData?.caregiver_audit?.summary?.taken_7d || 1} of {patientData?.caregiver_audit?.summary?.total_doses_7d || 4} doses logged
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-bold">
              ● Active Guard
            </span>
          </div>
        </div>
      </div>

      {/* ── CRITICAL MISSED-DOSE ALERT BANNER (MATCHING SCREENSHOT 1) ── */}
      <div className="glass-card p-4 border-2 border-red-500 bg-red-50/70 dark:bg-red-950/30 flex items-start gap-3.5 shadow-md">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-red-600 text-white rounded-full">
              CRITICAL MISSED-DOSE ALERT
            </span>
            <span className="text-xs text-[var(--fg-muted)] font-mono">Caregiver Notification Active</span>
          </div>
          <p className="text-sm font-bold text-red-950 dark:text-red-200">
            {patientData?.smart_alerts?.[0]?.message || "You have 3 pending dose(s), including high-priority medication (Atenolol 50mg). Please review and take promptly."}
          </p>
        </div>
      </div>

      {/* ── CLINICAL CONSULTATION TABS (CORVIIN-STYLE PILL SELECTOR) ── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 overflow-x-auto">
        {[
          { id: "timeline", label: "Active Medication Timeline", icon: Clock },
          { id: "records_vault", label: `Medical Document Vault (${medicalRecords.length || 7})`, icon: FolderArchive },
          { id: "ocr_xray", label: "Side-by-Side OCR & X-Ray", icon: Eye },
          { id: "prescribe", label: "Prescribe & Safety Guardrails", icon: Pill },
          { id: "soap", label: "SOAP Dictation", icon: FileText },
          { id: "refills_orders", label: `Refills & Orders (${refills.length || 2})`, icon: FlaskConical },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === t.id
                ? "bg-[var(--fg)] text-[var(--bg)] shadow-sm"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)]"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 2-COLUMN MAIN LAYOUT (MATCHING SCREENSHOT 1 & 2 GRID: 2 COL LEFT + 1 COL RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── LEFT 2 COLUMNS (PRIMARY WORKSPACE) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── TAB 1: ACTIVE MEDICATION TIMELINE ── */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--fg)]" />
                  Active Medication Timeline
                </h2>
                <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold px-3 py-1 border border-[var(--border)] glass-panel rounded-full shadow-sm">
                  MON, AUG 17
                </span>
              </div>

              {/* Time-Grouped Schedule Cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-[var(--border)] flex-1" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold px-3 py-1 border border-[var(--border)] glass-panel rounded-full shadow-sm">
                    08:00 AM
                  </span>
                  <div className="h-px bg-[var(--border)] flex-1" />
                </div>

                <div className="glass-card p-5 space-y-3 border-2 border-[var(--border)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          IMPORTANT
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          GASTRIC CARE
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-[var(--fg)]">Pan 40mg (Pantoprazole)</h3>
                      <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                        Prescribed by Dr. Nitin Sharma · Stock: 10 days left
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
                      <CheckCircle2 className="w-4 h-4" /> TAKEN ✓
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px bg-[var(--border)] flex-1" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold px-3 py-1 border border-[var(--border)] glass-panel rounded-full shadow-sm">
                    02:00 PM
                  </span>
                  <div className="h-px bg-[var(--border)] flex-1" />
                </div>

                <div className="glass-card p-5 space-y-3 border-2 border-[var(--border)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                          CRITICAL
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          HEART CARE
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-[var(--fg)]">Atenolol 50mg (Beta Blocker)</h3>
                      <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                        Prescribed by Dr. V. K. Rai (Cardiology) · Stock: 10 days left
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[var(--fg-muted)] bg-[var(--bg-muted)] px-3 py-1.5 rounded-full">
                      Due at 02:00 PM
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px bg-[var(--border)] flex-1" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)] font-mono font-bold px-3 py-1 border border-[var(--border)] glass-panel rounded-full shadow-sm">
                    08:00 PM
                  </span>
                  <div className="h-px bg-[var(--border)] flex-1" />
                </div>

                <div className="glass-card p-5 space-y-3 border-2 border-[var(--border)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ROUTINE
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          DIABETES
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-[var(--fg)]">Metformin 500mg</h3>
                      <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                        Prescribed by Dr. S. K. Patel · Stock: 3 days left
                      </p>
                    </div>
                    <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30 font-bold">
                      Refill Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-Day Adherence vs Wellbeing Correlation Visualizer */}
              <div className="glass-card p-6 space-y-4 border-2 border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Adherence & Wellbeing Trend (Past 7 Days)
                    </h3>
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                      Display-only tracking for physician clinical evaluation.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] border border-[var(--border)] px-2.5 py-1 rounded-full">
                    7-Day Window
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {[
                    { day: "Mon", pct: 100, emoji: "😄" },
                    { day: "Tue", pct: 100, emoji: "🙂" },
                    { day: "Wed", pct: 50, emoji: "😐" },
                    { day: "Thu", pct: 75, emoji: "🙂" },
                    { day: "Fri", pct: 100, emoji: "😄" },
                    { day: "Sat", pct: 75, emoji: "🙂" },
                    { day: "Sun", pct: 25, emoji: "😔" },
                  ].map((pt, i) => (
                    <div key={i} className="flex flex-col items-center space-y-2 p-2 rounded-xl bg-[var(--bg-muted)]/50 border border-[var(--border)] text-center">
                      <span className="text-[10px] font-mono text-[var(--fg-muted)]">{pt.day}</span>
                      <div className="w-full bg-[var(--border)] h-12 rounded-lg flex items-end justify-center p-0.5">
                        <div
                          className="w-full bg-emerald-500 rounded-md transition-all"
                          style={{ height: `${pt.pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600">{pt.pct}%</span>
                      <div className="pt-1 border-t border-[var(--border)] w-full">
                        <span className="text-xs">{pt.emoji}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: MEDICAL RECORDS & DOCUMENT VAULT (COMPLETE EHR) ── */}
          {activeTab === "records_vault" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                    PATIENT ELECTRONIC HEALTH RECORD (EHR) & DOCUMENT VAULT
                  </p>
                  <h3 className="font-display text-xl font-bold">Clinical Reports & Previous Doctor Records</h3>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    placeholder="Search records or doctor..."
                    value={recordSearchQuery}
                    onChange={(e) => setRecordSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--fg)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "All Documents" },
                  { id: "Prescription", label: "Prescriptions & Notes" },
                  { id: "Lab Report", label: "Lab Diagnostic Reports" },
                  { id: "Imaging & Radiology", label: "Imaging & Scans (X-Ray, MRI)" },
                  { id: "Discharge Summary", label: "Hospital Discharges" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedDocCategory(cat.id as DocCategory)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      selectedDocCategory === cat.id
                        ? "bg-[var(--fg)] text-[var(--bg)] shadow-xs"
                        : "bg-[var(--bg-muted)] text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Document Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecords.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setInspectedDoc(doc)}
                    className="glass-card p-4 border border-[var(--border)] hover:border-[var(--fg)] transition-all cursor-pointer space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--fg)]">
                          {doc.category === "Prescription" ? (
                            <Pill className="w-4 h-4 text-emerald-500" />
                          ) : doc.category === "Lab Report" ? (
                            <FlaskConical className="w-4 h-4 text-blue-500" />
                          ) : doc.category === "Imaging & Radiology" ? (
                            <Bone className="w-4 h-4 text-purple-500" />
                          ) : (
                            <Building2 className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs group-hover:underline text-[var(--fg)]">{doc.title}</h4>
                          <p className="text-[10px] text-[var(--fg-muted)]">{doc.doctor_name} · {doc.doctor_specialty}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          doc.status === "alert"
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                            : doc.status === "warning"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {doc.badge}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--fg-muted)] line-clamp-2">{doc.summary}</p>

                    <div className="flex items-center justify-between text-[10px] text-[var(--fg-muted)] pt-2 border-t border-[var(--border)]">
                      <span>{doc.clinic}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        Inspect Document &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Document Inspection Modal */}
              {inspectedDoc && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[var(--fg-muted)]">
                          {inspectedDoc.category} · {inspectedDoc.file_type}
                        </span>
                        <h3 className="font-display text-xl font-bold text-[var(--fg)]">{inspectedDoc.title}</h3>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                          Issued by {inspectedDoc.doctor_name} ({inspectedDoc.doctor_specialty}) at {inspectedDoc.clinic}
                        </p>
                      </div>
                      <button
                        onClick={() => setInspectedDoc(null)}
                        className="p-1.5 rounded-full hover:bg-[var(--bg-muted)] text-[var(--fg-muted)]"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase text-[var(--fg-muted)] font-bold mb-1">
                          CLINICAL INTERPRETATION & FINDINGS
                        </p>
                        <p className="text-xs text-[var(--fg)] leading-relaxed bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                          {inspectedDoc.summary}
                        </p>
                      </div>

                      {inspectedDoc.findings && inspectedDoc.findings.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-mono uppercase text-[var(--fg-muted)] font-bold">
                            EXTRACTED BIOMARKERS & OBSERVATIONS
                          </p>
                          <div className="space-y-1.5">
                            {inspectedDoc.findings.map((f: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-[var(--fg)]">{f.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{f.value}</span>
                                  {f.normal_range && (
                                    <span className="text-[10px] text-[var(--fg-muted)] font-mono">
                                      (Ref: {f.normal_range})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-mono uppercase text-[var(--fg-muted)] font-bold mb-1">
                          PLAIN-LANGUAGE PATIENT TRANSLATION
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 italic bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          &ldquo;{inspectedDoc.plain_language}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={() => setInspectedDoc(null)}
                        className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-muted)]"
                      >
                        Close Document
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: SIDE-BY-SIDE OCR & X-RAY CANVAS ── */}
          {activeTab === "ocr_xray" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-4 border border-[var(--border)] flex flex-col space-y-3">
                  <span className="text-xs font-mono font-bold uppercase text-[var(--fg)]">
                    X-Ray Canvas Overlay (YOLO Detections)
                  </span>
                  <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-black flex items-center justify-center min-h-[280px]">
                    <canvas
                      ref={canvasRef}
                      width={360}
                      height={280}
                      style={{ transform: `scale(${zoomLevel})` }}
                      className="rounded-lg max-w-full"
                    />
                  </div>
                  <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] flex items-center justify-between text-xs font-mono">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showFractureBox}
                        onChange={(e) => setShowFractureBox(e.target.checked)}
                      />
                      <span className="text-red-500 font-bold">🔴 Fracture (92%)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAnomalyBox}
                        onChange={(e) => setShowAnomalyBox(e.target.checked)}
                      />
                      <span className="text-amber-500 font-bold">🟡 Anomaly</span>
                    </label>
                  </div>
                </div>

                <div className="glass-card p-4 border border-[var(--border)] flex flex-col space-y-3">
                  <span className="text-xs font-mono font-bold uppercase text-[var(--fg)]">
                    Side-by-Side OCR Verification
                  </span>
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                    {ocrFields.map((field, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-[var(--fg-muted)] uppercase">
                            DRUG #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            {Math.round(field.confidence * 100)}% confidence
                          </span>
                        </div>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const next = [...ocrFields];
                            next[idx].name = e.target.value;
                            setOcrFields(next);
                            setOcrEdited(true);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--fg)]"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
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
                    className="w-full py-2.5 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Adopt Verified OCR Fields into Prescription &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: PRESCRIBE & LIVE GUARDRAILS ── */}
          {activeTab === "prescribe" && (
            <div className="space-y-6">
              {!guardrailResult.safe && guardrailResult.flags.length > 0 && (
                <div className="glass-card p-4 border-2 border-red-500 bg-red-50/70 dark:bg-red-950/30 text-[var(--fg)] space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400">
                        ⚠ SEVERE PHARMACOLOGICAL INTERACTION DETECTED
                      </p>
                      {guardrailResult.flags.map((flag, idx) => (
                        <p key={idx} className="text-xs text-[var(--fg)] mt-1">
                          {flag.medication_name} conflicts with {flag.conflicting_with}: {flag.message}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>

                <div className="space-y-3">
                  {draftMeds.map((med, idx) => (
                    <div
                      key={med.medication_id || idx}
                      className="glass-card p-4 border border-[var(--border)] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Drug name"
                        value={med.name}
                        onChange={(e) => {
                          const next = [...draftMeds];
                          next[idx].name = e.target.value;
                          setDraftMeds(next);
                        }}
                        className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)]"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) => {
                          const next = [...draftMeds];
                          next[idx].dosage = e.target.value;
                          setDraftMeds(next);
                        }}
                        className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)]"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) => {
                          const next = [...draftMeds];
                          next[idx].frequency = e.target.value;
                          setDraftMeds(next);
                        }}
                        className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)]"
                      />
                      <input
                        type="text"
                        placeholder="Condition Tag"
                        value={med.condition_tag || ""}
                        onChange={(e) => {
                          const next = [...draftMeds];
                          next[idx].condition_tag = e.target.value.toUpperCase();
                          setDraftMeds(next);
                        }}
                        className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-emerald-600 dark:text-emerald-400 font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Days"
                        value={med.duration_days}
                        onChange={(e) => {
                          const next = [...draftMeds];
                          next[idx].duration_days = parseInt(e.target.value) || 1;
                          setDraftMeds(next);
                        }}
                        className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)]"
                      />
                      <button
                        onClick={() => setDraftMeds(draftMeds.filter((_, i) => i !== idx))}
                        className="p-2 text-[var(--fg-muted)] hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleVerifyPrescription}
                  className="px-6 py-3 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md"
                >
                  {signOffStatus === "signing"
                    ? "Signing & Verifying..."
                    : signOffStatus === "verified"
                    ? "✓ Verified & Dispatched"
                    : "Verify & Dispatch Prescription &rarr;"}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 5: SOAP NOTES ── */}
          {activeTab === "soap" && (
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold">SOAP Note Analysis</h3>
              {soapNote ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(soapNote).map(([key, val]: [string, any]) => (
                    <div key={key} className="glass-card p-5 border border-[var(--border)] space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-[var(--fg)] text-[var(--bg)]">
                        {key === "S" ? "Subjective" : key === "O" ? "Objective" : key === "A" ? "Assessment" : "Plan"}
                      </span>
                      <p className="text-xs text-[var(--fg)] whitespace-pre-line">{val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center border border-dashed border-[var(--border)]">
                  <Mic className="w-8 h-8 mx-auto text-[var(--fg-muted)] mb-2" />
                  <p className="text-sm font-bold text-[var(--fg)]">No Audio Dictation Recorded</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 6: REFILLS & ORDERS ── */}
          {activeTab === "refills_orders" && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold">Medication Refills & Lab Orders</h3>
              {refills.map((refill) => (
                <div key={refill.id} className="glass-card p-4 border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-[var(--fg)]">{refill.medicine_name} ({refill.dosage})</p>
                    <p className="text-xs text-[var(--fg-muted)]">Patient: {refill.patient_name}</p>
                  </div>
                  <button
                    onClick={() => handleApproveRefill(refill.id)}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT 1 COLUMN (SIDEBAR WIDGETS MATCHING PATIENT DASHBOARD) ── */}
        <div className="space-y-6">
          {/* 1. Live Triage Queue Widget */}
          <div className="glass-card p-5 space-y-3.5 border-2 border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Triage Queue ({filteredQueue.length || 5})
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Acuity Sorted
              </span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredQueue.map((item) => {
                const isSelected = selectedPatientId === item.patient_id;
                const severity = item.chief_complaints?.severity_level || 1;
                const isCritical = severity === 3;
                const isUrgent = severity === 2;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPatientId(item.patient_id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)] shadow-sm"
                        : isCritical
                        ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-[var(--fg)]"
                        : "bg-[var(--bg-muted)]/50 hover:bg-[var(--bg-muted)] border-[var(--border)] text-[var(--fg)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold truncate max-w-[140px]">{item.patients?.full_name}</span>
                      <span
                        className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          isCritical ? "bg-red-500/20 text-red-600 dark:text-red-400" : isUrgent ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isCritical ? "CRITICAL" : isUrgent ? "URGENT" : "ROUTINE"}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate ${isSelected ? "opacity-90" : "text-[var(--fg-muted)]"}`}>
                      {item.chief_complaints?.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Care Team & Attending Specialists Card (Matching Screenshot 1 & 2) */}
          <div className="glass-card p-5 space-y-3.5 border-2 border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Care Team & Specialists
              </span>
              <span className="text-[11px] font-bold text-[var(--fg)] uppercase tracking-wider font-mono">
                MANAGE →
              </span>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--bg-muted)]/50 border border-[var(--border)]">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                GM
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold truncate text-[var(--fg)]">Dr. G. Mithun</p>
                  <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-md font-bold">
                    Lead
                  </span>
                </div>
                <p className="text-[11px] text-[var(--fg-muted)] truncate">Consultant Neuro Surgeon</p>
                <p className="text-[10px] text-[var(--fg-muted)] font-mono">Manikanta Neuro Centre, Kakaji Colony</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--fg-muted)] font-mono">
              <span>Primary Desk:</span>
              <span className="font-bold text-[var(--fg)]">+91 99899 85777</span>
            </div>
          </div>

          {/* 3. Patient Care Hub Card (Matching Screenshot 1) */}
          <div className="glass-card p-5 space-y-3.5 border-2 border-[var(--border)]">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold">
              PATIENT CARE HUB
            </span>

            <div className="space-y-2">
              <Link
                href="/vault"
                className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)] hover:border-[var(--fg)] hover:bg-[var(--bg-muted)]/50 transition-all text-left group"
              >
                <FolderArchive className="w-5 h-5 text-emerald-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold text-[var(--fg)]">Patient Vault</p>
                  <p className="text-[10px] text-[var(--fg-muted)]">Prescriptions & diagnostic scans</p>
                </div>
              </Link>

              <Link
                href="/scan-otc"
                className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)] hover:border-[var(--fg)] hover:bg-[var(--bg-muted)]/50 transition-all text-left group"
              >
                <Camera className="w-5 h-5 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold text-[var(--fg)]">OTC Safety Scanner</p>
                  <p className="text-[10px] text-[var(--fg-muted)]">Check non-prescription cold pills</p>
                </div>
              </Link>

              <Link
                href="/labs"
                className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)] hover:border-[var(--fg)] hover:bg-[var(--bg-muted)]/50 transition-all text-left group"
              >
                <FlaskConical className="w-5 h-5 text-purple-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-xs font-bold text-[var(--fg)]">Diagnostic Lab Workbench</p>
                  <p className="text-[10px] text-[var(--fg-muted)]">Live test orders & pathology sync</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
