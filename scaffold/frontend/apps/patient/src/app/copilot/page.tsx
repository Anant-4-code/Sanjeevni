"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import {
  Send,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  PlusCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  ScanLine,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Source = {
  doc_id: string;
  title: string;
  category?: string;
};

type SuggestedAction = {
  type: string;
  doctor_name?: string;
  prefill_text?: string;
} | null;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  response_type?: string; // "normal" | "guardrail_refusal" | "no_context"
  suggested_action?: SuggestedAction;
  llm_tier?: string;
  feedback?: "up" | "down" | null;
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm Sanjivini, your AI health assistant. I answer questions about your verified prescriptions — such as dosage timing, food interactions, or side effects. How can I help you today?",
};

const SUGGESTED_PROMPTS = [
  "Can I take my medication with food or milk?",
  "What should I do if I miss a scheduled dose?",
  "Are there common side effects I should watch for?",
  "Can I take OTC cold medicines with my regimen?",
];

function SourceChip({ source }: { source: Source }) {
  const router = useRouter();
  const categoryRouteMap: Record<string, string> = {
    prescriptions: "prescription",
    "lab-reports": "lab-reports",
    "x-rays": "imaging",
    other: "records",
  };
  const routeCategory = categoryRouteMap[source.category || ""] || "prescription";

  return (
    <button
      onClick={() => router.push(`/vault/${routeCategory}/${source.doc_id}`)}
      className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1 rounded-full hover:border-[var(--fg)] hover:bg-[var(--bg-muted)] transition-all text-[var(--fg-muted)] hover:text-[var(--fg)] shadow-sm group flex-shrink-0"
    >
      <FileText className="w-3 h-3 text-[var(--fg-muted)] group-hover:text-[var(--fg)]" />
      <span className="truncate max-w-[180px]">{source.title}</span>
      <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function CopilotContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sanjeevani_copilot_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      try {
        localStorage.setItem("sanjeevani_copilot_chat", JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  useEffect(() => {
    if (initialQuery && !initialSent.current) {
      initialSent.current = true;
      handleDirectSend(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleDirectSend(queryText: string) {
    const userMsg: Message = {
      id: "u-" + Date.now(),
      role: "user",
      content: queryText,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/patient/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "demo-patient",
          question: queryText,
          history: historyPayload,
        }),
      });

      if (!res.ok) throw new Error("API call failed");
      const data = await res.json();

      const botMsg: Message = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: data.answer || data.message || "I received your message.",
        sources: data.sources || [],
        response_type: data.response_type || "normal",
        suggested_action: data.suggested_action || null,
        llm_tier: data.llm_tier || "",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: Message = {
        id: "a-" + Date.now(),
        role: "assistant",
        content:
          "Always follow your doctor's exact dosage instructions and schedule. If you feel unusual symptoms or side effects, consult your attending physician immediately.",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    const queryText = input.trim();
    setInput("");
    await handleDirectSend(queryText);
  }

  function handleClearChat() {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    try {
      localStorage.removeItem("sanjeevani_copilot_chat");
    } catch {}
  }

  async function handleFeedback(messageId: string, rating: "up" | "down", msg: Message) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    );

    const prevUserMsg = messages
      .slice(0, messages.findIndex((m) => m.id === messageId))
      .reverse()
      .find((m) => m.role === "user");

    try {
      await fetch(`${API_BASE}/patient/copilot-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "demo-patient",
          question: prevUserMsg?.content || "",
          answer: msg.content,
          rating,
          llm_tier: msg.llm_tier || "",
        }),
      });
    } catch {}
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-elevated)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 rounded-full hover:bg-[var(--bg-muted)] transition-colors text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center font-bold shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base sm:text-lg tracking-tight">Sanjivini Copilot</h1>
            <p className="text-[11px] text-[var(--fg-muted)]">Verified Medical Assistant · Ask anything</p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] rounded-full transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm sm:text-base leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                  : msg.response_type === "guardrail_refusal"
                  ? "bg-[var(--warn-bg)] border border-[var(--warn-border)] text-[var(--warn)] font-medium"
                  : "bg-[var(--bg-muted)] text-[var(--fg)] border border-[var(--border)] shadow-sm"
              }`}
            >
              {/* Feature A — Guardrail Warning Banner */}
              {msg.response_type === "guardrail_refusal" && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--warn-border)] text-xs font-bold uppercase tracking-wider text-[var(--warn)]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Clinical Safety Guardrail</span>
                </div>
              )}

              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Feature B — Source Citation Chips */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--fg-muted)] uppercase tracking-wider mr-1">
                    Sources:
                  </span>
                  {msg.sources.map((s) => (
                    <SourceChip key={s.doc_id} source={s} />
                  ))}
                </div>
              )}

              {/* Feature C — Empty Context Prompt to Scan */}
              {msg.response_type === "no_context" && (
                <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
                  <Link
                    href="/scan-otc"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold rounded-full uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    Scan Prescription to Add Context
                  </Link>
                </div>
              )}

              {/* Feature D — Ask-My-Doctor Escalation */}
              {msg.suggested_action?.type === "message_doctor" && (
                <div className="mt-3 pt-2.5 border-t border-[var(--warn-border)]">
                  <Link
                    href={`/messages?recipient=${encodeURIComponent(msg.suggested_action.doctor_name || "")}&prefill=${encodeURIComponent(msg.suggested_action.prefill_text || "")}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--warn)] text-white text-xs font-bold rounded-full uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Message {msg.suggested_action.doctor_name || "Doctor"}
                  </Link>
                </div>
              )}
            </div>

            {/* Feature G — Feedback Buttons */}
            {msg.role === "assistant" && msg.id !== "welcome" && (
              <div className="flex items-center gap-1 mt-1 px-1">
                <button
                  onClick={() => handleFeedback(msg.id, "up", msg)}
                  className={`p-1 rounded hover:bg-[var(--bg-muted)] transition-colors ${
                    msg.feedback === "up" ? "text-emerald-500 font-bold" : "text-[var(--fg-muted)] opacity-60 hover:opacity-100"
                  }`}
                  title="Helpful response"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(msg.id, "down", msg)}
                  className={`p-1 rounded hover:bg-[var(--bg-muted)] transition-colors ${
                    msg.feedback === "down" ? "text-red-500 font-bold" : "text-[var(--fg-muted)] opacity-60 hover:opacity-100"
                  }`}
                  title="Not helpful response"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--fg-muted)] p-4 rounded-2xl max-w-[60%] animate-pulse">
            <Sparkles className="w-4 h-4 text-[var(--accent)] animate-spin" />
            <span className="text-xs font-mono">Consulting medical reference...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggested Chips (Only if 1 message exists) */}
      {messages.length === 1 && (
        <div className="px-4 sm:px-6 pb-3 flex flex-wrap gap-2 flex-shrink-0">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleDirectSend(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--fg)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] transition-colors text-left text-[var(--fg-muted)] hover:text-[var(--fg)] shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="border-t border-[var(--border)] px-4 sm:px-6 py-3.5 flex items-center gap-3 bg-[var(--bg-elevated)]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your medications, timing, or food safety..."
          className="flex-1 bg-transparent text-sm sm:text-base py-2 px-2 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-xs font-mono">Loading Copilot...</div>}>
      <CopilotContent />
    </Suspense>
  );
}
