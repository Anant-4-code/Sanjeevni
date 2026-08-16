import { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

interface SOAPNote {
  S: string;
  O: string;
  A: string;
  P: string;
}

interface DictationControlProps {
  prescriptionId?: string;
}

export default function DictationControl({ prescriptionId = "rx-demo" }: DictationControlProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [editingSOAP, setEditingSOAP] = useState(false);
  const [editedSOAP, setEditedSOAP] = useState<SOAPNote | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        // In production, send audio blob to /api/doctor/dictation
        // For now, use mock SOAP endpoint
        setProcessing(true);
        try {
          const res = await fetch(
            `${API_BASE}/doctor/dictation?prescription_id=${prescriptionId}`,
            { method: "POST" }
          );
          const data = await res.json();
          setTranscript(data.transcript || "");
          setSoapNote(data.soap_note || null);
          setEditedSOAP(data.soap_note || null);
        } catch (e) {
          console.error("Dictation failed:", e);
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      console.error("Microphone access denied:", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold">
        Ambient Voice Documentation
      </h3>

      {/* Record button */}
      {!soapNote && !processing && (
        <div className="flex items-center gap-4">
          {!recording ? (
            <button onClick={startRecording} className="btn-primary">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Start Dictation
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={stopRecording} className="btn-danger">
                <div className="w-3 h-3 bg-white rounded-sm" />
                Stop ({formatDuration(duration)})
              </button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-severity-critical animate-pulse" />
                <span className="text-xs text-severity-critical font-medium">Recording…</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div className="card-clinical p-6 text-center">
          <div className="animate-shimmer h-2 w-48 mx-auto rounded-full bg-doc-border mb-3" />
          <p className="text-sm text-doc-fg-muted">
            Processing transcription & generating SOAP note…
          </p>
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="card-clinical p-4">
          <p className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim mb-2">Transcript</p>
          <p className="text-sm text-doc-fg leading-relaxed">{transcript}</p>
        </div>
      )}

      {/* SOAP Note */}
      {soapNote && editedSOAP && (
        <div className="card-clinical p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim">
              SOAP Note {editingSOAP ? "(Editing)" : ""}
            </p>
            <button
              onClick={() => setEditingSOAP(!editingSOAP)}
              className="btn-outline text-xs py-1 px-2"
            >
              {editingSOAP ? "Done Editing" : "Edit SOAP"}
            </button>
          </div>

          {(["S", "O", "A", "P"] as const).map((key) => (
            <div key={key} className="soap-section">
              <div className="soap-label">
                {key === "S" ? "Subjective" : key === "O" ? "Objective" : key === "A" ? "Assessment" : "Plan"}
              </div>
              {editingSOAP ? (
                <textarea
                  value={editedSOAP[key]}
                  onChange={(e) =>
                    setEditedSOAP({ ...editedSOAP, [key]: e.target.value })
                  }
                  rows={3}
                  className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg focus:border-doc-accent focus:outline-none transition-colors resize-none"
                />
              ) : (
                <p className="text-sm text-doc-fg leading-relaxed whitespace-pre-line">
                  {editedSOAP[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
