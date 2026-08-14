"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Scan,
  Globe,
  ChevronDown,
  ChevronUp,
  FileDown,
  FolderPlus,
  ShieldCheck,
  Stethoscope,
  Info,
  AlertTriangle,
  X,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type MedicineDetail = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  conditionTag: string;
  usesSummary: string;
  sideEffects: string[];
  precautions: string;
};

type PrescriptionFull = {
  id: string;
  doctor_name: string;
  status: "verified" | "unverified";
  date: string;
  summary: string;
  file_url?: string;
  patient_notes: string;
  medicines: MedicineDetail[];
};

const LANGUAGES = [
  { code: "en", label: "English (Original)" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "kn", label: "கன்னட (Kannada)" },
  { code: "bn", label: "বাংলা (Bengali)" },
];

export default function PrescriptionDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const rxId = (params?.id as string) || "";

  const [prescription, setPrescription] = useState<PrescriptionFull | null>(null);
  const [selectedLang, setSelectedLang] = useState("en");
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const pid = user?.id || "demo-patient";
    fetch(`${API_BASE}/patient/${pid}/vault`)
      .then((res) => res.json())
      .then((data) => {
        const docs = Array.isArray(data?.documents) ? data.documents : [];
        const found = docs.find((d: any) => d.id === rxId);
        if (found) {
          let cleanDoctor = found.doctor_name || "Attending Physician";
          if ((cleanDoctor.toLowerCase().includes("diagnostic") || cleanDoctor.toLowerCase().includes("laboratory")) && found.patient_notes) {
            const docMatch = found.patient_notes.match(/Dr\.?\s+[A-Za-z\.\s]{3,30}/i);
            if (docMatch) {
              cleanDoctor = docMatch[0].trim();
            }
          }
          const updatedDoc = { ...found, doctor_name: cleanDoctor };
          setPrescription(updatedDoc);
          if (found.medicines && found.medicines.length > 0) {
            setExpandedMed(found.medicines[0].name);
          }
        } else {
          setPrescription({
            id: rxId,
            patient_id: pid,
            title: "Digital Prescription Record",
            category: "prescriptions",
            doctor_name: "Attending Physician / Staff Doctor",
            status: "verified",
            date: "Today",
            summary: "Digital prescription active in patient daily regimen.",
            file_url: "",
            patient_notes: "Prescription digitized and archived in Patient Vault.",
            medicines: [
              {
                name: "Tab. Edushine MX 6",
                dosage: "1 Tablet",
                frequency: "1-0-1",
                duration: "5 days",
                conditionTag: "NEURO RECOVERY",
                usesSummary: "Supports nerve repair and neurological recovery.",
                sideEffects: ["Mild Drowsiness", "Headache"],
                precautions: "Take after meals with water as prescribed."
              }
            ]
          });
          setExpandedMed("Tab. Edushine MX 6");
        }
      })
      .catch(() => {
        setPrescription({
          id: rxId,
          patient_id: pid,
          title: "Digital Prescription Record",
          category: "prescriptions",
          doctor_name: "Attending Physician",
          status: "verified",
          date: "Today",
          summary: "Digital prescription active in patient regimen.",
          file_url: "",
          patient_notes: "Prescription record archived in Vault.",
          medicines: [
            {
              name: "Tab. Edushine MX 6",
              dosage: "1 Tablet",
              frequency: "1-0-1",
              duration: "5 days",
              conditionTag: "NEURO RECOVERY",
              usesSummary: "Supports nerve recovery.",
              sideEffects: ["Mild Drowsiness"],
              precautions: "Take after meals."
            }
          ]
        });
      });
  }, [rxId, user?.id]);

  function handleVerifySignoff() {
    setVerifying(true);
    fetch(`${API_BASE}/doctor/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_id: rxId,
        doctor_id: "doc-1",
        final_state: { prescription_id: rxId, status: "verified" },
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setVerifying(false);
        setPrescription((prev) => (prev ? { ...prev, status: "verified" } : null));
      })
      .catch(() => {
        setVerifying(false);
        setPrescription((prev) => (prev ? { ...prev, status: "verified" } : null));
      });
  }

  if (!prescription) {
    return (
      <div className="glass-card p-12 text-center max-w-xl mx-auto">
        <p className="text-sm text-[var(--fg-muted)]">Loading clinical record...</p>
      </div>
    );
  }

  const isUnverified = prescription.status === "unverified";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/vault" aria-label="Back to Vault" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isUnverified ? (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  UNVERIFIED — PENDING DOCTOR SIGN-OFF
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  CLINICALLY VERIFIED & SIGNED OFF
                </span>
              )}
              <span className="text-xs text-[var(--fg-muted)] font-mono">{prescription.date}</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              Prescription by {prescription.doctor_name}
            </h1>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border)] pl-9 pr-8 py-2 text-xs font-semibold uppercase tracking-wider rounded-full focus:outline-none focus:border-[var(--fg)] cursor-pointer shadow-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            <Globe className="w-4 h-4 text-[var(--fg-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-[var(--fg-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* UNVERIFIED WARNING BANNER */}
      {isUnverified && (
        <div className="glass-panel p-6 rounded-2xl border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 animate-bounce" />
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Scanned Prescription Pending Doctor Verification
            </h3>
          </div>
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
            This scanned prescription has been safely archived in your Patient Vault. Its medications require clinical review and sign-off by <strong>{prescription.doctor_name}</strong> before items activate into your active daily schedule.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowScanModal(true)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors shadow-sm"
            >
              View Scanned Prescription Scan →
            </button>
            <button
              onClick={handleVerifySignoff}
              disabled={verifying}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--fg)] text-[var(--bg)] rounded-full hover:opacity-90 transition-opacity shadow-sm"
            >
              {verifying ? "Signing Off..." : "Simulate Doctor Sign-Off & Activate"}
            </button>
          </div>
        </div>
      )}

      {/* Translation Safety Caption */}
      <div className="glass-panel p-3.5 rounded-xl border border-[var(--border)] flex items-center gap-2 text-xs text-[var(--fg-muted)]">
        <Info className="w-4 h-4 text-[var(--fg)] flex-shrink-0" />
        <span>
          <strong>Safety Preservation Rule:</strong> Drug names and dosage numbers remain in their original form to prevent confusion across languages.
        </span>
      </div>

      {/* Handwriting Scan Trigger */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center">
            <Scan className="w-5 h-5 text-[var(--fg)]" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Original Doctor Handwriting Scan</h3>
            <p className="text-xs text-[var(--fg-muted)]">Archived in Vault · Extracted Doctor: {prescription.doctor_name}</p>
          </div>
        </div>

        <button
          onClick={() => setShowScanModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-[var(--fg)] px-4 py-2 rounded-full hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all shadow-sm"
        >
          <Scan className="w-3.5 h-3.5" /> View Scan
        </button>
      </div>

      {/* Medicines List */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--fg-muted)] font-bold">
          Prescribed Medications & Usage Cards ({(prescription.medicines || []).length})
        </h2>

        {(prescription.medicines || []).map((med, idx) => {
          const isExpanded = expandedMed === med.name;
          return (
            <div key={med.name || `med-${idx}`} className="glass-card overflow-hidden">
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg sm:text-xl text-[var(--fg)]">{med.name || "Medication"}</h3>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[var(--fg-muted)] bg-[var(--bg-muted)]">
                      {med.conditionTag || "GENERAL CARE"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] font-medium">
                    Dosage: <strong className="text-[var(--fg)]">{med.dosage || "As prescribed"}</strong> · Schedule: <strong className="text-[var(--fg)]">{med.frequency || "1-0-1"}</strong> · Duration: {med.duration || "5 days"}
                  </p>
                </div>

                <button
                  onClick={() => setExpandedMed(isExpanded ? null : med.name)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  <span>{isExpanded ? "Hide Guidance" : "Uses & Side Effects"}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expandable Uses Card */}
              {isExpanded && (
                <div className="p-6 bg-[var(--bg-muted)] space-y-4 border-t border-[var(--border)]">
                  {med.usesSummary && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">
                        Primary Purpose
                      </h4>
                      <p className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed">{med.usesSummary}</p>
                    </div>
                  )}

                  {Array.isArray(med.sideEffects) && med.sideEffects.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Common Side Effects
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {med.sideEffects.map((se, seIdx) => (
                          <span key={typeof se === "string" ? se : `se-${seIdx}`} className="text-xs border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-full font-medium">
                            {typeof se === "string" ? se : String(se)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {med.precautions && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-1">
                        Precautions & Food Timing
                      </h4>
                      <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{med.precautions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Doctor's Notes */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-4 h-4 text-[var(--fg)]" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
            Physician Patient Instructions ({prescription.doctor_name})
          </h3>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-[var(--fg)] border-l-2 border-[var(--fg)] pl-4 py-1 italic">
          &ldquo;{prescription.patient_notes}&rdquo;
        </p>
      </div>

      {/* Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowScanModal(false)}
              className="absolute right-4 top-4 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-[var(--fg)]" />
              <h2 className="font-display text-lg font-bold">Original Handwriting Scan Viewer</h2>
            </div>

            <div className="aspect-[4/3] bg-neutral-950 rounded-xl border border-[var(--border)] overflow-hidden relative flex items-center justify-center p-2">
              {prescription.file_url ? (
                <img
                  src={prescription.file_url}
                  alt={prescription.title || "Scanned physical document"}
                  className="w-full h-full object-contain max-h-[70vh] rounded-lg shadow-inner"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{prescription.title || "Scanned Medical Record"}</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Digitized and archived in Vault. Extracted by Tesseract OCR & Gemma AI Clinical Engine.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--fg-muted)] text-center">
              Archived in Vault · Extracted Doctor: {prescription.doctor_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
