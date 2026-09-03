"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function ReceptionAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Scheduling form state
  const [showForm, setShowForm] = useState(false);
  const [formPatientSearch, setFormPatientSearch] = useState("");
  const [formPatientId, setFormPatientId] = useState("");
  const [formPatientName, setFormPatientName] = useState("");
  const [formDoctor, setFormDoctor] = useState("doc-sharma-1");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("10:00");
  const [formReason, setFormReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Doctors
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/reception/doctors`)
      .then((r) => r.json())
      .then((d) => {
        const docs = d.doctors || [];
        setDoctors(docs);
        if (docs.length > 0) setFormDoctor(docs[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch appointments
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/reception/appointments?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Patient search for form
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const handlePatientSearch = async (q: string) => {
    setFormPatientSearch(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const selectPatient = (p: any) => {
    setFormPatientId(p.id);
    setFormPatientName(p.full_name);
    setFormPatientSearch(p.full_name);
    setSearchResults([]);
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId || !formDate || !formTime) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const scheduled_at = `${formDate}T${formTime}:00Z`;
      const res = await fetch(`${API_BASE}/reception/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: formPatientId,
          doctor_id: formDoctor,
          scheduled_at,
          reason: formReason,
        }),
      });
      const data = await res.json();
      setSubmitResult(data);
      // Refresh if same date
      if (formDate === selectedDate) {
        const refreshRes = await fetch(`${API_BASE}/reception/appointments?date=${selectedDate}`);
        const refreshData = await refreshRes.json();
        setAppointments(refreshData.appointments || []);
      }
      // Reset form
      setFormPatientSearch("");
      setFormPatientId("");
      setFormPatientName("");
      setFormReason("");
      setFormDate("");
      setFormTime("10:00");
    } catch (err) {
      console.error("Schedule error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    checked_in: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    completed: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    no_show: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700",
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            03 // APPOINTMENT SCHEDULING
          </span>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
            Appointments
          </h1>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setSubmitResult(null);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showForm ? "Close" : "Schedule Appointment"}</span>
        </button>
      </div>

      {/* Scheduling Form */}
      {showForm && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-5 animate-in fade-in">
          <h2 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>Schedule New Appointment</span>
          </h2>

          <form onSubmit={handleSchedule} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient Search */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Patient</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={formPatientSearch}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-8 pr-3 py-2.5 text-xs text-[#0F172A] dark:text-white"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="font-bold text-[#0F172A] dark:text-white">{p.full_name}</span>
                      <span className="text-[#64748B] ml-2">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {formPatientName && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  ✓ Selected: {formPatientName}
                </p>
              )}
            </div>

            {/* Doctor */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Doctor</label>
              <select
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
              >
                {doctors.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} ({doc.specialty})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            {/* Time */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Time</label>
              <input
                type="time"
                required
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            {/* Reason */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Reason</label>
              <input
                type="text"
                placeholder="e.g. Follow-up: HbA1c re-check discussion"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || !formPatientId || !formDate}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{submitting ? "Scheduling..." : "Schedule Appointment"}</span>
              </button>
            </div>
          </form>

          {submitResult && (
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">Appointment scheduled successfully.</span>
              <span className="text-[11px] text-emerald-700/80">A reminder will be sent 1 day before.</span>
            </div>
          )}
        </div>
      )}

      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">View Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-4 py-2 text-xs text-[#0F172A] dark:text-white"
        />
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <p className="font-bold text-sm text-[#0F172A] dark:text-white">No Appointments</p>
          <p className="text-xs mt-1">No appointments scheduled for this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt: any) => {
            const time = new Date(appt.scheduled_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const statusCls = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
            const patientInfo = appt.patients || {};

            return (
              <div
                key={appt.id}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <div className="text-lg font-black font-display text-[#0F172A] dark:text-white">{time}</div>
                  </div>
                  <div className="h-10 w-px bg-[#E2E8F0] dark:bg-[#1F2937]" />
                  <div>
                    <div className="font-bold text-sm text-[#0F172A] dark:text-white">
                      {patientInfo.full_name || "Patient"}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">
                      {appt.reason || "No reason specified"}
                    </div>
                    {patientInfo.phone && (
                      <div className="text-[11px] text-[#94A3B8] dark:text-gray-500 font-mono mt-0.5">
                        {patientInfo.phone}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border uppercase ${statusCls}`}>
                  {appt.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
