"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  FolderArchive,
  Sun,
  Moon,
  ExternalLink,
  Filter,
  FileCheck,
  HeartPulse,
  Brain,
  Bone,
  Building2,
  User,
  Info,
  TrendingUp,
  Volume2,
  Sparkles,
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
function AdherenceRing({ score, size = 100 }: { score: number; size?: number }) {
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
          strokeWidth="7"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeColor}
          strokeWidth="7"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={size / 2}
          y={size / 2 - 3}
          textAnchor="middle"
          className="fill-[var(--fg)] font-extrabold"
          fontSize="22"
        >
          {score}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          className="fill-[var(--fg-muted)] font-semibold uppercase tracking-wider"
          fontSize="8"
        >
          compliance
        </text>
      </svg>
    </div>
  );
}

export default function DoctorPortalPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Queue & Selected Patient
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
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

  // Theme Sync on Mount
  useEffect(() => {
    const currentTheme = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(currentTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

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
    setInspectedDoc(null);
    try {
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}?doctor_id=${DOCTOR_ID}`);
      const data = await res.json();
      setPatientData(data);

      // Seed Medical Records & Documents
      if (data.medical_records) {
        setMedicalRecords(data.medical_records);
      } else {
        setMedicalRecords([]);
      }

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

    const detections = patientData.scans.xray_scan.detections || [];
    detections.forEach((det: any) => {
      if (det.confidence < xrayConfidenceThreshold) return;
      if (det.label === "fracture" && !showFractureBox) return;
      if (det.label === "boneanomaly" && !showAnomalyBox) return;

      const { x, y, w, h } = det.box;
      const isCritical = det.label === "fracture" || det.label === "consolidation";
      const color = isCritical ? "#DC2626" : "#D97706";

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      // Fill transparent overlay
      ctx.fillStyle = isCritical ? "rgba(220, 38, 38, 0.15)" : "rgba(217, 119, 6, 0.15)";
      ctx.fillRect(x, y, w, h);

      // Label badge
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col font-sans transition-colors duration-300">
      {/* ── TOP HEADER (Corviin-Style Sticky Header with Floating Glass Pill) ── */}
      <header className="sticky top-0 z-40 px-3 pt-2.5 pb-1">
        <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-5 h-15 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <span className="w-3 h-3 bg-[var(--fg)] rounded-full shadow-sm" />
              <span>Sanjeevani</span>
            </Link>
            <div className="h-4 w-px bg-[var(--border)]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
              DR // CLINICAL WORKSPACE
            </span>
          </div>

          {/* Centered Navigation Tabs for Doctor */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full hover:bg-[var(--bg-muted)] transition-colors"
            >
              Patient Portal
            </Link>
            <Link
              href="/vault"
              className="px-3 py-1.5 text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full hover:bg-[var(--bg-muted)] transition-colors"
            >
              Vault
            </Link>
            <Link
              href="/calendar"
              className="px-3 py-1.5 text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full hover:bg-[var(--bg-muted)] transition-colors"
            >
              Calendar
            </Link>
            <Link
              href="/reminders"
              className="px-3 py-1.5 text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full hover:bg-[var(--bg-muted)] transition-colors"
            >
              Reminders
            </Link>
            <Link
              href="/copilot"
              className="px-3 py-1.5 text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full hover:bg-[var(--bg-muted)] transition-colors"
            >
              Copilot
            </Link>
          </nav>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Ambient Dictation Button */}
            <button
              onClick={handleToggleDictation}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                isRecording
                  ? "bg-red-600 text-white animate-pulse shadow-md"
                  : dictationProcessing
                  ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                  : "bg-[var(--bg-elevated)] text-[var(--fg)] border border-[var(--border)] hover:border-[var(--fg)]"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" /> Recording...
                </>
              ) : dictationProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Transcribing...
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-red-500" /> Dictate
                </>
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors"
              title="Toggle Dark / Light theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center font-bold text-xs shadow-sm">
                DR
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (MATCHING PATIENT DASHBOARD PADDING & WIDTH) ── */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 flex-1">
        {/* ── HERO BANNER & PROTOCOL STATUS (MATCHING SCREENSHOT 2 & 3 PIXEL-FOR-PIXEL) ── */}
        <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                LIVE CLINICAL PROTOCOL · ATTENDING DOCTOR WORKSPACE
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              Clinical Command & Patient Care Protocol
            </h1>
            <p className="text-sm text-[var(--fg-muted)] max-w-xl leading-relaxed">
              Active Patient: <strong className="text-[var(--fg)] font-bold">{patientData?.patient?.full_name || "Ramesh Kumar"}</strong> ({patientData?.patient?.age || 58}y · {patientData?.patient?.gender || "Male"}) — Token #{patientData?.patient?.token_number || 14}. Real-time cross-specialist safety monitoring active.
            </p>
          </div>

          {/* Adherence Score Ring Display */}
          <div className="flex items-center gap-4 bg-[var(--bg-muted)]/50 p-4 rounded-2xl border border-[var(--border)] self-start md:self-auto shadow-inner">
            <AdherenceRing score={patientData?.adherence_score || 78} />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">Compliance Rate</p>
              <p className="text-xs text-[var(--fg-muted)] font-mono">
                {patientData?.caregiver_audit?.summary?.taken_7d || 11} of {patientData?.caregiver_audit?.summary?.total_doses_7d || 14} doses logged
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-bold">
                ● Active Guard
              </span>
            </div>
          </div>
        </div>

        {/* ── CRITICAL MISSED-DOSE / SAFETY ALERT BANNER (MATCHING SCREENSHOT 2) ── */}
        {patientData?.smart_alerts && patientData.smart_alerts.length > 0 && (
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
                {patientData.smart_alerts[0].message}
              </p>
            </div>
            {!patientData.smart_alerts[0].acknowledged && (
              <button
                onClick={() => handleAcknowledgeAlert(patientData.smart_alerts[0].id)}
                className="px-3 py-1.5 text-xs font-bold rounded-full bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
              >
                Acknowledge Alert
              </button>
            )}
          </div>
        )}

        {/* ── CLINICAL CONSULTATION TABS (CORVIIN-STYLE PILL SELECTOR) ── */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 overflow-x-auto">
          {[
            { id: "timeline", label: "Active Medication Timeline", icon: Clock },
            { id: "records_vault", label: `Medical Document Vault (${medicalRecords.length})`, icon: FolderArchive },
            { id: "ocr_xray", label: "Side-by-Side OCR & X-Ray", icon: Eye },
            { id: "prescribe", label: "Prescribe & Safety Guardrails", icon: Pill },
            { id: "soap", label: "SOAP Dictation", icon: FileText },
            { id: "refills_orders", label: `Refills & Orders (${refills.length})`, icon: FlaskConical },
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

        {/* ── 2-COLUMN MAIN LAYOUT (MATCHING DASHBOARD GRID: 2 COL LEFT + 1 COL RIGHT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── LEFT 2 COLUMNS (PRIMARY CLINICAL WORKSPACE) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── TAB 1: ACTIVE MEDICATION TIMELINE & HISTORICAL TRENDS ── */}
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

                {/* Dose Cards List */}
                <div className="space-y-3">
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
                          Prescribed by Dr. Nitin Sharma · 08:00 AM (Morning)
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
                        <CheckCircle2 className="w-4 h-4" /> TAKEN ✓
                      </span>
                    </div>
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
                          Prescribed by Dr. S. K. Patel · 02:00 PM (Afternoon)
                        </p>
                      </div>
                      <span className="text-xs font-mono text-[var(--fg-muted)] bg-[var(--bg-muted)] px-3 py-1.5 rounded-full">
                        Due at 02:00 PM
                      </span>
                    </div>
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
                        <h3 className="font-bold text-base text-[var(--fg)]">Noveron 500mg</h3>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                          Prescribed by Dr. Nitin Sharma · 08:00 PM (Night) · 3 days remaining
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
                        Correlation view for physician clinical assessment.
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
                      { day: "Sun", pct: 50, emoji: "😔" },
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

                {/* Cross-Doctor Polypharmacy Regimens */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                      Active Prescriptions from Other Specialists (Cross-Doctor Visibility)
                    </p>
                    <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                      {patientData?.active_prescriptions_others?.length || 0} active from other clinics
                    </span>
                  </div>

                  {patientData?.active_prescriptions_others && patientData.active_prescriptions_others.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientData.active_prescriptions_others.map((rx: any) => (
                        <div
                          key={rx.id}
                          className="glass-card p-4 space-y-1.5 border border-dashed border-[var(--border)]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[var(--fg)]">{rx.medication_name}</span>
                            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {rx.condition_tag || "SPECIALIST"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--fg-muted)]">
                            {rx.dosage} · {rx.frequency} · Prescribed by {rx.doctor_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--fg-muted)] italic">No other active prescriptions on record.</p>
                  )}
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

                      {/* Summary & Findings */}
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

            {/* ── TAB 3: SIDE-BY-SIDE OCR & X-RAY CANVAS (DR-2 & DR-3) ── */}
            {activeTab === "ocr_xray" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                      04 // AI DIAGNOSTIC EVIDENCE & OCR VERIFICATION
                    </p>
                    <h3 className="font-display text-xl font-bold">Side-by-Side Review & Canvas</h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    YOLOv7-p6 Bone Model: Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Raw Scan & Bounding Box Viewer */}
                  <div className="glass-card p-4 border border-[var(--border)] flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-[var(--fg)]">
                        X-Ray Canvas Overlay (YOLO Detections)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.0))}
                          className="p-1 text-[var(--fg)] rounded border border-[var(--border)] bg-[var(--bg-elevated)]"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
                          className="p-1 text-[var(--fg)] rounded border border-[var(--border)] bg-[var(--bg-elevated)]"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-black flex items-center justify-center min-h-[280px]">
                      <canvas
                        ref={canvasRef}
                        width={360}
                        height={280}
                        style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease" }}
                        className="rounded-lg max-w-full"
                      />
                    </div>

                    <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span>Threshold ({Math.round(xrayConfidenceThreshold * 100)}%)</span>
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
                  </div>

                  {/* Right: Side-by-Side OCR Verification */}
                  <div className="glass-card p-4 border border-[var(--border)] flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-[var(--fg)]">
                        Side-by-Side OCR Verification
                      </span>
                      {ocrEdited && (
                        <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          doctor_edited = true
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px]">
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

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
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
                                className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--fg)]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
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
                                className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--fg)]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
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
                                className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--fg)]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
                                Condition Tag
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
                                className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] font-bold text-emerald-600 dark:text-emerald-400"
                              />
                            </div>
                          </div>
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

            {/* ── TAB 4: PRESCRIBE & LIVE PHARMACOLOGICAL GUARDRAILS (DR-4 & DR-5) ── */}
            {activeTab === "prescribe" && (
              <div className="space-y-6">
                {/* Guardrail Warning Banner */}
                {!guardrailResult.safe && guardrailResult.flags.length > 0 && (
                  <div className="glass-card p-4 border-2 border-red-500 bg-red-50/70 dark:bg-red-950/30 text-[var(--fg)] space-y-3 animate-fade-in shadow-md">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400">
                          ⚠ SEVERE PHARMACOLOGICAL INTERACTION DETECTED
                        </p>
                        {guardrailResult.flags.map((flag, idx) => (
                          <div key={idx} className="mt-1.5 p-2 bg-[var(--bg-elevated)] rounded-xl border border-red-500/20">
                            <p className="text-xs font-bold text-[var(--fg)]">
                              {flag.medication_name} conflicts with {flag.conflicting_with}
                            </p>
                            <p className="text-xs text-[var(--fg-muted)] mt-0.5">{flag.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-500/20">
                      <button
                        onClick={() => {
                          const offendingNames = guardrailResult.flags.map((f) => f.medication_name.toLowerCase());
                          setDraftMeds(
                            draftMeds.filter(
                              (m) => !offendingNames.some((off) => m.name.toLowerCase().includes(off))
                            )
                          );
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-[var(--bg-elevated)] text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10"
                      >
                        Remove Conflicting Drug
                      </button>
                      <button
                        onClick={() => setOverrideModalFlag(guardrailResult.flags[0])}
                        className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs"
                      >
                        Acknowledge & Override Flag
                      </button>
                    </div>
                  </div>
                )}

                {/* Override Confirmation Modal */}
                {overrideModalFlag && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-elevated)] border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                      <div className="flex items-center gap-2 text-red-500 font-bold">
                        <Lock className="w-5 h-5" />
                        <h3>Confirm Clinical Override</h3>
                      </div>
                      <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                        You are overriding a severe pharmacological guardrail warning for{" "}
                        <strong className="text-[var(--fg)]">{overrideModalFlag.medication_name}</strong>. This override will be
                        cryptographically recorded in immutable audit logs.
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                        <button
                          onClick={() => setOverrideModalFlag(null)}
                          className="px-3 py-1.5 text-xs font-bold border border-[var(--border)] rounded-xl"
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
                          className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-muted)] transition-colors"
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
                        <div>
                          <label className="text-[10px] font-mono text-[var(--fg-muted)] block mb-1">
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
                            className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[var(--fg-muted)] block mb-1">
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
                            className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[var(--fg-muted)] block mb-1">
                            FREQUENCY
                          </label>
                          <select
                            value={med.frequency}
                            onChange={(e) => {
                              const next = [...draftMeds];
                              next[idx].frequency = e.target.value;
                              setDraftMeds(next);
                            }}
                            className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
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
                          <label className="text-[10px] font-mono text-[var(--fg-muted)] block mb-1">
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
                            className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[var(--fg-muted)] block mb-1">
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
                            className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none"
                          />
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={() => {
                              const next = draftMeds.filter((_, i) => i !== idx);
                              setDraftMeds(next);
                            }}
                            className="p-2 text-[var(--fg-muted)] hover:text-red-500 transition-colors"
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
                    <label className="text-[10px] font-mono text-[var(--fg-muted)] block mb-1">
                      PATIENT-FACING INSTRUCTIONS (Shown on Patient App Timeline)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Take with lukewarm water after meals. Avoid heavy dairy within 2 hours."
                      value={patientFacingNotes}
                      onChange={(e) => setPatientFacingNotes(e.target.value)}
                      className="w-full p-3 text-xs border border-[var(--border)] rounded-2xl bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
                    />
                  </div>

                  {/* Sign-off Action */}
                  <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      {signOffStatus === "verified" && verificationResult && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                          <p className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cryptographic Sign-Off Completed
                          </p>
                          <p className="text-[10px] text-[var(--fg-muted)] truncate max-w-xs">
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
                      className="w-full sm:w-auto px-6 py-3 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md"
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

            {/* ── TAB 5: SOAP NOTES & DICTATION (DR-6) ── */}
            {activeTab === "soap" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                      Clinical Documentation
                    </p>
                    <h3 className="font-display text-xl font-bold">SOAP Note Analysis</h3>
                  </div>
                  <button
                    onClick={() => setIsEditingSoap(!isEditingSoap)}
                    className="px-4 py-2 text-xs font-bold border border-[var(--border)] rounded-full bg-[var(--bg)] hover:bg-[var(--bg-muted)] transition-colors"
                  >
                    {isEditingSoap ? "Save Changes" : "Edit Note"}
                  </button>
                </div>

                {dictationProcessing ? (
                  <div className="glass-card p-8 text-center border border-[var(--border)] space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--fg)]" />
                    <p className="text-xs font-bold">Transcribing & Generating Structured SOAP Note...</p>
                  </div>
                ) : soapNote ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(soapNote).map(([key, val]: [string, any]) => (
                      <div key={key} className="glass-card p-5 border border-[var(--border)] space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[var(--fg)] text-[var(--bg)]">
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
                            className="w-full p-2.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)]"
                          />
                        ) : (
                          <p className="text-xs text-[var(--fg)] leading-relaxed whitespace-pre-line">
                            {val}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center border border-dashed border-[var(--border)]">
                    <Mic className="w-8 h-8 mx-auto text-[var(--fg-muted)] mb-2" />
                    <p className="text-sm font-bold text-[var(--fg)]">No Audio Dictation Recorded</p>
                    <p className="text-xs text-[var(--fg-muted)] mt-1">
                      Click &ldquo;Dictate&rdquo; in the top bar to record and auto-generate structured SOAP notes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 6: REFILLS & LAB ORDERS (DR-7 & DR-8) ── */}
            {activeTab === "refills_orders" && (
              <div className="space-y-8">
                {/* Refill Queue */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                        Pending Pharmacy Approvals
                      </p>
                      <h3 className="font-display text-xl font-bold">Medication Refill Requests</h3>
                    </div>
                    <button
                      onClick={fetchRefills}
                      className="p-2 border border-[var(--border)] rounded-full bg-[var(--bg)] hover:bg-[var(--bg-muted)]"
                    >
                      <RefreshCw className="w-4 h-4 text-[var(--fg-muted)]" />
                    </button>
                  </div>

                  {refills.length === 0 ? (
                    <div className="glass-card p-8 text-center border border-dashed border-[var(--border)] text-[var(--fg-muted)]">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                      <p className="text-xs font-medium">All medication refill requests are clear.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {refills.map((refill) => (
                        <div
                          key={refill.id}
                          className="glass-card p-4 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-[var(--fg)]">
                                {refill.medicine_name} ({refill.dosage})
                              </span>
                              <span className="text-[10px] font-mono uppercase font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                                {refill.remaining_days}d remaining
                              </span>
                            </div>
                            <p className="text-xs text-[var(--fg-muted)]">
                              Patient: {refill.patient_name} · Refills left: {refill.refills_available}/{refill.max_refills}
                            </p>
                            {refill.request_notes && (
                              <p className="text-xs text-[var(--fg-muted)] italic mt-1">
                                &ldquo;{refill.request_notes}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Clinical notes..."
                              value={refillNotes[refill.id] || ""}
                              onChange={(e) =>
                                setRefillNotes({ ...refillNotes, [refill.id]: e.target.value })
                              }
                              className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none"
                            />
                            <button
                              onClick={() => handleApproveRefill(refill.id)}
                              className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyRefill(refill.id)}
                              className="px-3 py-1.5 bg-[var(--bg-muted)] text-[var(--fg)] rounded-full text-xs font-bold hover:opacity-80 transition-opacity"
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
                <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                      Diagnostic Order Placement (Direct Lab Fan-Out)
                    </p>
                    <h3 className="font-display text-xl font-bold">Diagnostic Lab Orders</h3>
                  </div>

                  {labSuccess && (
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      ✓ Diagnostic order dispatched to Lab Workbench!
                    </div>
                  )}

                  {/* Order Placement Form */}
                  <form onSubmit={handlePlaceLabOrder} className="glass-card p-5 border border-[var(--border)] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
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
                          className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none"
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
                        <label className="text-[10px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
                          Category
                        </label>
                        <input
                          type="text"
                          value={newLabCategory}
                          readOnly
                          className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-muted)] text-[var(--fg-muted)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
                        Clinical Notes / Fasting Instructions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fasting sample required, check for anemia & infection"
                        value={newLabNotes}
                        onChange={(e) => setNewLabNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={labOrdering}
                      className="px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold rounded-full hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {labOrdering ? "Placing Order..." : "Place Diagnostic Order &rarr;"}
                    </button>
                  </form>

                  {/* Existing Orders Table */}
                  <div className="space-y-2">
                    <p className="text-xs font-mono uppercase text-[var(--fg-muted)]">Recent Lab Diagnostics History</p>
                    {diagnosticOrders.map((order) => (
                      <div
                        key={order.id}
                        className="glass-card p-4 border border-[var(--border)] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[var(--fg)]">{order.test_name}</span>
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                                order.status === "results_ready"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : order.status === "analyzing"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
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
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{order.doctor_summary}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[var(--fg-muted)]">By {order.ordered_by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT 1 COLUMN (SIDEBAR: QUEUE, CARE TEAM & HUB MATCHING PATIENT DASHBOARD) ── */}
          <div className="space-y-6">
            {/* 1. Acuity Consultation Queue Widget */}
            <div className="glass-card p-5 space-y-3.5 border-2 border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Triage Queue ({filteredQueue.length})
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Acuity Sorted
                </span>
              </div>

              {/* Patient Selector List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
                            isCritical
                              ? "bg-red-500/20 text-red-600 dark:text-red-400"
                              : isUrgent
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
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

            {/* 2. Care Team & Specialists Card (Matching Screenshot 2 & 3) */}
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

              {/* Lead Doctor Display (Dr. G. Mithun) */}
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

            {/* 3. Patient Care Hub & Tools */}
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
      </main>
    </div>
  );
}
