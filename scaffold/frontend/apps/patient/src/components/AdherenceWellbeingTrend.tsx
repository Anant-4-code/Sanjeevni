"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Frown, Meh, Smile, Laugh, HelpCircle, TrendingUp, Calendar, Info } from "lucide-react";
import { API_BASE } from "@/lib/api";

type DayPoint = {
  date: string;
  adherence_pct: number | null;
  doses_taken: number | null;
  doses_scheduled: number | null;
  wellbeing_score: number | null;
  note_excerpt: string | null;
};

type TrendResponse = {
  series: DayPoint[];
  pattern_note: string | null;
};

const MOOD_ICON: Record<number, { Icon: React.ElementType; color: string; label: string }> = {
  1: { Icon: Frown, color: "text-rose-500 dark:text-rose-400", label: "Very Low / Severe Distress" },
  2: { Icon: Frown, color: "text-amber-500 dark:text-amber-400", label: "Low / Uncomfortable" },
  3: { Icon: Meh, color: "text-amber-400 dark:text-amber-300", label: "Moderate / Fair" },
  4: { Icon: Smile, color: "text-emerald-500 dark:text-emerald-400", label: "Good / Comfortable" },
  5: { Icon: Laugh, color: "text-emerald-600 dark:text-emerald-400", label: "Excellent / Optimal" },
};

function adherenceColor(pct: number | null): string {
  if (pct === null) return "bg-gray-200 dark:bg-gray-800";
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdherenceWellbeingTrend({ patientId }: { patientId: string }) {
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/doctor/patient/${patientId}/adherence-wellbeing?days=${windowDays}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, windowDays]);

  const goToDay = (day: string) => {
    router.push(`/doctor/patient/${patientId}/timeline?date=${day}`);
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-4">
      {/* Header & Window Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
            Adherence &amp; Wellbeing Trend (Past {windowDays} Days)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Window:</span>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value) as 7 | 14 | 30)}
            className="text-xs bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-2.5 py-1 font-semibold text-[#0F172A] dark:text-white outline-none cursor-pointer"
          >
            <option value={7}>7-DAY WINDOW</option>
            <option value={14}>14-DAY WINDOW</option>
            <option value={30}>30-DAY WINDOW</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-[#64748B] dark:text-gray-400">
        Display-only side-by-side tracking for doctor review (non-causal observation). Click any day to view clinical timeline details.
      </p>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-flow-col auto-cols-fr gap-2 pt-2">
          {Array.from({ length: windowDays }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.series.length === 0 ? (
        <p className="text-xs text-[#64748B] dark:text-gray-400 py-6 text-center">
          No adherence or wellbeing data recorded in this window yet.
        </p>
      ) : (
        <div
          className="grid gap-2 overflow-x-auto pt-2 pb-1"
          style={{ gridTemplateColumns: `repeat(${data.series.length}, minmax(72px, 1fr))` }}
        >
          {data.series.map((day) => {
            const mood = day.wellbeing_score ? MOOD_ICON[day.wellbeing_score] : null;
            const isHovered = hoveredDay === day.date;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => goToDay(day.date)}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
                className="relative text-left border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/60 dark:bg-[#1F2937]/30 hover:border-[#0F172A] dark:hover:border-white hover:bg-white dark:hover:bg-[#111827] rounded-2xl p-2.5 transition-all group flex flex-col justify-between cursor-pointer"
              >
                <p className="text-[10px] font-mono text-center text-[#64748B] dark:text-gray-400 font-bold mb-2">
                  {formatDayLabel(day.date)}
                </p>

                {/* Adherence Bar */}
                <div className="h-16 flex items-end justify-center mb-2 px-1">
                  <div
                    className={`w-full rounded-md ${adherenceColor(day.adherence_pct)} transition-all`}
                    style={{ height: day.adherence_pct !== null ? `${Math.max(12, day.adherence_pct)}%` : "8%" }}
                  />
                </div>

                {/* Score */}
                <p className="text-xs font-bold text-center text-[#0F172A] dark:text-white mb-2 font-mono">
                  {day.adherence_pct !== null ? `${day.adherence_pct}%` : "—"}
                </p>

                {/* Encoding-Safe Wellbeing Icon */}
                <div className="flex justify-center pt-1 border-t border-gray-100 dark:border-gray-800">
                  {mood ? (
                    <mood.Icon className={`w-4 h-4 ${mood.color}`} aria-label={mood.label} />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" aria-label="No log" />
                  )}
                </div>

                {/* Rich Real-Data Tooltip */}
                {isHovered && (
                  <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-[#0F172A] dark:bg-black text-white text-xs p-3 rounded-2xl shadow-xl space-y-1 pointer-events-none animate-in fade-in zoom-in-95">
                    <p className="font-bold border-b border-gray-700 pb-1 flex items-center justify-between">
                      <span>{formatDayLabel(day.date)}</span>
                      <span className="text-[10px] text-gray-400 font-normal">Click to open</span>
                    </p>
                    <p className="text-[11px] text-gray-200">
                      {day.adherence_pct !== null
                        ? `${day.adherence_pct}% adherence (${day.doses_taken}/${day.doses_scheduled} doses taken)`
                        : "No doses scheduled"}
                    </p>
                    <p className="text-[11px] text-gray-200 flex items-center gap-1">
                      <span>Wellbeing:</span>
                      <strong className="text-white">
                        {day.wellbeing_score ? `${day.wellbeing_score}/5 (${mood?.label})` : "Not logged"}
                      </strong>
                    </p>
                    {day.note_excerpt && (
                      <p className="mt-1 italic text-[10px] text-gray-300 bg-gray-900/80 p-1.5 rounded-lg border border-gray-700">
                        &ldquo;{day.note_excerpt}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Non-Causal Pattern Insight Banner */}
      {data?.pattern_note && (
        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-2xl">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Observation:</strong> {data.pattern_note}{" "}
            <span className="text-[11px] opacity-80">(Informational observation only &mdash; not a clinical diagnosis).</span>
          </p>
        </div>
      )}
    </div>
  );
}
