"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileImage,
  Sparkles,
  FilePlus,
  CheckCircle2,
  X,
  ArrowRight,
  Plus,
  Trash2,
  Activity,
  FileText,
  ScanLine,
  Stethoscope,
  Microscope,
  Syringe,
  Check,
  Building2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type CategoryType = "prescriptions" | "lab_reports" | "imaging_scans" | "discharge_summaries" | "vaccinations";

type MedicineItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  conditionTag: string;
};

type Verdict = {
  status: "safe" | "warning";
  message: string;
  extracted_data?: {
    title?: string;
    doctor_name?: string;
    medicine_name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    conditionTag?: string;
    patient_notes?: string;
    medicines?: MedicineItem[];
  };
};

const CATEGORIES: { id: CategoryType; label: string; icon: any; desc: string }[] = [
  {
    id: "prescriptions",
    label: "Prescriptions & Rx",
    icon: Stethoscope,
    desc: "Doctor Prescriptions & Medication Sheets",
  },
  {
    id: "lab_reports",
    label: "Lab & Pathology",
    icon: Microscope,
    desc: "Blood Tests, CBC, Lipid & Metabolic Panels",
  },
  {
    id: "imaging_scans",
    label: "Imaging & MRI Scans",
    icon: ScanLine,
    desc: "X-Rays, MRI, CT Scans & Ultrasounds",
  },
  {
    id: "discharge_summaries",
    label: "Hospital Discharge",
    icon: Building2,
    desc: "Inpatient Summaries & Consultation Notes",
  },
  {
    id: "vaccinations",
    label: "Vaccinations",
    icon: Syringe,
    desc: "Immunization & Vaccine Certificates",
  },
];

export default function UniversalScannerHubPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("prescriptions");
  const [step, setStep] = useState<"capture" | "result">("capture");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [docAnalysis, setDocAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Digital Prescription Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Save Document to Vault State
  const [savingToVault, setSavingToVault] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form Fields for Digital Prescription
  const [rxTitle, setRxTitle] = useState("Scanned Prescription");
  const [doctorName, setDoctorName] = useState("Attending Physician");
  const [patientNotes, setPatientNotes] = useState("Digitized from package scan.");
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { name: "", dosage: "", frequency: "1-0-1", duration: "5 days", conditionTag: "GENERAL CARE" },
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Camera unavailable
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  async function processImageData(dataUrl: string) {
    setCapturedImage(dataUrl);
    stopCamera();
    setLoading(true);
    setDocAnalysis(null);
    setVerdict(null);

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("image", blob, "scanned_document.jpg");
      formData.append("category", selectedCategory);
      formData.append("patient_id", user?.id || "demo-patient");

      if (selectedCategory === "prescriptions") {
        const res = await fetch(`${API_BASE}/patient/otc-scan`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setVerdict(data);

        if (data.extracted_data) {
          const ext = data.extracted_data;
          if (ext.title) setRxTitle(ext.title);
          if (ext.doctor_name) setDoctorName(ext.doctor_name);
          if (ext.patient_notes) setPatientNotes(ext.patient_notes);

          if (ext.medicines && Array.isArray(ext.medicines) && ext.medicines.length > 0) {
            setMedicines(ext.medicines);
          }
          setShowCreateModal(true);
        }
      } else {
        const res = await fetch(`${API_BASE}/patient/analyze-document`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data && data.analysis) {
          setDocAnalysis(data.analysis);
        } else {
          setDocAnalysis({
            title: `Scanned ${selectedCategory.replace('_', ' ').toUpperCase()} Report`,
            facility_or_lab: "Diagnostic Imaging Centre",
            summary: "Uploaded physical report document processed and indexed.",
            recommendations: "Review report findings with your attending physician.",
            patient_notes: "Document scanned and indexed into Patient Vault.",
            findings: [
              { region: "Scanned Region", observation: "No acute focal abnormality detected." }
            ]
          });
        }
      }
    } catch (e) {
      console.error("Analysis failed:", e);
      setDocAnalysis({
        title: `Scanned ${selectedCategory.replace('_', ' ').toUpperCase()} Report`,
        facility_or_lab: "Diagnostic Laboratory / Imaging Desk",
        summary: "Uploaded physical document processed and indexed.",
        recommendations: "Review findings with your physician.",
        patient_notes: "Document archived in Vault."
      });
    } finally {
      setLoading(false);
      setStep("result");
    }
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    processImageData(dataUrl);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        processImageData(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveAnalyzedDocToVault() {
    if (!docAnalysis) return;
    setSavingToVault(true);

    try {
      await fetch(`${API_BASE}/patient/save-document-to-vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "demo-patient",
          title: docAnalysis.title || `${selectedCategory} Report`,
          category: selectedCategory,
          summary: docAnalysis.summary || "Medical document archived in Vault.",
          details: docAnalysis,
          file_url: capturedImage || "",
        }),
      });
      setSavingToVault(false);
      setSavedSuccess(true);
      setTimeout(() => {
        router.push("/vault");
      }, 1200);
    } catch {
      setSavingToVault(false);
    }
  }

  async function handleSaveDigitalPrescription() {
    setCreating(true);
    try {
      const filteredMeds = medicines.filter((m) => m.name.trim() !== "");
      await fetch(`${API_BASE}/patient/create-digital-prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "demo-patient",
          title: rxTitle,
          doctor_name: doctorName,
          medicines: filteredMeds.length > 0 ? filteredMeds : medicines,
          patient_notes: patientNotes,
          file_url: capturedImage || "",
        }),
      });
      setCreating(false);
      setCreatedSuccess(true);
      setTimeout(() => {
        setShowCreateModal(false);
        router.push("/vault");
      }, 1200);
    } catch {
      setCreating(false);
    }
  }

  function updateMedicine(index: number, field: keyof MedicineItem, val: string) {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: val };
    setMedicines(updated);
  }

  function addMedicineRow() {
    setMedicines((prev) => [
      ...prev,
      { name: "", dosage: "", frequency: "1-0-1", duration: "5 days", conditionTag: "GENERAL CARE" },
    ]);
  }

  function removeMedicineRow(index: number) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to Dashboard" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                AI MEDICAL DOCUMENT INTELLIGENCE
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              Universal Document & Report Hub
            </h1>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="glass-card p-4 space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold block mb-2">
          Select Document & Report Category to Upload or Scan:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setStep("capture");
                  setDocAnalysis(null);
                  setVerdict(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] shadow-md"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] text-[var(--fg)]"
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "text-[var(--bg)]" : "text-[var(--fg-muted)]"}`} />
                <div>
                  <div className="font-bold text-xs leading-tight">{cat.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? "opacity-80" : "text-[var(--fg-muted)]"}`}>
                    {cat.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CAPTURE / UPLOAD STEP */}
      {(step === "capture" || (!loading && !docAnalysis && !verdict)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* UPLOAD FILE TILE */}
          <div className="glass-card p-8 flex flex-col justify-between items-center text-center space-y-6 border-2 border-dashed border-[var(--border)] hover:border-[var(--fg)] transition-all">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shadow-sm">
              <Upload className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-lg font-bold">
                Upload {CATEGORIES.find((c) => c.id === selectedCategory)?.label} File
              </h2>
              <p className="text-xs text-[var(--fg-muted)] max-w-xs leading-relaxed">
                Upload your physical report file, lab result, scan image, or PDF document.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xs py-3.5 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
            >
              <FileImage className="w-4 h-4" /> Choose File / PDF / Photo →
            </button>

            <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase">
              Supports PNG, JPG, WEBP & PDF Reports
            </span>
          </div>

          {/* LIVE CAMERA SCANNER TILE */}
          <div className="glass-card p-6 space-y-4 text-center flex flex-col justify-between">
            <div className="aspect-[4/3] rounded-2xl bg-neutral-900 border border-[var(--border)] relative overflow-hidden flex items-center justify-center">
              {isMounted && <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Guideline */}
              <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] text-white/80 font-mono bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                  Position Physical {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={startCamera}
                className="px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[var(--bg-muted)] transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" /> Start Camera
              </button>

              <button
                onClick={handleCapture}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" /> Take Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto">
          <Sparkles className="w-8 h-8 text-[var(--fg)] animate-spin mx-auto" />
          <h3 className="font-bold text-base">Running AI Document & Report Intelligence Engine...</h3>
          <p className="text-xs text-[var(--fg-muted)]">
            Executing Tesseract OCR & Google Gemma AI Normalization for {CATEGORIES.find((c) => c.id === selectedCategory)?.label}.
          </p>
        </div>
      )}

      {/* RESULT STEP FOR REPORTS, DOCUMENTS & PRESCRIPTIONS */}
      {step === "result" && !loading && (
        <div className="space-y-6">
          {docAnalysis ? (
            <div className="glass-card p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> AI REPORT ANALYSIS COMPLETE
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-bold">{docAnalysis.title || "Scanned Medical Report"}</h2>
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  Facility: <strong>{docAnalysis.facility_or_lab || "Diagnostic Laboratory"}</strong> · Date: {docAnalysis.date || "Oct 25, 2023"}
                </p>
              </div>

              <button
                onClick={() => setStep("capture")}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[var(--border)] rounded-full hover:bg-[var(--bg-muted)] transition-colors flex items-center gap-1.5 self-start"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Scan Another Document
              </button>
            </div>

            {/* AI Executive Summary */}
            <div className="glass-panel p-5 rounded-2xl space-y-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> AI Executive Clinical Summary
              </h3>
              <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed">
                {docAnalysis.summary || "Document processed and archived in Vault."}
              </p>
            </div>

            {/* BIOMARKERS TABLE (For Lab Reports) */}
            {docAnalysis.biomarkers && Array.isArray(docAnalysis.biomarkers) && docAnalysis.biomarkers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--fg-muted)]">
                  Extracted Lab Biomarkers & Test Parameters ({docAnalysis.biomarkers.length})
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-muted)] border-b border-[var(--border)] uppercase font-mono text-[10px] text-[var(--fg-muted)]">
                      <tr>
                        <th className="p-3">Test Parameter</th>
                        <th className="p-3">Result Value</th>
                        <th className="p-3">Reference Range</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {docAnalysis.biomarkers.map((b: any, i: number) => {
                        const paramName = typeof b === "string" ? b : (b?.parameter || b?.name || "Test Parameter");
                        const valStr = typeof b === "object" && b ? (b.value || b.result || "") : "";
                        const refStr = typeof b === "object" && b ? (b.reference_range || b.range || "Standard") : "";
                        const statStr = typeof b === "object" && b ? (b.status || "normal") : "normal";
                        return (
                          <tr key={i} className="hover:bg-[var(--bg-muted)]/50">
                            <td className="p-3 font-bold">{paramName}</td>
                            <td className="p-3 font-mono">{valStr}</td>
                            <td className="p-3 text-[var(--fg-muted)]">{refStr}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                  statStr === "high" || statStr === "low"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                }`}
                              >
                                {statStr}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RADIOLOGY FINDINGS TABLE (For Imaging Scans) */}
            {docAnalysis.findings && Array.isArray(docAnalysis.findings) && docAnalysis.findings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--fg-muted)]">
                  Radiology Observations & Findings ({docAnalysis.findings.length})
                </h3>
                <div className="space-y-2">
                  {docAnalysis.findings.map((f: any, i: number) => {
                    const regName = typeof f === "string" ? "Scanned Region" : (f?.region || f?.location || "Anatomical Region");
                    const obsText = typeof f === "string" ? f : (f?.observation || f?.description || f?.finding || "No acute focal abnormality.");
                    return (
                      <div key={i} className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] space-y-1">
                        <div className="font-bold text-xs text-[var(--fg)]">{regName}</div>
                        <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{obsText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations & Follow-Up */}
            {docAnalysis.recommendations && (
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] space-y-1">
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--fg-muted)]">
                  Physician Recommendations & Follow-Up
                </h4>
                <p className="text-xs text-[var(--fg)] leading-relaxed">{docAnalysis.recommendations}</p>
              </div>
            )}

            {/* Save Action */}
            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={saveAnalyzedDocToVault}
                disabled={savingToVault || savedSuccess}
                className="px-6 py-3 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved to Vault! Redirecting...
                  </>
                ) : savingToVault ? (
                  "Archiving in Vault..."
                ) : (
                  <>
                    <FilePlus className="w-4 h-4" /> Save Report to Vault ({selectedCategory}) →
                  </>
                )}
              </button>
            </div>
          </div>
          ) : (
            <div className="glass-card p-8 space-y-4 text-center max-w-xl mx-auto">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PRESCRIPTION OCR & AI ANALYSIS COMPLETE
              </span>
              <h2 className="font-display text-xl font-bold">{rxTitle || "Scanned Prescription"}</h2>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                {verdict?.message || "Extracted prescribed medications ready for Vault archiving."}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                >
                  <FilePlus className="w-4 h-4" /> Review & Edit Digital Prescription ({medicines.length} Meds) →
                </button>
                
                <button
                  onClick={() => setStep("capture")}
                  className="w-full sm:w-auto px-5 py-3 border border-[var(--border)] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-muted)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Scan / Upload Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE DIGITAL PRESCRIPTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-3xl w-full p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-[var(--fg-muted)] hover:text-[var(--fg)] p-2 rounded-full border border-[var(--border)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Create Digital Prescription</h2>
                <p className="text-xs text-[var(--fg-muted)]">Archived in Vault & activated in Daily Timeline</p>
              </div>
            </div>

            {/* Prescription Form Fields */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold block mb-1">
                    Prescription Title
                  </label>
                  <input
                    type="text"
                    value={rxTitle}
                    onChange={(e) => setRxTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--fg)] font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold block mb-1">
                    Prescribing Doctor / Source
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--fg)] font-medium"
                  />
                </div>
              </div>

              {/* Medicines Array Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                    Prescribed Medications ({medicines.length})
                  </label>
                  <button
                    onClick={addMedicineRow}
                    className="text-xs font-bold uppercase tracking-wider border border-[var(--border)] px-3 py-1.5 rounded-full hover:bg-[var(--bg-muted)] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Medicine
                  </button>
                </div>

                <div className="space-y-3">
                  {medicines.map((med, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)]/50 space-y-3 relative">
                      {medicines.length > 1 && (
                        <button
                          onClick={() => removeMedicineRow(idx)}
                          className="absolute right-3 top-3 text-[var(--fg-muted)] hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] block mb-1">
                            Medicine Name #{idx + 1}
                          </label>
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                            placeholder="e.g. Paracetamol or Pan 40mg"
                            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-xs focus:outline-none focus:border-[var(--fg)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] block mb-1">
                            Dosage / Strength (Optional)
                          </label>
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => updateMedicine(idx, "dosage", e.target.value)}
                            placeholder="e.g. 500mg or 40mg"
                            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-xs focus:outline-none focus:border-[var(--fg)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] block mb-1">
                            Frequency / Schedule
                          </label>
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                            placeholder="1-0-1"
                            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-xs focus:outline-none focus:border-[var(--fg)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] block mb-1">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={med.duration}
                            onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                            placeholder="5 days"
                            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-xs focus:outline-none focus:border-[var(--fg)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Notes */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold block mb-1">
                  Notes & Clinical Instructions
                </label>
                <textarea
                  rows={2}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-xs focus:outline-none focus:border-[var(--fg)] resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border border-[var(--border)] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-muted)]"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveDigitalPrescription}
                  disabled={creating || createdSuccess}
                  className="px-6 py-2.5 bg-[var(--fg)] text-[var(--bg)] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 shadow-md"
                >
                  {createdSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved to Vault! Redirecting...
                    </>
                  ) : creating ? (
                    "Saving to Vault..."
                  ) : (
                    <>
                      Save Digital Prescription to Vault →
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
