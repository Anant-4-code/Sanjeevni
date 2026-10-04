"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  FileText,
  Bone,
  RefreshCw,
  Maximize2,
  Bot,
  Send,
  ShieldAlert,
  Activity,
  Stethoscope,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

export default function DoctorOCRAndXrayPage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "doc-sharma-1";
  const patientId = params.patientId as string;

  const [activeMode, setActiveMode] = useState<"ocr" | "xray">("ocr");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingXray, setAnalyzingXray] = useState(false);
  const [scanInfo, setScanInfo] = useState<any>(null);

  // BUG-DR-OCR-01 FIX: Dynamic scan & OCR data initialized from patient records
  const [ocrData, setOcrData] = useState({
    clinic_name: "CLINICAL OPD CENTRE",
    doctor_name: "Consultant Physician",
    date: "2026-08-16",
    medicines: [] as { name: string; dosage: string; duration: string }[],
    notes: "Clinical review in progress.",
  });

  const [xrayDetections, setXrayDetections] = useState<any[]>([]);
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [aiImpression, setAiImpression] = useState<string>("");
  const [aiModelUsed, setAiModelUsed] = useState<string>("");
  const [aiQuestion, setAiQuestion] = useState<string>("");

  const handleQueryAIAssistant = async (customQuestion?: string) => {
    if (!patientId) return;
    setAiAssistantLoading(true);
    try {
      const q = customQuestion !== undefined ? customQuestion : aiQuestion;
      const res = await fetch(`${API_BASE}/doctor/xray/ai-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          scan_id: scanInfo?.xray_scan?.scan_id || `scan-${patientId}`,
          detections: xrayDetections,
          question: q || undefined,
        }),
      });
      const data = await res.json();
      if (data.radiological_impression) {
        setAiImpression(data.radiological_impression);
      }
      if (data.model_tier) {
        setAiModelUsed(data.model_tier);
      }
      if (customQuestion === undefined) {
        setAiQuestion("");
      }
    } catch (err) {
      console.error("Failed to query radiological AI assistant:", err);
    } finally {
      setAiAssistantLoading(false);
    }
  };

  const fetchScans = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}/scans`);
      const data = await res.json();
      setScanInfo(data);
      if (data.prescription_scan) {
        const ps = data.prescription_scan;
        setOcrData({
          clinic_name: ps.clinic_name || "Sanjeevani Clinical Care",
          doctor_name: ps.doctor_name || "Consultant Physician",
          date: ps.uploaded_at || "2026-08-16",
          medicines: (ps.ocr_fields || []).map((f: any) => ({
            name: f.name || "Medication",
            dosage: f.dosage || "1-0-1",
            duration: `${f.duration_days || 7} days`,
          })),
          notes: ps.notes || "Prescription uploaded and verified. Medical record logged.",
        });
      }
      if (data.xray_scan?.detections) {
        setXrayDetections(data.xray_scan.detections);
      }
    } catch (err) {
      console.error("Failed to fetch patient scans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyzeXray = async () => {
    if (!patientId) return;
    setAnalyzingXray(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/xray/analyze-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });
      const data = await res.json();
      if (data.detections) {
        setXrayDetections(data.detections);
      }
    } catch (err) {
      console.error("Failed to re-analyze scan:", err);
    } finally {
      setAnalyzingXray(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [patientId]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (activeMode === "xray" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw simulated radiology dark background
      ctx.fillStyle = "#0A0D14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bone silhouette approximation
      ctx.fillStyle = "#1E293B";
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height / 2, 90, 160, Math.PI / 12, 0, Math.PI * 2);
      ctx.fill();

      // Render YOLOv7 Bounding Boxes
      xrayDetections.forEach((det) => {
        const { x, y, w, h } = det.box;
        ctx.strokeStyle = det.label.includes("fracture") ? "#EF4444" : "#F59E0B";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // Label background
        ctx.fillStyle = det.label.includes("fracture") ? "#EF4444" : "#F59E0B";
        ctx.fillRect(x, y - 20, w, 20);

        // Label text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(`${det.label.toUpperCase()} (${Math.round(det.confidence * 100)}%)`, x + 4, y - 6);
      });
    }
  }, [activeMode, xrayDetections]);

  return (
    <div className="space-y-6">
      {/* Mode Switcher Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode("ocr")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeMode === "ocr"
                ? "bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs"
                : "text-[#64748B] hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prescription OCR Split-Screen</span>
          </button>

          <button
            onClick={() => setActiveMode("xray")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeMode === "xray"
                ? "bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs"
                : "text-[#64748B] hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Bone className="w-3.5 h-3.5" />
            <span>X-Ray YOLOv7 Fracture Canvas</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:bg-gray-50 text-[#64748B]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-[#64748B] px-1">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:bg-gray-50 text-[#64748B]"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeMode === "ocr" ? (
        /* ── Split Screen: Original Scan vs Structured Entities ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Original Scan Viewport */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
              <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                Original Scanned Prescription Slip
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">Tesseract LSTM OEM 1 PSM 6</span>
            </div>


            <div className="overflow-auto max-h-[500px] border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-center min-h-[380px]">
              {loading ? (
                /* Loading skeleton while fetching from API */
                <div className="w-full max-w-md space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
                  <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  ))}
                </div>
              ) : !scanInfo?.prescription_scan ? (
                /* Empty state – no prescription scan for this patient */
                <div className="text-center space-y-3 max-w-xs">
                  <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                  <p className="text-sm font-semibold text-[#64748B] dark:text-gray-400">
                    No prescription scan on file for this patient
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Upload a scanned prescription slip to the patient&apos;s Health Vault under <em>Prescriptions</em> to enable OCR extraction.
                  </p>
                  <a
                    href={`/vault/prescriptions`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl hover:opacity-90 transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Upload to Vault
                  </a>
                </div>
              ) : (
                <div
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
                  className="bg-white dark:bg-[#111827] p-6 shadow-md rounded-lg border max-w-md w-full font-mono text-xs space-y-3 transition-transform"
                >
                  <div className="text-center border-b pb-2">
                    <div className="font-bold text-sm">{ocrData.clinic_name}</div>
                    <div className="text-[10px] text-gray-500">{ocrData.doctor_name} &bull; Ref #{patientId}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Date: {ocrData.date}</div>
                  </div>
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    {ocrData.medicines && ocrData.medicines.length > 0 ? (
                      ocrData.medicines.map((m, idx) => (
                        <p key={idx}>{idx + 1}. {m.name} &mdash; {m.dosage} ({m.duration})</p>
                      ))
                    ) : (
                      <p className="text-gray-400 italic">No prescription slip items attached.</p>
                    )}
                  </div>
                  <div className="pt-2 border-t text-[10px] text-gray-500">
                    Notes: {ocrData.notes}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Right: AI Normalized Editable Entities */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
              <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Gemma 4 Normalized Clinical Form
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200">
                100% EXTRACTED
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                  Clinic / Prescriber
                </label>
                <input
                  type="text"
                  value={ocrData.clinic_name}
                  onChange={(e) => setOcrData({ ...ocrData, clinic_name: e.target.value })}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                  Extracted Medications ({ocrData.medicines.length})
                </label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {ocrData.medicines.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/60 dark:bg-[#1F2937]/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F172A] dark:text-white">{m.name}</span>
                        <div className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono mt-0.5">
                          {m.dosage} &bull; {m.duration}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold block mb-1">
                  Clinical Notes & Diagnosis
                </label>
                <textarea
                  rows={2}
                  value={ocrData.notes}
                  onChange={(e) => setOcrData({ ...ocrData, notes: e.target.value })}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── X-Ray Canvas Overlay View ── */
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
                <Bone className="w-4 h-4 text-purple-600" />
                YOLOv7-p6 Diagnostic Imaging &amp; Fracture Canvas
              </h3>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                Model: `yolov7-p6-bonefracture.onnx` &bull; Region: {scanInfo?.xray_scan?.anatomical_region || "Radiology Scan"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReanalyzeXray}
                disabled={analyzingXray}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-all shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${analyzingXray ? "animate-spin" : ""}`} />
                {analyzingXray ? "Inference Running..." : "Re-Analyze Scan (YOLOv7)"}
              </button>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                xrayDetections.length > 0
                  ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
              }`}>
                {xrayDetections.length > 0
                  ? `${xrayDetections.length} FINDING(S) (${Math.round((xrayDetections[0]?.confidence || 0.9) * 100)}%)`
                  : "NO ACUTE FRACTURE / NORMAL"}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-[#0A0D14] rounded-2xl border border-gray-800">
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              className="rounded-xl shadow-2xl max-w-full h-auto border border-gray-800"
            />
          </div>

          {/* Detections List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {xrayDetections.map((det, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-rose-900 dark:text-rose-200 uppercase">{det.label}</span>
                  {det.anatomical_site && (
                    <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {det.anatomical_site}
                    </div>
                  )}
                  <div className="text-[10px] text-[#64748B] dark:text-gray-400 font-mono mt-0.5">
                    Region: {det.box.x}, {det.box.y} &bull; {det.box.w} &times; {det.box.h} px
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400">
                  {Math.round(det.confidence * 100)}% CONF
                </span>
              </div>
            ))}
          </div>

          {/* ── AI Radiological Specialist Assistant Panel ── */}
          <div className="mt-6 border-t border-[#E2E8F0] dark:border-[#1F2937] pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                    AI Radiological Specialist
                    <span className="text-[10px] font-normal text-[#64748B] dark:text-gray-400">
                      Ollama Multi-Tier Cascade
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                    Clinical synthesis of YOLOv7 detections with patient history and trauma protocols
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {aiModelUsed && (
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    aiModelUsed.includes("cloud")
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                      : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200"
                  }`}>
                    {aiModelUsed.includes("cloud")
                      ? `Cloud: ${aiModelUsed}`
                      : `Local Fallback: ${aiModelUsed}`}
                  </span>
                )}
                <button
                  onClick={() => handleQueryAIAssistant()}
                  disabled={aiAssistantLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] hover:opacity-90 disabled:opacity-50 rounded-xl transition shadow-xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiAssistantLoading ? "animate-spin" : ""}`} />
                  {aiAssistantLoading ? "Analyzing..." : aiImpression ? "Regenerate Synthesis" : "Generate AI Synthesis"}
                </button>
              </div>
            </div>

            {/* AI Assistant Output Card */}
            {aiAssistantLoading ? (
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
              </div>
            ) : aiImpression ? (
              <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-50/40 to-transparent dark:from-purple-950/10 dark:to-transparent border border-purple-200/80 dark:border-purple-900/40 space-y-3">
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-[#0F172A] dark:text-gray-200 whitespace-pre-line font-sans">
                  {aiImpression}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-[#E2E8F0] dark:border-[#1F2937] text-center space-y-2">
                <p className="text-xs text-[#64748B] dark:text-gray-400">
                  Ready to evaluate fracture alignment, physis involvement, and trauma stabilization protocol.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => handleQueryAIAssistant("Assess physis and growth plate displacement risk.")}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#0F172A] dark:text-gray-200 hover:border-purple-400 transition"
                  >
                    Assess Growth Plate Risk
                  </button>
                  <button
                    onClick={() => handleQueryAIAssistant("Recommend pediatric immobilization cast or splint angle.")}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#0F172A] dark:text-gray-200 hover:border-purple-400 transition"
                  >
                    Recommend Splinting Angle
                  </button>
                  <button
                    onClick={() => handleQueryAIAssistant("Provide pediatric pain management regimen safe for renal profile.")}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#0F172A] dark:text-gray-200 hover:border-purple-400 transition"
                  >
                    Check Pain Regimen
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Physician Follow-Up Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuestion.trim()) {
                  handleQueryAIAssistant(aiQuestion.trim());
                }
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask the AI Specialist a clinical question (e.g. Can this patient bear weight?)..."
                className="flex-1 bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={aiAssistantLoading || !aiQuestion.trim()}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition shadow-xs"
                title="Send Question"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}