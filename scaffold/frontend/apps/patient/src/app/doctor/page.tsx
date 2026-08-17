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
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
const DOCTOR_ID = "demo-doctor";

type Tab = "overview" | "records_vault" | "ocr_xray" | "prescribe" | "soap" | "refills_orders";
type DocCategory = "all" | "Prescription" | "Lab Report" | "Imaging & Radiology" | "Discharge Summary";

export default function DoctorPortalPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Queue & Selected Patient
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
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
      {/* ── TOP HEADER (Consistent Pill Nav Matching Patient Theme) ── */}
      <header className="sticky top-0 z-40 px-3 pt-2.5 pb-1">
        <div className="max-w-[1650px] mx-auto glass-panel rounded-2xl px-5 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <span className="w-3 h-3 bg-[var(--fg)] rounded-full shadow-sm" />
              <span>Sanjeevani</span>
            </Link>
            <div className="h-4 w-px bg-[var(--border)]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
              DR // CLINICAL COMMAND WORKSPACE
            </span>
          </div>

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
                  <MicOff className="w-3.5 h-3.5" /> Recording Audio...
                </>
              ) : dictationProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Transcribing...
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-red-500" /> Ambient Dictation
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchQueue();
                fetchRefills();
                if (selectedPatientId) fetchPatient(selectedPatientId);
              }}
              className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors"
              title="Refresh clinical data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors"
              title="Toggle Dark / Light theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)] px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors"
            >
              <span>Patient View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center font-bold text-xs shadow-sm">
                DR
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold leading-none">Dr. Nitin Sharma</p>
                <p className="text-[10px] text-[var(--fg-muted)] font-mono">Lead Physician</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE GRID ── */}
      <div className="flex-1 max-w-[1650px] w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* ── LEFT: CONSULTATION QUEUE ── */}
        <aside className="glass-card p-5 flex flex-col h-[calc(100vh-100px)] sticky top-20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                02 // LIVE PATIENT TRIAGE
              </p>
              <h2 className="font-display text-lg font-bold">Waiting Room ({filteredQueue.length})</h2>
            </div>
            <span className="text-xs font-mono font-bold bg-[var(--bg-muted)] text-[var(--fg)] px-2.5 py-1 rounded-full border border-[var(--border)]">
              Acuity Sorted
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[var(--fg-muted)]" />
            <input
              type="text"
              placeholder="Search patient or symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)] transition-colors"
            />
          </div>

          {/* Patient Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {queueLoading ? (
              <div className="space-y-3 p-8 text-center text-xs text-[var(--fg-muted)]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--fg)]" />
                Loading consultation queue...
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--fg-muted)]">No patients in queue</div>
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
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all relative ${
                      isSelected
                        ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)] shadow-md"
                        : isCritical
                        ? "bg-red-500/10 hover:bg-red-500/15 border-red-500/30 text-[var(--fg)]"
                        : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] border-[var(--border)] text-[var(--fg)]"
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
                              ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40"
                              : isUrgent
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                          }`}
                        >
                          {isCritical ? "CRITICAL" : isUrgent ? "URGENT" : "ROUTINE"}
                        </span>
                        <span className="text-[10px] font-mono opacity-70">#{item.token_number}</span>
                      </div>
                    </div>

                    <p className={`text-xs line-clamp-1 mb-2 ${isSelected ? "opacity-90" : "text-[var(--fg-muted)]"}`}>
                      {item.chief_complaints?.text}
                    </p>

                    <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
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
        <main className="glass-card p-6 flex flex-col min-h-[calc(100vh-100px)]">
          {patientLoading ? (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)] space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--fg)]" />
              <p>Loading patient clinical profile, history & document records...</p>
            </div>
          ) : !patientData ? (
            <div className="p-16 text-center text-[var(--fg-muted)]">
              <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-[var(--fg)]">Select a patient from the queue</p>
              <p className="text-xs mt-1">Review complete medical history, inspect previous doctor docs, and verify care plans.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── HERO BANNER & PROTOCOL STATUS (MATCHING SCREENSHOT 2 & 3) ── */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] font-bold">
                      LIVE CLINICAL PROTOCOL · PHYSICIAN WORKSPACE
                    </span>
                    <span className="text-xs text-[var(--fg-muted)]">•</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      TOKEN #{patientData.patient?.token_number || 14}
                    </span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-black text-[var(--fg)]">
                    {patientData.patient?.full_name}
                  </h1>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {patientData.patient?.age} Years · {patientData.patient?.gender} · Phone: {patientData.patient?.phone} · Reg ID: {patientData.patient?.id}
                  </p>
                </div>

                {/* Right Adherence Gauge & Metric */}
                <div className="flex items-center gap-3">
                  <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] text-center min-w-[130px] flex items-center gap-3 shadow-xs">
                    {/* Radial Meter Simulation */}
                    <div className="relative w-11 h-11 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[var(--border)]"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500"
                          strokeDasharray={`${patientData.adherence_score}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black text-[var(--fg)]">
                        {Math.round(patientData.adherence_score)}%
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-mono uppercase text-[var(--fg-muted)] font-bold">COMPLIANCE</p>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Active Guard
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CRITICAL ALERT BANNER (IF ACTIVE) ── */}
              {patientData.smart_alerts && patientData.smart_alerts.length > 0 && (
                <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-[var(--fg)] flex items-start justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono font-bold uppercase bg-red-500 text-white px-2 py-0.5 rounded-full">
                          CRITICAL PATIENT ALERT
                        </span>
                        <span className="text-xs text-red-500 font-bold">Caregiver Notification Active</span>
                      </div>
                      <p className="text-xs font-bold text-[var(--fg)]">{patientData.smart_alerts[0].title}</p>
                      <p className="text-xs text-[var(--fg-muted)] mt-0.5">{patientData.smart_alerts[0].message}</p>
                    </div>
                  </div>
                  {!patientData.smart_alerts[0].acknowledged && (
                    <button
                      onClick={() => handleAcknowledgeAlert(patientData.smart_alerts[0].id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-opacity whitespace-nowrap shadow-xs"
                    >
                      Acknowledge & Dismiss
                    </button>
                  )}
                </div>
              )}

              {/* ── NAVIGATION TABS ── */}
              <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2 overflow-x-auto">
                {[
                  { id: "overview", label: "Patient Trends", icon: Activity },
                  { id: "records_vault", label: `Medical Docs & EHR (${medicalRecords.length})`, icon: FolderArchive },
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

              {/* ── TAB 1: PATIENT TRENDS & CLINICAL SUMMARY ── */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-muted)] mb-1">
                        Adherence Score (30d)
                      </p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{patientData.adherence_score}%</p>
                      <div className="w-full bg-[var(--border)] h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${patientData.adherence_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-muted)] mb-1">
                        Symptom Well-Being
                      </p>
                      <p className="text-2xl font-black text-[var(--fg)]">
                        {patientData.symptom_summary?.avg_feeling || "3.0"}
                        <span className="text-xs text-[var(--fg-muted)] font-normal"> / 5.0</span>
                      </p>
                      <p className="text-[10px] text-[var(--fg-muted)] mt-1">
                        {patientData.symptom_summary?.logs_this_month || 0} entries this month
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-muted)] mb-1">
                        Known Allergies
                      </p>
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">
                        {patientData.allergy_profile?.length || 0}
                      </p>
                      <p className="text-[10px] text-[var(--fg-muted)] mt-1">
                        {patientData.allergy_profile?.map((a: any) => a.allergen_name).join(", ") || "None"}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-muted)] mb-1">
                        Caregiver Verified
                      </p>
                      <p className="text-2xl font-black text-[var(--fg)]">
                        {patientData.caregiver_audit?.summary?.marked_by_caregiver || 0}
                      </p>
                      <p className="text-[10px] text-[var(--fg-muted)] mt-1">doses logged by family (7d)</p>
                    </div>
                  </div>

                  {/* Primary Doctors & Care Team Panel */}
                  <div className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                      Care Team & Attending Specialists
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[var(--fg)]">Dr. G. Mithun</span>
                          <span className="text-[9px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                            NEUROSURGERY
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--fg-muted)]">Manikanta Neuro Centre, Kakaji Colony</p>
                        <p className="text-[10px] font-mono text-[var(--fg-muted)] pt-1">+91 99899 85777</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[var(--fg)]">Dr. V. K. Rai</span>
                          <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            CARDIOLOGY
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--fg-muted)]">City Heart & Vascular Institute</p>
                        <p className="text-[10px] font-mono text-[var(--fg-muted)] pt-1">+91 98450 12345</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[var(--fg)]">Dr. S. K. Patel</span>
                          <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            ENDOCRINOLOGY
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--fg-muted)]">Apex Diabetes Care Labs</p>
                        <p className="text-[10px] font-mono text-[var(--fg-muted)] pt-1">+91 98220 54321</p>
                      </div>
                    </div>
                  </div>

                  {/* Cross-Doctor Polypharmacy Regimens */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                        Active Prescriptions from Other Specialists (Polypharmacy Visibility)
                      </p>
                      <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                        {patientData.active_prescriptions_others?.length || 0} active from other clinics
                      </span>
                    </div>

                    {patientData.active_prescriptions_others &&
                    patientData.active_prescriptions_others.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientData.active_prescriptions_others.map((rx: any) => (
                          <div
                            key={rx.id}
                            className="p-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] space-y-1.5"
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          selectedDocCategory === cat.id
                            ? "bg-[var(--fg)] text-[var(--bg)]"
                            : "bg-[var(--bg)] text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border)]"
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
                        className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--fg)] transition-all cursor-pointer space-y-3 group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--fg)]">
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

                  {/* Document Inspection Modal / Drawer */}
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
                  {/* Sub-header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                        04 // AI DIAGNOSTIC EVIDENCE & OCR VERIFICATION
                      </p>
                      <h3 className="font-display text-xl font-bold">Side-by-Side Review & Canvas</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                        YOLOv7-p6 Bone Model: Active
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Raw Scan & Bounding Box Viewer */}
                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-[var(--fg)]">
                          X-Ray Canvas Overlay (Fracture Detections)
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

                      {/* Canvas Element */}
                      <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-black flex items-center justify-center min-h-[300px]">
                        <canvas
                          ref={canvasRef}
                          width={360}
                          height={300}
                          style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease" }}
                          className="rounded-lg max-w-full"
                        />
                      </div>

                      {/* Canvas Controls */}
                      <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] space-y-2">
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
                            <span className="text-red-500 font-bold">🔴 Fracture (YOLO 92%)</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showAnomalyBox}
                              onChange={(e) => setShowAnomalyBox(e.target.checked)}
                            />
                            <span className="text-amber-500 font-bold">🟡 Bone Anomaly</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right: Side-by-Side OCR Verification */}
                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-[var(--fg)]">
                          Side-by-Side OCR Verification (Editable)
                        </span>
                        {ocrEdited && (
                          <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            doctor_edited = true
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto">
                        {ocrFields.map((field, idx) => (
                          <div key={idx} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-[var(--fg-muted)] uppercase">
                                DRUG ITEM #{idx + 1}
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
                                  className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] font-bold text-emerald-600 dark:text-emerald-400"
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
                        className="w-full py-2.5 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        Adopt Verified OCR Fields into Prescription &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: PRESCRIBE & PHARMACOLOGICAL GUARDRAILS (DR-4 & DR-5) ── */}
              {activeTab === "prescribe" && (
                <div className="space-y-6">
                  {/* Guardrail Warning Banner */}
                  {!guardrailResult.safe && guardrailResult.flags.length > 0 && (
                    <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-[var(--fg)] space-y-3 animate-fade-in shadow-xs">
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
                            // Remove offending medication
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
                          className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center"
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
                              className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
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

                    {/* Immutable Sign-off Action */}
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
                        className="w-full sm:w-auto px-6 py-3 bg-[var(--fg)] text-[var(--bg)] rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md"
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
                      className="px-3 py-1.5 text-xs font-bold border border-[var(--border)] rounded-xl bg-[var(--bg)] hover:bg-[var(--bg-muted)] transition-colors"
                    >
                      {isEditingSoap ? "Save Changes" : "Edit Note"}
                    </button>
                  </div>

                  {dictationProcessing ? (
                    <div className="p-8 text-center bg-[var(--bg)] rounded-2xl border border-[var(--border)] space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--fg)]" />
                      <p className="text-xs font-bold">Transcribing & Generating Structured SOAP Note...</p>
                    </div>
                  ) : soapNote ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(soapNote).map(([key, val]: [string, any]) => (
                        <div key={key} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] space-y-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[var(--fg)] text-[var(--bg)]">
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
                              className="w-full p-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--fg)]"
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
                    <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-2xl">
                      <Mic className="w-8 h-8 mx-auto text-[var(--fg-muted)] mb-2" />
                      <p className="text-sm font-bold text-[var(--fg)]">No Audio Dictation Recorded</p>
                      <p className="text-xs text-[var(--fg-muted)] mt-1">
                        Click "Ambient Dictation" in the top bar to record and auto-generate SOAP notes.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 6: REFILLS & DIAGNOSTIC LAB ORDERS (DR-7 & DR-8) ── */}
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
                        className="p-2 border border-[var(--border)] rounded-xl bg-[var(--bg)] hover:bg-[var(--bg-muted)]"
                      >
                        <RefreshCw className="w-4 h-4 text-[var(--fg-muted)]" />
                      </button>
                    </div>

                    {refills.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-2xl text-[var(--fg-muted)]">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                        <p className="text-xs font-medium">All medication refill requests are clear.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {refills.map((refill) => (
                          <div
                            key={refill.id}
                            className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                                placeholder="Clinical instructions..."
                                value={refillNotes[refill.id] || ""}
                                onChange={(e) =>
                                  setRefillNotes({ ...refillNotes, [refill.id]: e.target.value })
                                }
                                className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--fg)] focus:outline-none"
                              />
                              <button
                                onClick={() => handleApproveRefill(refill.id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDenyRefill(refill.id)}
                                className="px-3 py-1.5 bg-[var(--bg-muted)] text-[var(--fg)] rounded-xl text-xs font-bold hover:opacity-80 transition-opacity"
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
                        Diagnostic Order Placement (Direct Lab Workbench Fan-Out)
                      </p>
                      <h3 className="font-display text-xl font-bold">Diagnostic Lab Orders</h3>
                    </div>

                    {labSuccess && (
                      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        ✓ Diagnostic order dispatched to Lab Workbench!
                      </div>
                    )}

                    {/* Order Placement Form */}
                    <form onSubmit={handlePlaceLabOrder} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] space-y-3">
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
                        className="px-4 py-2 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
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
                          className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-between"
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
                            {order.patient_summary && (
                              <p className="text-[11px] text-[var(--fg-muted)] italic mt-0.5">
                                Plain-language: &ldquo;{order.patient_summary}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[var(--fg-muted)]">By {order.ordered_by}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Follow-Up Scheduler Panel */}
                  <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-[var(--fg-muted)]">
                        Automated Patient Reminder Scheduling
                      </p>
                      <h3 className="font-display text-xl font-bold">Schedule Follow-Up Consultation</h3>
                    </div>

                    {followUpSuccess && (
                      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        ✓ Follow-up appointment scheduled! Automated patient reminder dispatched.
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
                          Follow-Up Date
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--fg)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-[var(--fg-muted)] block mb-1">
                          Clinical Reason
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HbA1c review & BP titration"
                          value={followUpReason}
                          onChange={(e) => setFollowUpReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--fg)] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleScheduleFollowUp}
                      className="px-4 py-2 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
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
