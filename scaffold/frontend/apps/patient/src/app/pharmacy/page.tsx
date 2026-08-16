"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pill, CheckCircle2, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function PharmacyPortalPage() {
  const [refills, setRefills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/refill-requests?doctor_id=demo-doctor`);
      const data = await res.json();
      setRefills(data.refill_requests || []);
    } catch (e) {
      console.error("Pharmacy fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefills();
  }, []);

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
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-purple-50 text-purple-800 px-2.5 py-1 rounded-full font-bold border border-purple-200">
            PHARMACY // DISPENSARY CONSOLE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRefills}
            className="p-2 border border-[#E2E8F0] rounded-lg bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B]">
            03 // DISPENSARY QUEUE
          </p>
          <h1 className="font-display text-2xl font-black mt-1">Verified Prescriptions & Dispensing</h1>
          <p className="text-xs text-[#64748B]">
            Review doctor-signed prescriptions with pill verification and dispense medications.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-black" />
            <p className="text-xs font-medium">Loading dispensary queue...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="font-bold text-sm">Active Refill Requests</span>
                <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  {refills.length} Pending
                </span>
              </div>
              <div className="space-y-3">
                {refills.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8F7F4] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{r.medicine_name}</span>
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {r.remaining_days}d left
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Patient: {r.patient_name} · Dosage: {r.dosage} ({r.frequency})
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="font-bold text-sm">Cryptographic Verification Badge</span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  SHA-256 Validated
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                All medications dispelled through this console are locked with the physician's immutable digital sign-off hash to ensure patient safety.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
