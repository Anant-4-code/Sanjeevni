"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  User,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertTriangle,
  Phone,
  Shield,
  Sparkles,
  Upload,
  Clock,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

const CRITICAL_KEYWORDS = [
  "chest pain", "shortness of breath", "severe bleeding", "unconscious",
  "chest pressure", "heart attack", "stroke", "seizure",
];
const URGENT_KEYWORDS = [
  "fever", "high fever", "vomiting", "fracture", "severe pain", "dizziness",
  "asthma", "cough", "blood", "head injury",
];

export default function ReceptionIntakePage() {
  // ── Form State ──
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [assignedDoctor, setAssignedDoctor] = useState("");
  const [severityOverride, setSeverityOverride] = useState<number | null>(null);

  // ── Lookup State ──
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [patientAllergies, setPatientAllergies] = useState<any[]>([]);
  const [lastVisit, setLastVisit] = useState<any>(null);

  // ── Doctors State ──
  const [doctors, setDoctors] = useState<any[]>([]);

  // ── Submit State ──
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ── Daily Summary ──
  const [summary, setSummary] = useState<any>(null);

  // Fetch doctors on mount
  useEffect(() => {
    fetch(`${API_BASE}/reception/doctors`)
      .then((r) => r.json())
      .then((d) => {
        const docs = d.doctors || [];
        setDoctors(docs);
        if (docs.length > 0 && !assignedDoctor) setAssignedDoctor(docs[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch daily summary on mount
  useEffect(() => {
    fetch(`${API_BASE}/reception/daily-summary`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {});
  }, []);

  // ── Live NLP Triage ──
  const aiTriage = useMemo(() => {
    const text = chiefComplaint.toLowerCase().trim();
    if (!text) return { level: 1, label: "ROUTINE", color: "bg-blue-50 text-blue-800 border-blue-200", reason: "No input yet" };
    if (CRITICAL_KEYWORDS.some((k) => text.includes(k))) {
      return { level: 3, label: "CRITICAL", color: "bg-rose-100 text-rose-900 border-rose-300 animate-pulse", reason: "Acute symptoms detected" };
    }
    if (URGENT_KEYWORDS.some((k) => text.includes(k))) {
      return { level: 2, label: "URGENT", color: "bg-amber-100 text-amber-900 border-amber-300", reason: "Elevated clinical priority" };
    }
    return { level: 1, label: "ROUTINE", color: "bg-blue-50 text-blue-800 border-blue-200", reason: "No acute symptoms; follow-up type" };
  }, [chiefComplaint]);

  const activeSeverity = severityOverride ?? aiTriage.level;

  // ── Phone Lookup ──
  const handleLookup = async () => {
    if (phone.trim().length < 3) return;
    setLookupLoading(true);
    setFoundPatient(null);
    setPatientAllergies([]);
    setLastVisit(null);
    try {
      const res = await fetch(`${API_BASE}/reception/patients/lookup?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.found && data.patient) {
        setFoundPatient(data.patient);
        setFullName(data.patient.full_name || "");
        setAge(String(data.patient.age || ""));
        setGender(data.patient.gender || "Male");
        setEmergencyContact(data.patient.emergency_contact_name || "");
        setPatientAllergies(data.allergies || []);
        setLastVisit(data.last_visit);
      }
    } catch {
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/reception/patients/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          age: parseInt(age) || 30,
          gender,
          phone,
          emergency_contact_name: emergencyContact || undefined,
          chief_complaint: chiefComplaint,
          doctor_id: assignedDoctor,
          severity_override: severityOverride,
          existing_patient_id: foundPatient?.id || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      // Reset form
      setPhone("");
      setFullName("");
      setAge("");
      setChiefComplaint("");
      setEmergencyContact("");
      setFoundPatient(null);
      setPatientAllergies([]);
      setLastVisit(null);
      setSeverityOverride(null);
      // Refresh summary
      fetch(`${API_BASE}/reception/daily-summary`).then((r) => r.json()).then(setSummary).catch(() => {});
    } catch (err) {
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
          01 // FRONT DESK INTAKE
        </span>
        <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
          Patient Registration & Smart Triage
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          AI-assisted severity classification re-orders the doctor queue by clinical urgency in real-time.
        </p>
      </div>

      {/* Daily Summary Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Registered Today", value: summary.patients_registered, color: "text-emerald-700 dark:text-emerald-400" },
            { label: "Tokens Issued", value: summary.tokens_issued, color: "text-blue-700 dark:text-blue-400" },
            { label: "Consultations Done", value: summary.consultations_completed, color: "text-purple-700 dark:text-purple-400" },
            { label: "Waiting Now", value: summary.waiting_now, color: "text-amber-700 dark:text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-4 text-center shadow-xs">
              <div className={`text-2xl font-black font-display ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 mt-1 font-bold">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Form Column (2 cols) ═══ */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <span>Digital Registration Form</span>
            </h2>

            {/* ── Phone Lookup ── */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Phone Number</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+91-98765-43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLookup())}
                    className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A] dark:focus:border-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupLoading || phone.trim().length < 3}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Look Up</span>
                </button>
              </div>

              {/* Returning Patient Banner */}
              {foundPatient && (
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Returning patient found: {foundPatient.full_name}, {foundPatient.age}, {foundPatient.gender}</span>
                  </div>
                  {lastVisit && (
                    <p className="text-emerald-700/80 dark:text-emerald-300/80 pl-5">
                      Last visit: {new Date(lastVisit.queued_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      {lastVisit.doctor_name && ` with ${lastVisit.doctor_name}`}
                    </p>
                  )}
                  {patientAllergies.length > 0 && (
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold pl-5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        Known allergy: {patientAllergies.map((a) => `${a.allergen} (${a.severity})`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Demographics ── */}
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

            {/* ── Emergency Contact ── */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Emergency Contact (Optional)</label>
              <input
                type="text"
                placeholder="Name / Relation / Phone"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-[#E2E8F0] dark:border-[#1F2937]" />

            {/* ── Chief Complaint + AI Severity ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">
                  Chief Complaint & Symptoms
                </label>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${aiTriage.color}`}>
                  <Sparkles className="w-3 h-3" />
                  AI Suggested: {aiTriage.label}
                </span>
              </div>
              <textarea
                rows={3}
                required
                placeholder="e.g. Occasional dizziness, follow-up for diabetes management..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3.5 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A] dark:focus:border-white"
              />
              {chiefComplaint.trim() && (
                <p className="text-[11px] text-[#64748B] dark:text-gray-400 italic">
                  Reason: {aiTriage.reason}
                </p>
              )}

              {/* Severity Override */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Override:</span>
                {[
                  { val: 1, label: "Routine", color: "text-blue-700 border-blue-300 bg-blue-50" },
                  { val: 2, label: "Urgent", color: "text-amber-700 border-amber-300 bg-amber-50" },
                  { val: 3, label: "Critical", color: "text-rose-700 border-rose-300 bg-rose-50" },
                ].map((opt) => (
                  <label key={opt.val} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      checked={activeSeverity === opt.val}
                      onChange={() => setSeverityOverride(opt.val === aiTriage.level ? null : opt.val)}
                      className="accent-[#0F172A]"
                    />
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${opt.color}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Doctor Assignment ── */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Assign to Physician Queue</label>
              <select
                value={assignedDoctor}
                onChange={(e) => setAssignedDoctor(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white font-medium"
              >
                {doctors.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} ({doc.specialty}) — {doc.queue_length} in queue
                  </option>
                ))}
              </select>
            </div>

            {/* ── Document Upload ── */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Attach Documents (Optional)</label>
              <div className="flex items-center gap-3 p-3 border border-dashed border-[#CBD5E1] dark:border-[#374151] rounded-xl bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30">
                <Upload className="w-5 h-5 text-[#94A3B8]" />
                <span className="text-xs text-[#64748B] dark:text-gray-400">
                  Upload scan / prescription / old report brought by patient
                </span>
                <input type="file" className="hidden" id="doc-upload" />
                <label
                  htmlFor="doc-upload"
                  className="ml-auto px-3 py-1.5 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg text-[11px] font-bold text-[#0F172A] dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Browse
                </label>
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || !fullName || !chiefComplaint}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Registering & Triaging..." : "Register & Generate Token"}</span>
            </button>
          </form>

          {/* ═══ Token Result ═══ */}
          {result && (
            <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-sm text-emerald-950 dark:text-emerald-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-base">Intake Verified & Queued</span>
                </div>
                <span className="text-3xl font-black font-display text-emerald-700 dark:text-emerald-300">
                  TOKEN #{result.token_number}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-emerald-200 dark:border-emerald-800 pt-4">
                <div className="p-3 bg-white/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">Acuity</div>
                  <div className="font-bold text-base mt-1">
                    Level {result.triage?.severity_level} — {result.triage?.label}
                  </div>
                  {result.triage?.overridden && (
                    <span className="text-[10px] text-amber-700 font-bold">⚠ Staff Override Applied</span>
                  )}
                </div>
                <div className="p-3 bg-white/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">Queue Position</div>
                  <div className="font-bold text-base mt-1">#{result.queue_position}</div>
                </div>
                <div className="p-3 bg-white/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">Est. Wait</div>
                  <div className="font-bold text-base mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{result.estimated_wait_minutes} min
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Sidebar (1 col) ═══ */}
        <div className="space-y-6">
          {/* Allergy Warnings (if returning patient) */}
          {patientAllergies.length > 0 && (
            <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">Known Allergies</h3>
              </div>
              <div className="space-y-2">
                {patientAllergies.map((a, i) => (
                  <div key={i} className="p-2.5 bg-white dark:bg-[#111827] border border-rose-200 dark:border-rose-800 rounded-xl text-xs">
                    <span className="font-bold text-rose-800 dark:text-rose-200">{a.allergen}</span>
                    <span className="text-rose-600 dark:text-rose-400 ml-1.5">({a.severity})</span>
                    {a.reaction && <p className="text-[11px] text-[#64748B] mt-0.5">{a.reaction}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intake Guidelines */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI Triage Guide</span>
            </h3>
            <div className="space-y-2 text-xs text-[#475569] dark:text-gray-300">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                <span><strong className="text-rose-700 dark:text-rose-300">Critical:</strong> Chest pain, stroke symptoms, severe bleeding, unconsciousness</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                <span><strong className="text-amber-700 dark:text-amber-300">Urgent:</strong> High fever, fracture, persistent vomiting, severe pain</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                <span><strong className="text-blue-700 dark:text-blue-300">Routine:</strong> Follow-up visits, chronic disease management, minor complaints</span>
              </div>
            </div>
            <div className="border-t border-[#E2E8F0] dark:border-[#1F2937] pt-3">
              <p className="text-[11px] text-[#94A3B8] dark:text-gray-500">
                AI suggestions are assistive — staff can always override severity based on clinical judgment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}