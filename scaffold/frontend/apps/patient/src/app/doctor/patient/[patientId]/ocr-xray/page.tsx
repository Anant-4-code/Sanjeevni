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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

export default function DoctorOCRAndXrayPage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "demo-doctor";
  const patientId = params.patientId as string;

  const [activeMode, setActiveMode] = useState<"ocr" | "xray">("ocr");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingXray, setAnalyzingXray] = useState(false);

  // Mock scan & OCR data for demo
  const [ocrData, setOcrData] = useState({
    clinic_name: "MANIKANTA NEURO & MULTISPECIALITY CENTRE",
    doctor_name: "Dr. G. Mithun, MD (Neuro)",
    date: "2026-08-16",
    medicines: [
      { name: "Tab. Edushine MX 6", dosage: "1-0-1", duration: "10 days" },
      { name: "Tab. M-ped 16mg", dosage: "1-0-0", duration: "5 days" },
      { name: "Tab. Gabapin NT 100mg", dosage: "0-0-1", duration: "15 days" },
      { name: "Tab. Benforce CD", dosage: "1-0-0", duration: "30 days" },
      { name: "Tab. Rebote", dosage: "1-0-1", duration: "10 days" },
    ],
    notes: "Patient reports severe LBA with radicular pain. Bed rest advised.",
  });

  const [xrayDetections, setXrayDetections] = useState<any[]>([
    { label: "fracture", confidence: 0.92, box: { x: 140, y: 110, w: 90, h: 65 } },
    { label: "bone abnormality", confidence: 0.78, box: { x: 260, y: 220, w: 60, h: 55 } },
  ]);

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
              <div
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
                className="bg-white dark:bg-[#111827] p-6 shadow-md rounded-lg border max-w-md w-full font-mono text-xs space-y-3 transition-transform"
              >
                <div className="text-center border-b pb-2">
                  <div className="font-bold text-sm">MANIKANTA NEURO CENTRE</div>
                  <div className="text-[10px] text-gray-500">Dr. G. Mithun MD &bull; OPD Reg #9024</div>
                </div>
                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <p>1. Tab. Edushine MX 6 &mdash; 1-0-1 (10d)</p>
                  <p>2. Tab. M-ped 16mg &mdash; 1-0-0 (5d)</p>
                  <p>3. Tab. Gabapin NT 100mg &mdash; 0-0-1 (15d)</p>
                  <p>4. Tab. Benforce CD &mdash; 1-0-0 (30d)</p>
                  <p>5. Tab. Rebote &mdash; 1-0-1 (10d)</p>
                </div>
                <div className="pt-2 border-t text-[10px] text-gray-500">
                  Diag: Low Back Ache (LBA) with radiculopathy
                </div>
              </div>
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
                YOLOv7-p6 Bone Fracture Detection Canvas
              </h3>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                Model: `yolov7-p6-bonefracture.onnx` &bull; Input: Lumbar Spine / Chest X-Ray
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200">
                1 FRACTURE DETECTED (92%)
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
                  <div className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono mt-0.5">
                    Box: [{det.box.x}, {det.box.y}, {det.box.w}, {det.box.h}]
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400">
                  {Math.round(det.confidence * 100)}% CONF
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}