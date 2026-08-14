"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Sparkles, MessageCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export default function CopilotPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  // Load persistent chat history from localStorage on mount
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

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("sanjeevani_copilot_chat", JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQuery && !initialSent.current) {
      initialSent.current = true;
      handleSend(undefined, initialQuery);
    }
  }, [initialQuery]);

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    try {
      localStorage.removeItem("sanjeevani_copilot_chat");
    } catch {}
  };

  async function handleSend(e?: React.FormEvent, customPrompt?: string) {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: promptToSend,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/patient/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: user?.id || "",
          question: userMsg.content,
          history: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: data.answer || data.message || "I couldn't process that. Please try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Always follow your doctor's exact dosage instructions and schedule. If you feel unusual symptoms or side effects, consult your attending physician immediately.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-7.5rem)] glass-card overflow-hidden">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" aria-label="Back to dashboard" className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[var(--fg)]" />
              <h1 className="font-display text-lg font-bold">Sanjivini AI Copilot</h1>
            </div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-mono text-[var(--fg-muted)]">
              Prescription & Pharmacological Guardrail Assistance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs font-mono border border-[var(--border)] px-3 py-1.5 rounded-full hover:border-[var(--fg)] hover:bg-[var(--bg-muted)] transition-all text-[var(--fg)] shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--fg-muted)] font-mono border border-[var(--border)] px-3 py-1.5 rounded-full bg-[var(--bg-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--fg)]" />
            <span>Active Patient Context Verified</span>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
          >
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--fg-muted)] mb-1 font-mono">
              {msg.role === "user" ? "You" : "Sanjivini Copilot"}
            </p>
            <div
              className={`text-sm sm:text-base leading-relaxed p-4 rounded-2xl shadow-sm ${
                msg.role === "user"
                  ? "bg-[var(--fg)] text-[var(--bg)] rounded-tr-xs"
                  : "glass-panel text-[var(--fg)] rounded-tl-xs border border-[var(--border)]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="max-w-[75%] mr-auto">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--fg-muted)] mb-1 font-mono">
              Sanjivini Copilot
            </p>
            <div className="glass-panel p-4 rounded-2xl rounded-tl-xs border border-[var(--border)]">
              <span className="text-sm text-[var(--fg-muted)] animate-pulse">Analyzing verified clinical context…</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-6 py-2.5 border-t border-[var(--border)] bg-[var(--bg-muted)] overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(undefined, prompt)}
            disabled={loading}
            className="text-xs border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-1.5 rounded-full hover:border-[var(--fg)] transition-all flex-shrink-0 text-[var(--fg-muted)] hover:text-[var(--fg)] shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

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
