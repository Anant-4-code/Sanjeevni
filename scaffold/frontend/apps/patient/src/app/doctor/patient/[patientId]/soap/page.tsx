"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Stethoscope,
  Save,
  CheckCircle2,
  Sparkles,
  FileText,
  RotateCcw,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

interface SOAPNote {
  S: string;
  O: string;
  A: string;
  P: string;
}

export default function DoctorSOAPPage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "demo-doctor";
  const patientId = params.patientId as string;

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState<SOAPNote>({
    S: "58M presenting for diabetes follow-up. C/O occasional dizziness, especially after evening Noveron dose. Blood sugars stable around 140-160 mg/dL fasting. No chest pain, no shortness of breath.",
    O: "BP 130/85 mmHg, HR 78 bpm regular, RR 16, SpO2 98% RA. General: well-nourished, no acute distress. Lungs: clear bilaterally. Abdomen: soft, non-tender. Foot pulses intact.",
    A: "1. Type 2 Diabetes Mellitus — stable control.\n2. Episodic Postprandial Dizziness — likely mild orthostatic effect or evening Noveron timing.\n3. Cardiovascular health stable.",
    P: "1. Continue Metformin 500mg (1-0-1).\n2. Monitor blood pressure morning & evening.\n3. Order HbA1c, fasting lipid profile, and serum creatinine.\n4. Follow-up in 4 weeks or sooner if dizziness worsens.",
  });
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      setRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setProcessing(true);
        try {
          const res = await fetch(`${API_BASE}/doctor/dictation?prescription_id=rx-${patientId}`, {
            method: "POST",
          });
          const data = await res.json();
          if (data.transcript) setTranscript(data.transcript);
          if (data.soap_note) setSoapNote(data.soap_note);
        } catch (e) {
          console.error("Dictation endpoint failed:", e);
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
    } catch (err) {
      console.warn("Microphone access unavailable, using simulated dictation:", err);
      // Simulated recording for environments without mic permission
      setRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      setProcessing(true);
      setTimeout(() => {
        setTranscript(
          "Patient Ramesh Kumar presenting for routine diabetes checkup. BP 130 over 85. Mild dizziness reported with evening dosage. Plan: continue current Metformin regimen, recheck HbA1c."
        );
        setProcessing(false);
      }, 1200);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            05 // AMBIENT CLINICAL DOCUMENTATION
          </span>
          <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-white">
            Voice Dictation & SOAP Notes
          </h2>
        </div>

        {/* Recording Control Button */}
        <div className="flex items-center gap-3">
          {recording ? (
            <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-4 py-2 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                REC {formatTimer(duration)}
              </span>
              <button
                onClick={stopRecording}
                className="ml-2 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
              >
                Stop & Process
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl font-bold text-xs shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>{processing ? "Formatting SOAP Note..." : "Start Ambient Dictation"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Transcript Card (if available) */}
      {transcript && (
        <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-2xl p-4 text-xs space-y-1">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Whisper Ambient Transcript</span>
          </div>
          <p className="text-[#0F172A] dark:text-gray-200 font-mono text-[11px] leading-relaxed">
            "{transcript}"
          </p>
        </div>
      )}

      {/* ── Section: Structured SOAP Note ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Structured SOAP Clinical Record</h3>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saved ? "Saved to Chart!" : "Save SOAP Note"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* S: Subjective */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center font-bold text-xs">
                S
              </span>
              <span>Subjective (Patient Narrative & Complaints)</span>
            </label>
            <textarea
              rows={4}
              value={soapNote.S}
              onChange={(e) => setSoapNote({ ...soapNote, S: e.target.value })}
              className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          {/* O: Objective */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs">
                O
              </span>
              <span>Objective (Vitals & Physical Examination)</span>
            </label>
            <textarea
              rows={4}
              value={soapNote.O}
              onChange={(e) => setSoapNote({ ...soapNote, O: e.target.value })}
              className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          {/* A: Assessment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-xs">
                A
              </span>
              <span>Assessment (Clinical Diagnoses & Evaluation)</span>
            </label>
            <textarea
              rows={4}
              value={soapNote.A}
              onChange={(e) => setSoapNote({ ...soapNote, A: e.target.value })}
              className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          {/* P: Plan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 flex items-center justify-center font-bold text-xs">
                P
              </span>
              <span>Plan (Treatment, Lab Orders & Follow-Up)</span>
            </label>
            <textarea
              rows={4}
              value={soapNote.P}
              onChange={(e) => setSoapNote({ ...soapNote, P: e.target.value })}
              className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}