"use client";

import { useState } from "react";
import Link from "next/link";
import { User, CheckCircle2, RefreshCw, Activity, ArrowRight, Stethoscope } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function ReceptionPortalPage() {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/patients/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          age: parseInt(age) || 30,
          gender,
          phone,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          chief_complaint: chiefComplaint,
          doctor_id: "demo-doctor",
        }),
      });
      const data = await res.json();
      setResult(data);
      setFullName("");
      setAge("");
      setPhone("");
      setChiefComplaint("");
      setEmergencyName("");
      setEmergencyPhone("");
    } catch (err: any) {
      console.error("Intake submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#0F172A] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] px-6 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm">
              S
            </div>
            <span>SANJEEVANI</span>
          </Link>
          <div className="h-4 w-px bg-[#E2E8F0]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-bold border border-amber-200">
            RECEPTION // FRONT DESK INTAKE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doctor"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Go to Doctor Workspace &rarr;
          </Link>
        </div>
      </header>

      {/* Main Intake Form */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B]">
              01 // PATIENT REGISTRATION & AI TRIAGE
            </p>
            <h1 className="font-display text-2xl font-black mt-1">New Patient Intake</h1>
            <p className="text-xs text-[#64748B]">
              Register walk-in patients with automated NLP symptom severity triage and live doctor queue dispatch.
            </p>
          </div>

          {result && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  Patient Registered! Token #{result.token_number} assigned with {result.triage?.label} priority.
                </span>
              </div>
              <Link
                href="/doctor"
                className="text-xs font-bold underline hover:opacity-80"
              >
                View in Doctor Queue &rarr;
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Age
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 58"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Chief Complaint & Symptoms (AI Triage Analyzed)
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Severe chest pain radiating to left arm with shortness of breath..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full p-3.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Kumar (Daughter)"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              {loading ? "Processing Triage & Queuing..." : "Register Patient & Dispatch to Doctor Queue →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
