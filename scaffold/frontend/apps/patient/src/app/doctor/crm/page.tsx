"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Kanban,
  Users,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  ArrowRight,
  RefreshCw,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Phone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

interface PipelinePatient {
  patient_id: string;
  doctor_id: string;
  stage_id: string;
  entered_stage_at: string;
  priority_weight: number;
  source?: string;
  patient: {
    id: string;
    full_name: string;
    age: number;
    gender: string;
    phone: string;
    adherence_score?: number;
    chief_complaint?: string;
  };
  tags: { id: string; name: string; color: string }[];
  overdue_tasks_count: number;
}

interface Stage {
  id: string;
  name: string;
  sort_order: number;
  color: string;
  is_terminal: boolean;
}

export default function DoctorPipelineKanbanPage() {
  const { user } = useAuth();
  const doctorId = user?.id || "doc-sharma-1";

  const [stages, setStages] = useState<Stage[]>([]);
  const [columns, setColumns] = useState<Record<string, PipelinePatient[]>>({});
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // Stage Move Dropdown Modal / State
  const [movingPatient, setMovingPatient] = useState<PipelinePatient | null>(null);
  const [targetStageId, setTargetStageId] = useState("");
  const [transitionReason, setTransitionReason] = useState("");

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ doctor_id: doctorId });
      if (selectedTag !== "all") q.set("tag", selectedTag);

      const [pipeRes, analRes, tagRes] = await Promise.all([
        fetch(`${API_BASE}/doctor/crm/pipeline?${q.toString()}`),
        fetch(`${API_BASE}/doctor/crm/analytics/funnel?doctor_id=${encodeURIComponent(doctorId)}`),
        fetch(`${API_BASE}/doctor/crm/tags`),
      ]);

      const pipeData = await pipeRes.json();
      const analData = await analRes.json();
      const tagData = await tagRes.json();

      setStages(pipeData.stages || []);
      setColumns(pipeData.columns || {});
      setAnalytics(analData);
      setAvailableTags(tagData.tags || []);
    } catch (e) {
      console.error("Pipeline fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedTag]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleStageMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingPatient || !targetStageId) return;

    try {
      await fetch(`${API_BASE}/doctor/crm/patient/${movingPatient.patient_id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_id: targetStageId,
          reason: transitionReason,
          doctor_id: doctorId,
        }),
      });
      setMovingPatient(null);
      setTransitionReason("");
      fetchPipeline();
    } catch (err) {
      console.error("Stage move error:", err);
    }
  };

  const calculateDaysInStage = (dateStr: string) => {
    if (!dateStr) return "1d";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
    return `${days}d in stage`;
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* ── Top Header & Subnav ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
              CARE JOURNEY CRM &bull; SPEC CRM-1
            </span>
          </div>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white">
            Patient Care Pipeline
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            Longitudinal patient stages, follow-up tasks, and care-coordination Kanban.
          </p>
        </div>

        {/* View Switcher: Triage Queue <-> Care Pipeline */}
        <div className="flex items-center gap-2">
          <Link
            href="/doctor"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          >
            Triage Consultation Queue
          </Link>
          <div className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs flex items-center gap-1.5">
            <Kanban className="w-3.5 h-3.5" />
            <span>Care Pipeline (CRM)</span>
          </div>
        </div>
      </div>

      {/* ── Section: Funnel Analytics Bar (Spec CRM-7) ── */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold">
              Total Active In Care
            </div>
            <div className="text-2xl font-black text-[#0F172A] dark:text-white mt-1">
              {analytics.total_active_pipeline || 5} Patients
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold">
              Avg Active Tx Duration
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {analytics.avg_time_in_active_treatment_days || 18} Days
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-bold">
              Overdue Tasks &bull; Follow-Ups
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {analytics.overdue_tasks_count || 2} Pending
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold">
              High Risk Tagged
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {analytics.high_risk_count || 1} Patients
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-bold">Tag:</span>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl px-3 py-2 text-xs outline-none font-medium"
          >
            <option value="all">All Tags</option>
            {availableTags.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchPipeline}
            className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Refresh pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Section: Kanban Board (Spec CRM-1) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const colPatients = (columns[stage.id] || []).filter((p) => {
            if (!searchQuery) return true;
            return (
              p.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.patient?.phone?.includes(searchQuery)
            );
          });

          return (
            <div
              key={stage.id}
              className="bg-[#F8F7F4]/60 dark:bg-[#111827]/50 border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-3.5 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1F2937] mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="font-bold text-xs text-[#0F172A] dark:text-white uppercase tracking-wider">
                    {stage.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-white dark:bg-[#111827] px-2 py-0.5 rounded-md border border-[#E2E8F0] dark:border-[#1F2937]">
                  {colPatients.length}
                </span>
              </div>

              {/* Patient Cards */}
              <div className="space-y-3 flex-1">
                {colPatients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B] border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    No patients in this stage
                  </div>
                ) : (
                  colPatients.map((item) => (
                    <div
                      key={item.patient_id}
                      className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-all space-y-2.5 group"
                    >
                      {/* Name & Age */}
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/doctor/patient/${item.patient_id}/timeline`}
                            className="font-bold text-sm text-[#0F172A] dark:text-white group-hover:text-blue-600 transition-colors"
                          >
                            {item.patient?.full_name}
                          </Link>
                          <div className="text-[11px] text-[#64748B] dark:text-gray-400">
                            {item.patient?.age}y &bull; {item.patient?.gender}
                          </div>
                        </div>

                        {item.patient?.adherence_score !== undefined && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              item.patient.adherence_score >= 80
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.patient.adherence_score >= 60
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}
                          >
                            {item.patient.adherence_score}%
                          </span>
                        )}
                      </div>

                      {/* Chief Complaint */}
                      {item.patient?.chief_complaint && (
                        <p className="text-[11px] text-[#475569] dark:text-gray-300 line-clamp-2">
                          {item.patient.chief_complaint}
                        </p>
                      )}

                      {/* Tags */}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Overdue Task Pill */}
                      {item.overdue_tasks_count > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-1 rounded">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{item.overdue_tasks_count} follow-up task overdue</span>
                        </div>
                      )}

                      {/* Card Footer: Time in Stage + Move Button */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                        <span>{calculateDaysInStage(item.entered_stage_at)}</span>
                        <button
                          onClick={() => {
                            setMovingPatient(item);
                            setTargetStageId(item.stage_id);
                          }}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Move &rarr;
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Move Stage Dialog ── */}
      {movingPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleStageMoveSubmit}
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] max-w-md w-full p-6 rounded-3xl space-y-4 shadow-2xl"
          >
            <h3 className="font-bold text-base text-[#0F172A] dark:text-white">
              Move {movingPatient.patient?.full_name} to Stage
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Target Care Stage</label>
                <select
                  value={targetStageId}
                  onChange={(e) => setTargetStageId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827]"
                >
                  {stages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Transition Note / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Lab results verified, progressing to active regimen"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingPatient(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Move
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
