"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  User,
  CheckCircle2,
  RefreshCw,
  Activity,
  ArrowRight,
  Stethoscope,
  Camera,
  Upload,
  Search,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

const CRITICAL_KEYWORDS = ["chest pain", "shortness of breath", "severe bleeding", "unconscious", "chest pressure", "heart attack", "stroke"];
const URGENT_KEYWORDS = ["fever", "high fever", "vomiting", "fracture", "pain", "severe", "dizziness", "asthma", "cough"];

export default function ReceptionPortalPage() {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [assignedDoctor, setAssignedDoctor] = useState("demo-doctor");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Search state
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Live NLP Triage classification
  const liveTriage = useMemo(() => {
    const text = chiefComplaint.toLowerCase().trim();
    if (!text) return { level: 1, label: "ROUTINE", color: "bg-blue-50 text-blue-800 border-blue-200" };
    if (CRITICAL_KEYWORDS.some((k) => text.includes(k))) {
      return { level: 3, label: "CRITICAL (Level 3)", color: "bg-rose-100 text-rose-900 border-rose-300 animate-pulse" };
    }
    if (URGENT_KEYWORDS.some((k) => text.includes(k))) {
      return { level: 2, label: "URGENT (Level 2)", color: "bg-amber-100 text-amber-900 border-amber-300" };
    }
    return { level: 1, label: "ROUTINE (Level 1)", color: "bg-blue-50 text-blue-800 border-blue-200" };
  }, [chiefComplaint]);

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
          doctor_id: assignedDoctor,
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

  const handleSearch = async (query: string) => {
    setSearchQ(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
          01 // RECEPTION & SMART TRIAGE
        </span>
        <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
          Patient Intake & Queue Registration
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Instant triage classification re-orders doctor queue by clinical severity in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <span>Digital Registration Form</span>
            </h2>

            {/* Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Age & Gender</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    placeholder="Age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-1/2 bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] dark:text-white font-semibold"
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-1/2 bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-2 py-2.5 text-xs text-[#0F172A] dark:text-white font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Phone & Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Emergency Contact (Optional)</label>
                <input
                  type="text"
                  placeholder="Name / Relation / Phone"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            {/* Chief Complaint + Real-time NLP Triage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">
                  Chief Complaint & Symptoms
                </label>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${liveTriage.color}`}>
                  AI Triage: {liveTriage.label}
                </span>
              </div>
              <textarea
                rows={3}
                required
                placeholder="e.g. Severe chest pain radiating to left arm for past 2 hours..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3.5 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            {/* Target Doctor Assignment */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Assign to Physician Queue</label>
              <select
                value={assignedDoctor}
                onChange={(e) => setAssignedDoctor(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white font-medium"
              >
                <option value="demo-doctor">Dr. Nitin Sharma (Internal Medicine & Endocrinology)</option>
                <option value="doc-rai-1">Dr. Rai (Cardiology & General Medicine)</option>
                <option value="doc-patel-1">Dr. Patel (Endocrinology & Diabetology)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Registering & Triaging..." : "Register Patient & Generate Token"}</span>
            </button>
          </form>

          {/* Registration Success Result */}
          {result && (
            <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-sm text-emerald-950 dark:text-emerald-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-base">Intake Verified & Queued</span>
                </div>
                <span className="text-2xl font-black font-display text-emerald-700 dark:text-emerald-300">
                  TOKEN #{result.token_number}
                </span>
              </div>

              <div className="text-xs space-y-1 opacity-90 border-t border-emerald-200 dark:border-emerald-800 pt-3">
                <p><strong>Patient ID:</strong> {result.patient_id}</p>
                <p><strong>Assigned Acuity:</strong> Level {result.triage?.severity_level} ({result.triage?.label})</p>
                <p className="pt-1">Dispatched to Doctor Consultation queue.</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Search & Intake Guidelines (1 col) */}
        <div className="space-y-6">
          {/* Patient Directory Search */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
              <Search className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Quick Patient Lookup</h3>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQ}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            {searching && <p className="text-xs text-[#64748B]">Searching directory...</p>}

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30 text-xs"
                >
                  <div className="font-bold text-[#0F172A] dark:text-white">{p.full_name}</div>
                  <div className="text-[11px] text-[#64748B]">{p.phone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}