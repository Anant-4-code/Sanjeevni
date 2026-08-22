"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Kanban,
  Tag,
  Plus,
  X,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Pill,
  Send,
  Pin,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/lib/api";

const EVENT_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  note: { icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  task_created: { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  task_completed: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  stage_changed: { icon: Kanban, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
  prescription_verified: { icon: Pill, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  communication: { icon: Phone, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  tag_added: { icon: Tag, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
};

export default function DoctorPatientCRMPage() {
  const params = useParams();
  const { user } = useAuth();
  const doctorId = user?.id || "doc-sharma-1";
  const patientId = params.patientId as string;

  const [stages, setStages] = useState<any[]>([
    { id: "stg-01", name: "New Intake" },
    { id: "stg-02", name: "Consultation" },
    { id: "stg-03", name: "Active Treatment" },
    { id: "stg-04", name: "Follow-Up" },
    { id: "stg-05", name: "Stable / Discharged" },
  ]);
  const [currentStageId, setCurrentStageId] = useState("stg-03");
  const [tags, setTags] = useState<any[]>([
    { id: "tag-1", name: "High Risk", color: "#EF4444" },
    { id: "tag-2", name: "Diabetic", color: "#3B82F6" },
  ]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Note state
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // New Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskDueDate, setTaskDueDate] = useState("");

  // New Comm Log modal state
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commChannel, setCommChannel] = useState("call");
  const [commDirection, setCommDirection] = useState("outbound");
  const [commSummary, setCommSummary] = useState("");

  // Move Stage modal state
  const [moveStageModalOpen, setMoveStageModalOpen] = useState(false);
  const [targetStageId, setTargetStageId] = useState("");
  const [moveReason, setMoveReason] = useState("");

  const fetchCRMData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/crm/patient/${patientId}/activity`);
      const data = await res.json();
      setActivity(data.activity || []);
    } catch (e) {
      console.error("CRM activity fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchCRMData();
  }, [fetchCRMData]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await fetch(`${API_BASE}/doctor/crm/patient/${patientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: noteBody,
          pinned: notePinned,
          doctor_id: doctorId,
        }),
      });
      setNoteBody("");
      setNotePinned(false);
      fetchCRMData();
    } catch (err) {
      console.error("Add note failed:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await fetch(`${API_BASE}/doctor/crm/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          title: taskTitle,
          priority: taskPriority,
          due_at: taskDueDate || undefined,
        }),
      });
      setTaskModalOpen(false);
      setTaskTitle("");
      fetchCRMData();
    } catch (err) {
      console.error("Task creation failed:", err);
    }
  };

  const handleLogComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commSummary.trim()) return;
    try {
      await fetch(`${API_BASE}/doctor/crm/patient/${patientId}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: commChannel,
          direction: commDirection,
          summary: commSummary,
          doctor_id: doctorId,
        }),
      });
      setCommModalOpen(false);
      setCommSummary("");
      fetchCRMData();
    } catch (err) {
      console.error("Comm log failed:", err);
    }
  };

  const handleConfirmStageMove = async () => {
    if (!targetStageId) return;
    try {
      await fetch(`${API_BASE}/doctor/crm/patient/${patientId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_id: targetStageId,
          reason: moveReason,
          doctor_id: doctorId,
        }),
      });
      setCurrentStageId(targetStageId);
      setMoveStageModalOpen(false);
      setMoveReason("");
      fetchCRMData();
    } catch (err) {
      console.error("Stage transition failed:", err);
    }
  };

  const currentStageName = stages.find((s) => s.id === currentStageId)?.name || "Active Treatment";

  return (
    <div className="space-y-6">
      {/* ── CRM Top Header Card (Tags & Stage Selector) ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-[#64748B] dark:text-gray-400 font-bold">
              CARE PIPELINE STAGE:
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-full font-bold text-xs">
              {currentStageName}
            </span>
            <button
              onClick={() => {
                setTargetStageId(currentStageId);
                setMoveStageModalOpen(true);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1"
            >
              Move Stage &rarr;
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Follow-Up Task</span>
            </button>

            <button
              onClick={() => setCommModalOpen(true)}
              className="px-3.5 py-1.5 bg-white dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] hover:bg-gray-50 text-[#0F172A] dark:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Log Touchpoint</span>
            </button>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-[#64748B] font-bold">TAGS:</span>
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
              style={{ backgroundColor: `${tag.color}15`, borderColor: `${tag.color}40`, color: tag.color }}
            >
              <span>{tag.name}</span>
              <button
                onClick={() => setTags(tags.filter((t) => t.id !== tag.id))}
                className="opacity-70 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => {
              const newTag = prompt("Enter tag name (e.g. Cardiac Risk, Post-Op):");
              if (newTag?.trim()) {
                setTags([...tags, { id: `tag-${Date.now()}`, name: newTag.trim(), color: "#3B82F6" }]);
              }
            }}
            className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white px-2 py-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"
          >
            + Add Tag
          </button>
        </div>
      </div>

      {/* ── Add Note Box ── */}
      <form onSubmit={handleAddNote} className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-gray-400 font-bold flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Free-Form Clinical Note</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[#64748B] cursor-pointer">
            <input
              type="checkbox"
              checked={notePinned}
              onChange={(e) => setNotePinned(e.target.checked)}
              className="rounded"
            />
            <Pin className="w-3 h-3" />
            <span>Pin note to top</span>
          </label>
        </div>

        <textarea
          rows={2}
          required
          placeholder="Type patient observation, care plan adjustment, or family discussion summary..."
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3 text-xs text-[#0F172A] dark:text-white outline-none focus:border-blue-500"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingNote || !noteBody.trim()}
            className="px-5 py-2 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" />
            <span>{savingNote ? "Logging Note..." : "Save Note to Timeline"}</span>
          </button>
        </div>
      </form>

      {/* ── Unified Patient Activity Feed ── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F2937] pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Unified Patient Activity Timeline</h3>
          </div>
          <button
            onClick={fetchCRMData}
            className="text-xs text-[#64748B] hover:text-[#0F172A] dark:hover:text-white flex items-center gap-1 font-semibold"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {loading && activity.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
            <span>Loading continuous activity history...</span>
          </div>
        ) : activity.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B]">
            No activity records logged for this patient yet.
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2E8F0] dark:before:bg-[#1F2937]">
            {activity.map((item, idx) => {
              const cfg = EVENT_ICONS[item.event_type] || EVENT_ICONS.note;
              const Icon = cfg.icon;
              return (
                <div key={item.id || idx} className="relative flex items-start gap-4 pl-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${cfg.bg} ${cfg.color} border border-white dark:border-[#111827] shadow-xs`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30 border border-[#E2E8F0] dark:border-[#1F2937] p-3.5 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-gray-400">
                      <span className="font-bold text-[#0F172A] dark:text-white capitalize">
                        {item.actor_name || "System"}
                      </span>
                      <span className="font-mono">
                        {item.occurred_at
                          ? new Date(item.occurred_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently"}
                      </span>
                    </div>
                    <p className="text-[#334155] dark:text-gray-200 leading-relaxed font-medium">
                      {item.event_summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Task Modal ── */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTask}
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] max-w-md w-full p-6 rounded-3xl space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-[#0F172A] dark:text-white">Create Follow-Up Task</h3>
              <button onClick={() => setTaskModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Task Title / Action</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call patient regarding HbA1c lab result"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827] outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent 🚨</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Communication Touchpoint Modal ── */}
      {commModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleLogComm}
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] max-w-md w-full p-6 rounded-3xl space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-[#0F172A] dark:text-white">Log Patient Touchpoint</h3>
              <button onClick={() => setCommModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Channel</label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827]"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="in_person">In-Person</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Direction</label>
                  <select
                    value={commDirection}
                    onChange={(e) => setCommDirection(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827]"
                  >
                    <option value="outbound">Outbound (Clinic → Patient)</option>
                    <option value="inbound">Inbound (Patient → Clinic)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Summary of Discussion</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Called patient to inquire about dizziness following medication change..."
                  value={commSummary}
                  onChange={(e) => setCommSummary(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCommModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl text-xs font-bold"
              >
                Log Touchpoint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Move Stage Modal ── */}
      {moveStageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] max-w-md w-full p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-[#0F172A] dark:text-white">Transition Care Stage</h3>
              <button onClick={() => setMoveStageModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Select Target Stage</label>
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
                <label className="font-bold block mb-1">Clinical Transition Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Protocol verified, transitioning to active dosing monitoring"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-[#111827]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMoveStageModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStageMove}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
