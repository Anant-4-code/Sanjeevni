import { useState, useEffect, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

// Category config: icons, labels, colors
const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  lab_report:         { icon: "\uD83E\uDDEA", label: "Lab Reports",          color: "text-blue-400" },
  xray_scan:          { icon: "\uD83E\uDDB4", label: "X-Rays / Imaging",     color: "text-purple-400" },
  mri_ct_scan:        { icon: "\uD83E\uDDE0", label: "MRI / CT",             color: "text-indigo-400" },
  prescription:       { icon: "\uD83D\uDC8A", label: "Prescriptions",        color: "text-green-400" },
  discharge_summary:  { icon: "\uD83D\uDCC4", label: "Discharge Summaries",  color: "text-amber-400" },
  vaccination:        { icon: "\uD83D\uDC89", label: "Vaccinations",         color: "text-teal-400" },
  referral_letter:    { icon: "\u2709\uFE0F",  label: "Referrals",            color: "text-orange-400" },
  other:              { icon: "\uD83D\uDCC1", label: "Other",                color: "text-gray-400" },
};

interface FullRecordProps {
  patientId: string;
  patientName: string;
  doctorId?: string;
}

export default function FullRecord({ patientId, patientName, doctorId = "doc-sharma-1" }: FullRecordProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchRecord = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (doctorFilter !== "all") params.set("doctor_id", doctorFilter);
      const res = await fetch(`${API_BASE}/doctor/patient/${patientId}/full-record?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch full record:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecord(); }, [patientId, categoryFilter, doctorFilter]);

  const handleVerify = async (docId: string) => {
    setVerifying(docId);
    try {
      await fetch(`${API_BASE}/doctor/documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId }),
      });
      fetchRecord();
    } catch (err) {
      console.error("Verify failed:", err);
    } finally {
      setVerifying(null);
    }
  };

  // Extract unique doctor names for filter dropdown
  const doctorNames = useMemo(() => {
    if (!data?.prescriptions_timeline) return [];
    const names = new Set(data.prescriptions_timeline.map((rx: any) => rx.doctor_name));
    return Array.from(names) as string[];
  }, [data]);

  // Count documents per category
  const categoryCounts = useMemo(() => {
    if (!data?.documents) return {};
    const counts: Record<string, number> = {};
    for (const [cat, docs] of Object.entries(data.documents)) {
      counts[cat] = (docs as any[]).length;
    }
    return counts;
  }, [data]);

  const totalDocs = Object.values(categoryCounts).reduce((a: number, b: number) => a + b, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-doc-fg-muted">Loading full medical record...</div>
      </div>
    );
  }

  if (!data || data.error) {
    return <div className="text-severity-critical p-4">Error loading record</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-doc-accent font-semibold">
            SPEC 12 // Full Medical Record
          </span>
          <h2 className="font-display text-2xl font-bold text-doc-fg">
            {patientName} &mdash; Complete History
          </h2>
        </div>
        <div className="flex gap-2">
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="bg-doc-elevated border border-doc-border rounded-lg px-3 py-1.5 text-sm text-doc-fg focus:border-doc-accent outline-none"
          >
            <option value="all">All Doctors</option>
            {doctorNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-doc-elevated border border-doc-border rounded-lg px-3 py-1.5 text-sm text-doc-fg focus:border-doc-accent outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Prescription Timeline (Cross-Doctor) ── */}
      <section className="bg-doc-card border border-doc-border rounded-xl p-5">
        <h3 className="font-display text-lg font-semibold text-doc-fg mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-doc-accent inline-block" />
          Prescription Timeline (Cross-Doctor)
        </h3>
        {data.prescriptions_timeline.length === 0 ? (
          <p className="text-doc-fg-muted text-sm">No prescriptions found.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-doc-border space-y-4">
            {data.prescriptions_timeline.map((rx: any) => (
              <div key={rx.id} className="relative group">
                <div className="absolute -left-[1.6rem] top-1 w-3 h-3 rounded-full bg-doc-accent border-2 border-doc-bg group-hover:scale-125 transition-transform" />
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-medium text-doc-fg">{rx.medicine_name}</span>
                    <span className="text-doc-fg-muted text-xs ml-2">{rx.dosage}</span>
                    <div className="text-xs text-doc-fg-dim mt-0.5">
                      {rx.doctor_name} &middot; {rx.doctor_specialty}
                    </div>
                  </div>
                  <div className="text-xs text-doc-fg-dim whitespace-nowrap">
                    {rx.verified_at}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Lab Trends ── */}
      {data.lab_trends && data.lab_trends.length > 0 && (
        <section className="bg-doc-card border border-doc-border rounded-xl p-5">
          <h3 className="font-display text-lg font-semibold text-doc-fg mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-severity-info inline-block" />
            Lab Trends
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {data.lab_trends.map((trend: any) => (
              <TrendCard key={trend.test_name} trend={trend} />
            ))}
          </div>
        </section>
      )}

      {/* ── All Documents ── */}
      <section className="bg-doc-card border border-doc-border rounded-xl p-5">
        <h3 className="font-display text-lg font-semibold text-doc-fg mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-severity-safe inline-block" />
          All Documents ({totalDocs})
        </h3>
        {/* Category badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
            return (
              <span
                key={cat}
                className={`text-xs px-2.5 py-1 rounded-full bg-doc-elevated border border-doc-border ${cfg.color}`}
              >
                {cfg.icon} {cfg.label} ({count})
              </span>
            );
          })}
        </div>
        {/* Document list */}
        <div className="space-y-2">
          {Object.entries(data.documents).flatMap(([cat, docs]: [string, any]) =>
            docs.map((doc: any) => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
              const isPatientUploaded = doc.source === "patient_uploaded";
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isPatientUploaded
                      ? "border-severity-warning/30 bg-severity-warning/5 hover:bg-severity-warning/10"
                      : "border-doc-border bg-doc-elevated hover:bg-doc-hover"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{cfg.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-doc-fg truncate">{doc.title}</div>
                      <div className="text-xs text-doc-fg-dim flex items-center gap-2">
                        <span>{doc.document_date}</span>
                        {isPatientUploaded ? (
                          <span className="text-severity-warning font-medium">
                            &#x26A0; Not clinically verified &mdash; uploaded by patient
                          </span>
                        ) : (
                          <span className="text-severity-safe">Clinic-Verified</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button className="text-xs px-3 py-1 rounded-md bg-doc-accent/10 text-doc-accent hover:bg-doc-accent/20 transition-colors">
                      View
                    </button>
                    {isPatientUploaded && (
                      <button
                        onClick={() => handleVerify(doc.id)}
                        disabled={verifying === doc.id}
                        className="text-xs px-3 py-1 rounded-md bg-severity-safe/10 text-severity-safe hover:bg-severity-safe/20 transition-colors disabled:opacity-50"
                      >
                        {verifying === doc.id ? "..." : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Adherence & Allergy Summary (compact) ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-doc-card border border-doc-border rounded-xl p-4">
          <div className="text-xs text-doc-fg-muted uppercase tracking-wider mb-2">Adherence Score</div>
          <div className={`text-3xl font-display font-bold ${
            data.adherence_score >= 80 ? "text-severity-safe" :
            data.adherence_score >= 60 ? "text-severity-warning" :
            "text-severity-critical"
          }`}>
            {data.adherence_score}%
          </div>
          <div className="mt-2 h-2 bg-doc-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.adherence_score >= 80 ? "bg-severity-safe" :
                data.adherence_score >= 60 ? "bg-severity-warning" :
                "bg-severity-critical"
              }`}
              style={{ width: `${data.adherence_score}%` }}
            />
          </div>
        </div>

        <div className="bg-doc-card border border-doc-border rounded-xl p-4">
          <div className="text-xs text-doc-fg-muted uppercase tracking-wider mb-2">Allergies</div>
          {data.allergy_profile.length === 0 ? (
            <p className="text-doc-fg-dim text-sm">No known allergies</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.allergy_profile.map((a: any) => (
                <span key={a.allergen_name || a.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                  a.severity === "severe"
                    ? "border-severity-critical/40 bg-severity-critical/10 text-severity-critical"
                    : "border-severity-warning/40 bg-severity-warning/10 text-severity-warning"
                }`}>
                  {a.allergen_name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-doc-card border border-doc-border rounded-xl p-4">
          <div className="text-xs text-doc-fg-muted uppercase tracking-wider mb-2">Active Alerts</div>
          <div className="text-2xl font-display font-bold text-severity-warning">
            {data.smart_alerts?.filter((a: any) => !a.acknowledged).length || 0}
          </div>
          <p className="text-xs text-doc-fg-dim mt-1">unacknowledged</p>
        </div>
      </div>
    </div>
  );
}


/* ────────── Inline Trend Chart Component ────────── */
function TrendCard({ trend }: { trend: any }) {
  const points = trend.points || [];
  if (points.length < 2) return null;

  const values = points.map((p: any) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const first = values[0];
  const last = values[values.length - 1];
  const improving = last < first;
  const trendDir = improving ? "improving" : "worsening";
  const trendIcon = improving ? "\uD83D\uDCC9" : "\uD83D\uDCC8";
  const trendColor = improving ? "text-severity-safe" : "text-severity-warning";

  // SVG chart dimensions
  const W = 280;
  const H = 60;
  const PAD = 8;

  const svgPoints = points.map((p: any, i: number) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - minVal) / range) * (H - PAD * 2);
    return { x, y, value: p.value, date: p.date };
  });

  const pathD = svgPoints.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="bg-doc-elevated border border-doc-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-doc-fg">{trend.test_name}</span>
          <span className="text-xs text-doc-fg-dim ml-2">({trend.unit})</span>
        </div>
        <span className={`text-xs font-medium ${trendColor}`}>
          {trendIcon} {trendDir}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-doc-fg-dim whitespace-nowrap">
          {first}{trend.unit} &rarr; {last}{trend.unit}
        </span>
        <span className="text-[0.65rem] text-doc-fg-dim">
          Ref: {trend.reference_range} {trend.unit}
        </span>
      </div>
      {/* Inline SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 mt-2">
        <path d={pathD} fill="none" stroke={improving ? "#44cc66" : "#ffaa22"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {svgPoints.map((p: any, i: number) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={improving ? "#44cc66" : "#ffaa22"} stroke="#161920" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#7a7e8a" fontSize="8" fontFamily="Inter">
              {p.value}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[0.6rem] text-doc-fg-dim mt-1">
        {svgPoints.map((p: any, i: number) => (
          <span key={i}>{p.date}</span>
        ))}
      </div>
    </div>
  );
}
