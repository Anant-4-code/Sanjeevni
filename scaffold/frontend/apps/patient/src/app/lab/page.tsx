"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, CheckCircle2, Upload, FileText, Activity } from "lucide-react";

export default function LabPortalPage() {
  const [testName, setTestName] = useState("HbA1c Blood Panel");
  const [patientId, setPatientId] = useState("patient-ramesh");
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");

  const handleCompleteLab = () => {
    setStatus("uploading");
    setTimeout(() => {
      setStatus("done");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#0F172A] flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] px-6 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm">
              S
            </div>
            <span>SANJEEVANI</span>
          </Link>
          <div className="h-4 w-px bg-[#E2E8F0]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-full font-bold border border-cyan-200">
            LAB // DIAGNOSTICS WORKBENCH
          </span>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B]">
            04 // DIAGNOSTIC ORDERS
          </p>
          <h1 className="font-display text-2xl font-black mt-1">Laboratory Test Orders & Results</h1>
          <p className="text-xs text-[#64748B]">
            Process blood panels, bio-markers, and diagnostic imaging for physician review.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <h3 className="font-bold text-base">Pending Draw: Ramesh Kumar</h3>
              <p className="text-xs text-gray-500 font-mono">Order #ORD-8821 · Ordered by Dr. Nitin Sharma</p>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
              Pending Analysis
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-2">
            <p className="text-xs font-bold text-[#0F172A]">Ordered Tests:</p>
            <ul className="text-xs text-gray-700 list-disc list-inside space-y-1">
              <li>HbA1c (Glycated Hemoglobin)</li>
              <li>Fasting Blood Sugar (FBS)</li>
              <li>Serum Creatinine & eGFR</li>
            </ul>
          </div>

          {status === "done" ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Results processed & synced to Doctor Dashboard and Patient Health Vault!</span>
            </div>
          ) : (
            <button
              onClick={handleCompleteLab}
              disabled={status === "uploading"}
              className="w-full py-3.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status === "uploading" ? "Analyzing Biomarkers..." : "Upload Lab Results & Notify Doctor →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
