import { useState, useEffect, useCallback } from "react";
import GuardrailWarning from "./GuardrailWarning";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

interface MedicationItem {
  medication_id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  condition_tag: string;
}

interface MedicationEditorProps {
  patientId: string;
  onGuardrailResult?: (result: { safe: boolean; flags: any[] }) => void;
  onMedicationsChange?: (meds: MedicationItem[]) => void;
}

const EMPTY_MED: MedicationItem = {
  medication_id: "",
  name: "",
  dosage: "",
  frequency: "1-0-1",
  duration_days: 10,
  condition_tag: "",
};

export default function MedicationEditor({
  patientId,
  onGuardrailResult,
  onMedicationsChange,
}: MedicationEditorProps) {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [guardrailFlags, setGuardrailFlags] = useState<any[]>([]);
  const [guardrailSafe, setGuardrailSafe] = useState(true);
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [patientNotes, setPatientNotes] = useState("");

  // Debounced guardrail check
  const runGuardrailCheck = useCallback(
    async (meds: MedicationItem[]) => {
      const validMeds = meds.filter((m) => m.name.trim());
      if (validMeds.length === 0) {
        setGuardrailFlags([]);
        setGuardrailSafe(true);
        onGuardrailResult?.({ safe: true, flags: [] });
        return;
      }

      setChecking(true);
      try {
        const res = await fetch(`${API_BASE}/doctor/guardrail-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
            medication_items: validMeds.map((m) => ({
              medication_id: m.medication_id || m.name.toLowerCase().replace(/\s+/g, "-"),
              name: m.name,
              dosage: m.dosage,
            })),
          }),
        });
        const data = await res.json();
        setGuardrailFlags(data.flags || []);
        setGuardrailSafe(data.safe);
        onGuardrailResult?.(data);
      } catch (e) {
        console.error("Guardrail check failed:", e);
      } finally {
        setChecking(false);
      }
    },
    [patientId, onGuardrailResult]
  );

  // Debounce timer
  useEffect(() => {
    const timer = setTimeout(() => {
      runGuardrailCheck(medications);
    }, 500);
    return () => clearTimeout(timer);
  }, [medications, runGuardrailCheck]);

  const addMedication = () => {
    const updated = [...medications, { ...EMPTY_MED, medication_id: `med-${Date.now()}` }];
    setMedications(updated);
    onMedicationsChange?.(updated);
  };

  const removeMedication = (idx: number) => {
    const updated = medications.filter((_, i) => i !== idx);
    setMedications(updated);
    setAcknowledgedFlags(new Set());
    onMedicationsChange?.(updated);
  };

  const updateMedication = (idx: number, field: keyof MedicationItem, value: string | number) => {
    const updated = medications.map((m, i) =>
      i === idx ? { ...m, [field]: value } : m
    );
    setMedications(updated);
    onMedicationsChange?.(updated);
  };

  const handleAcknowledge = (flag: any) => {
    setAcknowledgedFlags((prev) => new Set([...prev, flag.medication_id]));
  };

  const handleRemoveMedication = (medicationId: string) => {
    const updated = medications.filter(
      (m) =>
        m.medication_id !== medicationId &&
        m.name.toLowerCase().replace(/\s+/g, "-") !== medicationId
    );
    setMedications(updated);
    onMedicationsChange?.(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold">
            Medications
          </h3>
          {checking && (
            <span className="text-xs text-doc-accent animate-breathe">Checking safety…</span>
          )}
          {!checking && medications.length > 0 && (
            <span
              className={`severity-pill ${
                guardrailSafe ? "severity-safe" : "severity-critical"
              }`}
            >
              {guardrailSafe ? "✓ SAFE" : `⚠ ${guardrailFlags.length} FLAG${guardrailFlags.length > 1 ? "S" : ""}`}
            </span>
          )}
        </div>
        <button onClick={addMedication} className="btn-outline text-xs py-1.5 px-3">
          + Add Medication
        </button>
      </div>

      {/* Medication rows */}
      {medications.length === 0 && (
        <p className="text-sm text-doc-fg-dim py-4 text-center border border-dashed border-doc-border rounded-lg">
          No medications added yet. Click "Add Medication" to begin prescribing.
        </p>
      )}

      {medications.map((med, idx) => (
        <div
          key={med.medication_id}
          className="card-clinical p-4 animate-slide-up"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_80px_auto] gap-3 items-end">
            {/* Drug name */}
            <div>
              <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
                Medicine Name
              </label>
              <input
                type="text"
                value={med.name}
                onChange={(e) => updateMedication(idx, "name", e.target.value)}
                placeholder="e.g. Aspirin 100mg"
                className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg placeholder:text-doc-fg-dim focus:border-doc-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Dosage */}
            <div>
              <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
                Dosage
              </label>
              <input
                type="text"
                value={med.dosage}
                onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                placeholder="500mg"
                className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg placeholder:text-doc-fg-dim focus:border-doc-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
                Frequency
              </label>
              <select
                value={med.frequency}
                onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg focus:border-doc-accent focus:outline-none transition-colors"
              >
                <option value="1-0-0">1-0-0 (Morning)</option>
                <option value="0-1-0">0-1-0 (Afternoon)</option>
                <option value="0-0-1">0-0-1 (Night)</option>
                <option value="1-0-1">1-0-1 (AM/PM)</option>
                <option value="1-1-1">1-1-1 (Thrice)</option>
                <option value="2-0-2">2-0-2 (Twice)</option>
                <option value="as needed">As Needed</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
                Days
              </label>
              <input
                type="number"
                value={med.duration_days}
                onChange={(e) => updateMedication(idx, "duration_days", parseInt(e.target.value) || 0)}
                min={1}
                max={365}
                className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg focus:border-doc-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Remove */}
            <button
              onClick={() => removeMedication(idx)}
              className="text-doc-fg-dim hover:text-severity-critical transition-colors p-2"
              title="Remove medication"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Guardrail warnings */}
      <GuardrailWarning
        flags={guardrailFlags}
        onAcknowledge={handleAcknowledge}
        onRemoveMedication={handleRemoveMedication}
        acknowledgedFlags={acknowledgedFlags}
      />

      {/* Patient-facing notes */}
      {medications.length > 0 && (
        <div>
          <label className="text-[0.65rem] uppercase tracking-widest text-doc-fg-dim block mb-1">
            Patient-Facing Notes (visible in patient app)
          </label>
          <textarea
            value={patientNotes}
            onChange={(e) => setPatientNotes(e.target.value)}
            placeholder="e.g. Take with food, avoid dairy for 2 hours after morning dose..."
            rows={3}
            className="w-full bg-doc-bg border border-doc-border rounded px-3 py-2 text-sm text-doc-fg placeholder:text-doc-fg-dim focus:border-doc-accent focus:outline-none transition-colors resize-none"
          />
        </div>
      )}
    </div>
  );
}
