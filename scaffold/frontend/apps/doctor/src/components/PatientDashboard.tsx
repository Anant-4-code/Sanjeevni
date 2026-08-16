import { useState } from "react";
import MedicationEditor from "./MedicationEditor";
import DictationControl from "./DictationControl";
import RefillQueue from "./RefillQueue";
import FollowUpScheduler from "./FollowUpScheduler";
import XrayCanvas from "./XrayCanvas";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

interface PatientDashboardProps {
  data: any;
  onRefresh: () => void;
}

export default function PatientDashboard({ data, onRefresh }: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "medications" | "dictation">("overview");
  const [guardrailSafe, setGuardrailSafe] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

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

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: `rx-${patient.id}-${Date.now()}`,
          doctor_id: "demo-doctor",
          final_state: { patient_id: patient.id, medications: active_prescriptions_mine },
          acknowledged_flags: [],
        }),
      });
      const result = await res.json();
      if (result.status === "verified") {
        setVerified(true);
      }
    } catch (e) {
      console.error("Verification failed:", e);
    } finally {
      setVerifying(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/doctor/alerts/${alertId}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: "demo-doctor" }),
      });
      onRefresh();
    } catch (e) {
      console.error("Alert acknowledge failed:", e);
    }
  };

  const adherenceColor =
    adherence_score >= 80 ? "text-severity-safe" :
    adherence_score >= 60 ? "text-severity-warning" :
    "text-severity-critical";

  const adherenceBarColor =
    adherence_score >= 80 ? "bg-severity-safe" :
    adherence_score >= 60 ? "bg-severity-warning" :
    "bg-severity-critical";

  return (
    <div className="animate-fade-in">
      {/* Patient Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-doc-accent font-semibold">
            03 // Physician Workspace
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold text-doc-fg mb-1">
          {patient.full_name}
        </h1>
        <p className="text-sm text-doc-fg-muted">
          {patient.age} years • {patient.gender} • {patient.phone}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-doc-border pb-px">
        {(["overview", "medications", "dictation"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === tab
                ? "border-doc-accent text-doc-accent"
                : "border-transparent text-doc-fg-muted hover:text-doc-fg"
            }`}
          >
            {tab === "overview" ? "Overview" : tab === "medications" ? "Prescribe" : "Dictation"}
          </button>
        ))}
      </div>

      {/* =================== OVERVIEW TAB =================== */}
      {activeTab === "overview" && (
        <div className="space-y-6 max-w-5xl">
          {/* Quick metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Adherence (30d)</p>
              <p className={`font-display text-2xl font-bold ${adherenceColor}`}>{adherence_score}%</p>
              <div className="adherence-bar mt-2">
                <div className={`adherence-fill ${adherenceBarColor}`} style={{ width: `${adherence_score}%` }} />
              </div>
            </div>
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Symptom Trend</p>
              <p className="font-display text-2xl font-bold text-doc-fg">{symptom_summary?.avg_feeling?.toFixed(1) || "—"}<span className="text-sm text-doc-fg-muted">/5</span></p>
              <p className="text-[0.6rem] text-doc-fg-dim mt-1">{symptom_summary?.logs_this_month || 0} logs this month</p>
            </div>
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Allergies</p>
              <p className="font-display text-2xl font-bold text-doc-fg">{allergy_profile?.length || 0}</p>
              <p className="text-[0.6rem] text-doc-fg-dim mt-1">
                {allergy_profile?.length > 0
                  ? allergy_profile.map((a: any) => a.allergen_name).join(", ")
                  : "None reported"}
              </p>
            </div>
            <div className="card-clinical p-4">
              <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Caregiver</p>
              <p className="font-display text-2xl font-bold text-doc-fg">
                {caregiver_audit?.summary?.marked_by_caregiver || 0}
              </p>
              <p className="text-[0.6rem] text-doc-fg-dim mt-1">doses marked by caregiver (7d)</p>
            </div>
          </div>

          {/* Smart Alerts */}
          {smart_alerts && smart_alerts.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
                🔔 Smart Alerts
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
                          className="btn-outline text-[0.65rem] py-1 px-2 ml-3 flex-shrink-0"
                        >
                          Ack
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
              <p className="text-sm text-doc-fg-dim">No prior prescriptions from you.</p>
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
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim">
                        {rx.condition_tag}
                      </span>
                      {rx.days_remaining !== undefined && (
                        <span className={`text-xs font-medium ${
                          rx.days_remaining <= 3 ? "text-severity-critical" :
                          rx.days_remaining <= 7 ? "text-severity-warning" :
                          "text-doc-fg-muted"
                        }`}>
                          {rx.days_remaining}d remaining
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
                ⚠ Other Doctors' Active Medications
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
              <div className="space-y-2">
                {allergy_profile.map((allergy: any) => (
                  <div key={allergy.id} className="card-clinical p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                      allergy.confirmed_by_doctor ? "bg-severity-critical/10 text-severity-critical" : "bg-severity-warning/10 text-severity-warning"
                    }`}>
                      {allergy.confirmed_by_doctor ? "✓" : "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-doc-fg">
                        {allergy.allergen_name} — {allergy.reaction_type}
                      </p>
                      <p className="text-xs text-doc-fg-muted">
                        {allergy.confirmed_by_doctor
                          ? `Confirmed by ${allergy.confirmed_by_doctor_name}`
                          : "Patient-reported, not yet confirmed"}
                        {allergy.notes && ` • ${allergy.notes}`}
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

          {/* Symptom Trends */}
          {symptom_summary?.trending_symptoms?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
                Trending Symptoms (30 Days)
              </h3>
              <div className="flex flex-wrap gap-2">
                {symptom_summary.trending_symptoms.map((s: any, i: number) => (
                  <div key={i} className="card-clinical px-3 py-2 flex items-center gap-2">
                    <span className="text-sm text-doc-fg">{s.symptom.replace(/_/g, " ")}</span>
                    <span className="text-xs text-doc-fg-dim bg-doc-bg px-1.5 py-0.5 rounded font-mono">
                      ×{s.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Caregiver Audit */}
          {caregiver_audit?.caregivers?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
                Caregiver Adherence Audit
              </h3>
              <div className="card-clinical p-4">
                <div className="flex items-center gap-3 mb-3">
                  {caregiver_audit.caregivers.map((cg: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-doc-accent/20 flex items-center justify-center text-xs text-doc-accent font-bold">
                        {cg.name.charAt(0)}
                      </div>
                      <span className="text-xs text-doc-fg">{cg.name}</span>
                      <span className="severity-pill severity-safe">{cg.status}</span>
                    </div>
                  ))}
                </div>
                {caregiver_audit.summary && (
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="font-display text-lg font-bold text-doc-fg">{caregiver_audit.summary.total_doses_7d}</p>
                      <p className="text-[0.6rem] text-doc-fg-dim uppercase">Total (7d)</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-severity-safe">{caregiver_audit.summary.taken_7d}</p>
                      <p className="text-[0.6rem] text-doc-fg-dim uppercase">Taken</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-doc-fg">{caregiver_audit.summary.marked_by_patient}</p>
                      <p className="text-[0.6rem] text-doc-fg-dim uppercase">By Patient</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-doc-accent">{caregiver_audit.summary.marked_by_caregiver}</p>
                      <p className="text-[0.6rem] text-doc-fg-dim uppercase">By Caregiver</p>
                    </div>
                  </div>
                )}
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
                  <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Questions Copilot Couldn't Answer</p>
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
                  <p className="text-[0.6rem] uppercase tracking-widest text-doc-fg-dim mb-2">Suggested Discussion Topics</p>
                  <ul className="space-y-1">
                    {visit_prep.suggested_topics.map((topic: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-doc-fg">
                        <span className="text-doc-accent mt-0.5">→</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Pending Refills */}
          {pending_refills?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
                📋 Pending Refill Requests
              </h3>
              <RefillQueue refillRequests={pending_refills} onRefillAction={onRefresh} />
            </section>
          )}

          {/* Follow-up Scheduler */}
          <section className="border-t border-doc-border pt-6">
            <FollowUpScheduler
              patientId={patient.id}
              patientName={patient.full_name}
            />
          </section>

          {/* X-ray placeholder */}
          <section>
            <h3 className="text-xs uppercase tracking-[0.15em] text-doc-fg-muted font-semibold mb-3">
              X-Ray Canvas Overlay
            </h3>
            <div className="card-clinical p-6 text-center">
              <svg className="w-10 h-10 mx-auto text-doc-fg-dim mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-doc-fg-muted">
                No X-ray uploaded for this patient yet. Once reception uploads one,
                results from the YOLOv7-p6 fracture-detection model will render here.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* =================== MEDICATIONS TAB =================== */}
      {activeTab === "medications" && (
        <div className="space-y-6 max-w-4xl">
          <MedicationEditor
            patientId={patient.id}
            onGuardrailResult={(result) => setGuardrailSafe(result.safe)}
          />

          {/* Sign-off button */}
          <div className="border-t border-doc-border pt-6 flex items-center gap-4">
            {verified ? (
              <div className="flex items-center gap-2 text-severity-safe">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold">Protocol Verified & Activated</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="btn-primary disabled:opacity-50"
                >
                  {verifying ? "Verifying…" : "Verify & Activate Protocol →"}
                </button>
                {!guardrailSafe && (
                  <span className="text-xs text-severity-warning">
                    ⚠ Acknowledge all flags before sign-off
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* =================== DICTATION TAB =================== */}
      {activeTab === "dictation" && (
        <div className="max-w-3xl">
          <DictationControl prescriptionId={`rx-${patient.id}`} />
        </div>
      )}
    </div>
  );
}
