"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ArrowRight, TrendingUp, Clock, FileText } from "lucide-react";
import { API_BASE } from "@/lib/api";

type VaultInsight = {
  type: "duplicate_warning" | "prescription_comparison" | "expiry_decay" | "scan_trend" | "visit_bundle";
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical" | "notice";
  related_document_ids?: string[];
  action_cta?: string;
  action_href?: string;
};

export default function VaultInsightsStrip({ patientId }: { patientId: string }) {
  const [insights, setInsights] = useState<VaultInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/patient/${patientId || "demo-patient"}/vault/insights`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setInsights(Array.isArray(d?.insights) ? d.insights : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInsights([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Spec rule: Show NOTHING if no genuine insights exist (never show fake generic fillers)
  if (loading || insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Vault AI Insights ({insights.length})
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase tracking-wider">
          Assistive Clinical Intelligence
        </span>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, idx) => {
          let Icon = TrendingUp;
          let badgeColor = "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700";

          if (insight.type === "duplicate_warning") {
            Icon = AlertTriangle;
            badgeColor = "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700";
          } else if (insight.type === "expiry_decay") {
            Icon = Clock;
            badgeColor = "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700";
          }

          return (
            <div
              key={`insight-${idx}`}
              className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xs border border-[var(--border)] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-[var(--bg-muted)] flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[var(--fg)]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--fg)]">{insight.title}</h4>
                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {insight.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5 leading-relaxed">
                    {insight.body}
                  </p>
                </div>
              </div>

              {insight.action_href && (
                <Link
                  href={insight.action_href}
                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--fg)] hover:text-emerald-600 dark:hover:text-emerald-400 flex-shrink-0 self-end sm:self-center transition-colors"
                >
                  <span>{insight.action_cta || "Review"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
