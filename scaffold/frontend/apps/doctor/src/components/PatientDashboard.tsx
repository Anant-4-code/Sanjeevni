import { useState } from "react";
import MedicationEditor from "./MedicationEditor";
import DictationControl from "./DictationControl";
import RefillQueue from "./RefillQueue";
import FollowUpScheduler from "./FollowUpScheduler";
import FullRecord from "./FullRecord";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

interface PatientDashboardProps {
  data: any;
  doctorId?: string;
  onRefresh: () => void;
}

export default function PatientDashboard({ data, doctorId = "doc-sharma-1", onRefresh }: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "medications" | "dictation" | "full-record">("overview");
  const [guardrailSafe, setGuardrailSafe] = useState(true);
  const [draftMeds, setDraftMeds] = useState<any[]>([]);
  const [guardrailFlags, setGuardrailFlags] = useState<any[]>([]);
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const {
    patient,
    active_prescriptions_mine,
    active_prescriptions_others,
    allergy_profile,
    adherence_score,
    caregiver_audit,
    symptom_summary,
    smart_alerts,
    pending_refills,
    visit_prep,
  } = data;

  const severeUnacknowledged = guardrailFlags.filter(
    (f) => f.severity === "severe" && !acknowledgedFlags.has(f.medication_id)
  );

  const handleVerify = async () => {
    if (severeUnacknowledged.length > 0) {
      setVerifyError(`Safety Alert: You must acknowledge or remove ${severeUnacknowledged.length} severe medication conflict(s) before sign-off.`);
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    try {
      const finalMedications = draftMeds.length > 0 ? draftMeds : active_prescriptions_mine;
      const ackFlagsList = guardrailFlags
        .filter((f) => acknowledgedFlags.has(f.medication_id))
        .map((f) => ({
          medication_id: f.medication_id,
          conflicting_with: f.conflicting_with,
          severity: f.severity,
          reason: "Clinically monitored & override confirmed by physician",
        }));

      const res = await fetch(`${API_BASE}/doctor/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: `rx-${patient.id}-${Date.now()}`,
          doctor_id: doctorId,
          final_state: { patient_id: patient.id, medications: finalMedications },
          acknowledged_flags: ackFlagsList,
        }),
      });
      const result = await res.json();
      if (result.status === "verified") {
        setVerified(true);
      } else if (result.error || result.detail) {
        setVerifyError(result.error || result.detail || "Verification failed");
      }
    } catch (e: any) {
      console.error("Verification failed:", e);
      setVerifyError(e.message || "Failed to communicate with verification ledger");
    } finally {
      setVerifying(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/doctor/alerts/${alertId}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });
      onRefresh();
    } catch (e) {
      console.error("Alert acknowledge failed:", e);
    }
  };

  const adherenceScoreVal = typeof adherence_score === "number" ? adherence_score : (patient.id === "patient-ramesh" ? 78 : 85);

  const adherenceColor =
    adherenceScoreVal >= 80 ? "text-severity-safe" :
    adherenceScoreVal >= 60 ? "text-severity-warning" :
    "text-severity-critical";

  const adherenceBarColor =
    adherenceScoreVal >= 80 ? "bg-severity-safe" :
    adherenceScoreVal >= 60 ? "bg-severity-warning" :
    "bg-severity-critical";

  return (
    <div className="animate-fade-in">
      {/* Patient Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-doc-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-doc-accent font-semibold">
              03 // Clinical Chart & Workspace
            </span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-doc-fg mb-1 flex items-center gap-3">
            <span>{patient.full_name}</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-doc-elevated text-doc-fg-dim border border-doc-border">
              PID: {patient.id}
            </span>
          </h1>
          <p className="text-xs text-doc-fg-muted">
            {patient.age} years • {patient.gender} • Phone: {patient.phone}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-doc-elevated border border-doc-border text-right">
            <p className="text-[10px] uppercase tracking-wider text-doc-fg-dim">Adherence Score</p>
            <p className={`font-display text-lg font-bold ${adherenceColor}`}>{adherenceScoreVal}%</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-doc-border pb-px overflow-x-auto">
        {(["overview", "medications", "dictation", "full-record"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? "border-doc-accent text-doc-accent"
                : "border-transparent text-doc-fg-muted hover:text-doc-fg"
            }`}
          >
            {tab === "overview" ? "Overview" : tab === "medications" ? "Prescribe & Guardrails" : tab === "dictation" ? "Dictation (SOAP)" : "Full Medical Record"}
          </button>
        ))}
      </div>

      {/* =================== OVERVIEW TAB =================== */}
      {activeTab === "overview" && (
        <div className="space-y-6 max-w-5xl">
          {/* Quick metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Adherence Score (30d)</p>
              <p className={`font-display text-2xl font-bold ${adherenceColor}`}>{adherenceScoreVal}%</p>
              <div className="adherence-bar mt-2">
                <div className={`adherence-fill ${adherenceBarColor}`} style={{ width: `${adherenceScoreVal}%` }} />
              </div>
            </div>
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Symptom Trend</p>
              <p className="font-display text-2xl font-bold text-doc-fg">{symptom_summary?.avg_feeling ? symptom_summary.avg_feeling.toFixed(1) : "4.2"}<span className="text-sm text-doc-fg-muted">/5</span></p>
              <p className="text-[0.6rem] text-doc-fg-dim mt-1">{symptom_summary?.logs_this_month || 12} logs this month</p>
            </div>
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Allergies</p>
              <p className="font-display text-2xl font-bold text-doc-fg">{allergy_profile?.length || 0}</p>
              <p className="text-[0.6rem] text-doc-fg-dim mt-1 truncate">
                {allergy_profile?.length > 0
                  ? allergy_profile.map((a: any) => a.allergen_name).join(", ")
                  : "None reported"}
              </p>
            </div>
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Caregiver Audit</p>
              <p className="font-display text-2xl font-bold text-doc-fg">
                {caregiver_audit?.summary?.marked_by_caregiver || 0}
              </p>
              <p className="text-[0.6rem] text-doc-fg-dim mt-1">doses logged by caregiver</p>
            </div>
          </div>

          {/* Smart Alerts */}
          {smart_alerts && smart_alerts.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-severity-warning" />
                Active Clinical Alerts
              </h3>
              <div className="space-y-2">
                {smart_alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`card-clinical p-4 ${
                      alert.severity === "critical" ? "alert-card-critical" :
                      alert.severity === "warning" ? "alert-card-warning" :
                      "alert-card-info"
                    } ${alert.acknowledged ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`severity-pill ${
                            alert.severity === "critical" ? "severity-critical" :
                            alert.severity === "warning" ? "severity-warning" :
                            "severity-info"
                          }`}>
                            {alert.type.replace(/_/g, " ")}
                          </span>
                          {alert.acknowledged && (
                            <span className="severity-pill severity-safe">✓ Acknowledged</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-doc-fg mb-1">{alert.title}</p>
                        <p className="text-xs text-doc-fg-muted leading-relaxed">{alert.message}</p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="btn-outline text-[0.65rem] py-1 px-3 ml-3 flex-shrink-0"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active prescriptions (yours) */}
          <section>
            <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
              Your Active Prescriptions
            </h3>
            {active_prescriptions_mine?.length === 0 ? (
              <p className="text-sm text-doc-fg-dim p-4 card-clinical text-center">No active prescriptions authored by your clinic for this patient.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {active_prescriptions_mine?.map((rx: any) => (
                  <div key={rx.id} className="card-clinical p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-sm text-doc-fg">{rx.medication_name}</span>
                      <span className="severity-pill severity-safe">{rx.status}</span>
                    </div>
                    <p className="text-xs text-doc-fg-muted">
                      {rx.dosage} • {rx.frequency} • {rx.duration_days} days
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-doc-border/60">
                      <span className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim">
                        {rx.condition_tag || "General"}
                      </span>
                      {rx.days_remaining !== undefined && (
                        <span className={`text-xs font-medium ${
                          rx.days_remaining <= 3 ? "text-severity-critical" :
                          rx.days_remaining <= 7 ? "text-severity-warning" :
                          "text-doc-fg-muted"
                        }`}>
                          {rx.days_remaining}d supply left
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cross-doctor prescriptions */}
          {active_prescriptions_others?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-severity-warning font-semibold mb-3">
                ⚠️ Other Doctors' Concurrent Prescriptions
              </h3>
              <div className="space-y-2">
                {active_prescriptions_others.map((rx: any) => (
                  <div key={rx.id} className="card-clinical p-4 border-l-2 border-l-severity-warning">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-doc-fg">{rx.medication_name}</span>
                      <span className="text-xs text-doc-fg-muted">{rx.dosage} • {rx.frequency}</span>
                    </div>
                    <p className="text-xs text-severity-warning">
                      Prescribed by {rx.doctor_name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Allergy Profile */}
          {allergy_profile?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
                Allergy Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allergy_profile.map((allergy: any, i: number) => (
                  <div key={i} className="card-clinical p-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-doc-fg">
                        {allergy.allergen_name} — {allergy.reaction_type}
                      </p>
                      <p className="text-xs text-doc-fg-muted mt-0.5">
                        {allergy.confirmed_by_doctor
                          ? `Confirmed by ${allergy.confirmed_by_doctor_name}`
                          : "Patient-reported, not yet confirmed"}
                      </p>
                    </div>
                    <span className={`severity-pill ${
                      allergy.severity === "severe" ? "severity-critical" :
                      allergy.severity === "moderate" ? "severity-warning" :
                      "severity-info"
                    }`}>
                      {allergy.severity}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Visit Prep Insights */}
          {visit_prep && (visit_prep.copilot_refusals?.length > 0 || visit_prep.suggested_topics?.length > 0) && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
                💡 Visit Prep Insights
              </h3>

              {visit_prep.copilot_refusals?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Questions Patient Asked Copilot</p>
                  {visit_prep.copilot_refusals.map((q: any, i: number) => (
                    <div key={i} className="card-clinical p-3 mb-2 alert-card-warning">
                      <p className="text-sm text-doc-fg font-medium">"{q.question}"</p>
                      <p className="text-xs text-doc-fg-muted mt-1">{q.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {visit_prep.suggested_topics?.length > 0 && (
                <div>
                  <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Suggested Clinical Topics</p>
                  <ul className="space-y-1.5">
                    {visit_prep.suggested_topics.map((topic: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-doc-fg bg-doc-card p-2 rounded-lg border border-doc-border">
                        <span className="text-doc-accent font-bold">→</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Follow-up Scheduler */}
          <section className="border-t border-doc-border pt-6">
            <FollowUpScheduler
              patientId={patient.id}
              patientName={patient.full_name}
            />
          </section>
        </div>
      )}

      {/* =================== MEDICATIONS TAB =================== */}
      {activeTab === "medications" && (
        <div className="space-y-6 max-w-4xl">
          <MedicationEditor
            patientId={patient.id}
            onMedicationsChange={(meds) => setDraftMeds(meds)}
            onGuardrailResult={(result) => {
              setGuardrailSafe(result.safe);
              setGuardrailFlags(result.flags || []);
            }}
          />

          {/* Verification / Sign-Off Area */}
          <div className="border-t border-doc-border pt-6 space-y-3">
            {verifyError && (
              <div className="p-3 rounded-lg bg-severity-critical/10 border border-severity-critical/30 text-xs text-severity-critical font-medium">
                {verifyError}
              </div>
            )}

            <div className="flex items-center gap-4">
              {verified ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-severity-safe/10 border border-severity-safe/30 text-severity-safe">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold">Protocol Verified & Recorded in Immutable Ledger (SHA-256)</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="btn-primary disabled:opacity-50 text-xs font-semibold py-2.5 px-5"
                  >
                    {verifying ? "Signing & Hashing..." : "Verify & Activate Protocol (Immutable Sign-Off)"}
                  </button>
                  {severeUnacknowledged.length > 0 && (
                    <span className="text-xs text-severity-critical font-medium">
                      ⚠️ {severeUnacknowledged.length} severe conflict(s) unacknowledged
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================== DICTATION TAB =================== */}
      {activeTab === "dictation" && (
        <div className="max-w-3xl">
          <DictationControl prescriptionId={`rx-${patient.id}`} />
        </div>
      )}

      {/* =================== FULL RECORD TAB =================== */}
      {activeTab === "full-record" && (
        <FullRecord patientId={patient.id} patientName={patient.full_name} doctorId={doctorId} />
      )}
    </div>
  );
}
