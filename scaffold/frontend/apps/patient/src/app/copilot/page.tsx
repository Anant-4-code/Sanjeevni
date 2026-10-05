"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Star,
  Plus,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Send,
  Bot,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  FileText,
  Pill,
  Activity,
  Calendar,
  Stethoscope,
  ChevronRight,
  Search,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
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
  response_type?: string;
  suggested_action?: SuggestedAction;
  llm_tier?: string;
  feedback?: "up" | "down" | null;
  timestamp?: string;
};

type ConversationMeta = {
  id: string;
  title: string;
  time: string;
  group: "TODAY" | "YESTERDAY" | "SAVED";
  isSaved?: boolean;
};

const DEFAULT_CONVERSATIONS: ConversationMeta[] = [
  { id: "c-1", title: "Latest Lab Reports & Potassium", time: "14:32", group: "TODAY" },
  { id: "c-2", title: "Medication Review & Dosage", time: "11:08", group: "TODAY" },
  { id: "c-3", title: "Doctor Appointment Prep", time: "09:24", group: "TODAY" },
  { id: "c-4", title: "Blood Test Glycemic Trajectory", time: "18:42", group: "YESTERDAY" },
  { id: "c-5", title: "Prescription Refill Inquiries", time: "15:10", group: "YESTERDAY" },
  { id: "c-6", title: "Important Lab Results (Potassium Alert)", time: "Aug 16", group: "SAVED", isSaved: true },
  { id: "c-7", title: "Questions for Dr. Nitin Sharma", time: "Aug 12", group: "SAVED", isSaved: true },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello Ramesh! I am your Sanjeevani AI Clinical Copilot.\n\nI have complete access to your verified medical records, active prescription regimens, diagnostic laboratory panels, and physician instructions.\n\nHow can I help you today? You can ask me to review your recent blood test results, explain your medication timings, or prepare questions for your next clinic visit.",
  timestamp: "14:30",
};

const TRY_ASKING_PROMPTS = [
  { label: "Understand my latest labs", query: "What are my latest lab reports and are any values abnormal or critical?" },
  { label: "Explain my medications", query: "What medicines am I taking right now, and what are their specific directions?" },
  { label: "Missed dose rules", query: "What should I do if I miss a scheduled dose of my medication?" },
  { label: "Prepare for doctor visit", query: "Summarize my active health records and key questions to discuss with my doctor." },
];

/**
 * Helper to parse inline markdown: **bold**, *italic*, and `code`
 */
function formatInlineText(text: string): React.ReactNode[] {
  if (!text) return [];
  const sanitized = text.replace(/<br\s*\/?>/gi, " ");
  const tokens = sanitized.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g);

  return tokens.map((tok, idx) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--fg)]">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length >= 2) {
      return (
        <em key={idx} className="italic text-[var(--fg-muted)]">
          {tok.slice(1, -1)}
        </em>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[11px] font-mono text-emerald-600 dark:text-emerald-400"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return tok;
  });
}

/**
 * Helper to render value badges (normal, elevated, critical, attention)
 */
function renderCellWithBadges(cellText: string): React.ReactNode {
  const lower = cellText.toLowerCase();
  
  if (lower.includes("6.2") || lower.includes("critical") || lower.includes("attention required") || lower.includes("alert")) {
    return (
      <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        <span>{formatInlineText(cellText)}</span>
      </div>
    );
  }

  if (lower.includes("elevated") || lower.includes("6.9%") || lower.includes("above target")) {
    return (
      <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span>{formatInlineText(cellText)}</span>
      </div>
    );
  }

  if (lower.includes("normal") || lower.includes("within range") || lower.includes("stable") || lower.includes("within expected")) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>{formatInlineText(cellText)}</span>
      </div>
    );
  }

  return formatInlineText(cellText);
}

/**
 * Helper to normalize incoming clinical text:
 * Turns dense unstructured paragraphs into scannable Markdown sections,
 * splits semicolon-separated doctor questions into clean bullet lists,
 * and extracts critical findings.
 */
function normalizeClinicalContent(raw: string): string {
  if (!raw) return "";

  let text = raw.trim();

  // If text already has markdown headings and bullet points, preserve it
  const hasMarkdownHeadings = /^(#{1,4})\s+/m.test(text);
  const hasMarkdownBullets = /^(\*|\-|\d+\.)\s+/m.test(text);

  if (!hasMarkdownHeadings && !hasMarkdownBullets) {
    // 1. Separate transitions into distinct Markdown sections
    text = text
      .replace(
        /(Recent labs show|Recent laboratory tests show|Your recent labs include)/gi,
        "\n\n### Recent Laboratory & Biomarker Trends\n$1"
      )
      .replace(
        /(Imaging reveals|Your imaging reports show|Radiology findings indicate)/gi,
        "\n\n### Diagnostic Imaging & Radiology\n$1"
      )
      .replace(
        /(Key questions to bring to your next appointments are:|Key questions for your doctor:|Questions to discuss with your doctor:?)/gi,
        "\n\n### Questions for Your Attending Physician\n"
      )
      .replace(
        /(If you notice muscle weakness|Warning signs to watch for:|When to seek urgent care:?)/gi,
        "\n\n### Urgent Precautions & Warning Signs\n$1"
      );

    // 2. If questions were separated by semicolons, transform them into distinct bullet items
    if (text.includes("### Questions for Your Attending Physician")) {
      const parts = text.split("### Questions for Your Attending Physician");
      const before = parts[0];
      const after = parts[1];

      const nextSectionIdx = after.search(/\n\n### /);
      const questionsBlock = nextSectionIdx !== -1 ? after.slice(0, nextSectionIdx) : after;
      const rest = nextSectionIdx !== -1 ? after.slice(nextSectionIdx) : "";

      const questionItems = questionsBlock
        .split(/;\s*(?:and\s+)?/)
        .map((q) => q.trim().replace(/^and\s+/i, ""))
        .filter((q) => q.length > 5);

      if (questionItems.length > 1) {
        const bulletList = questionItems.map((q) => `- ${q}`).join("\n");
        text = `${before}### Questions for Your Attending Physician\n\n${bulletList}${rest}`;
      }
    }
  }

  return text;
}

/**
 * Clinical Markdown & Table Renderer
 * Formats LLM responses into elegant, medical-grade cards, tables, headings, and bullet points.
 */
function ClinicalMarkdownRenderer({ content }: { content: string }) {
  if (!content || !content.trim()) return null;

  const normalized = normalizeClinicalContent(content);
  const lines = normalized.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  // Check if critical potassium is present to show a compact priority header banner
  const hasCriticalPotassium =
    normalized.toLowerCase().includes("potassium") &&
    (normalized.includes("6.2") || normalized.toLowerCase().includes("critical"));

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Empty line
    if (!line) {
      i++;
      continue;
    }

    // 2. Horizontal divider
    if (line === "---" || line === "***" || line === "___" || /^[-=_]{3,}$/.test(line)) {
      elements.push(
        <div key={`hr-${i}`} className="my-4 border-t border-[var(--border)]" />
      );
      i++;
      continue;
    }

    // 3. Markdown Tables (lines starting and ending with | or containing multiple |)
    if (line.startsWith("|") && (line.endsWith("|") || line.includes("|"))) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        (lines[i].trim().endsWith("|") || lines[i].trim().includes("|"))
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // First line is header
        const rawHeader = tableLines[0].replace(/^\|/, "").replace(/\|$/, "");
        const headerCells = rawHeader.split("|").map((c) => c.trim()).filter(Boolean);

        // Skip separator line if present (e.g. |---|---|)
        let dataStartIndex = 1;
        if (
          tableLines.length > 1 &&
          tableLines[1].replace(/[\s\-|:]/g, "") === ""
        ) {
          dataStartIndex = 2;
        }

        const dataRows = tableLines.slice(dataStartIndex).map((row) => {
          const cleanRow = row.replace(/^\|/, "").replace(/\|$/, "");
          return cleanRow.split("|").map((c) => c.trim());
        });

        elements.push(
          <div
            key={`table-${i}`}
            className="my-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-muted)] border-b border-[var(--border)] text-[11px] font-bold text-[var(--fg)] uppercase tracking-wider">
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 font-mono font-bold">
                        {formatInlineText(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60">
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx % 2 === 0
                          ? "bg-transparent hover:bg-[var(--bg-muted)]/30 transition-colors"
                          : "bg-[var(--bg-muted)]/15 hover:bg-[var(--bg-muted)]/40 transition-colors"
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-4 py-3 text-[var(--fg)] leading-relaxed align-top"
                        >
                          {renderCellWithBadges(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }
    }

    // 4. Dedicated Critical Alert Callout (ONLY for short explicit alert lines, never for giant paragraphs!)
    const isExplicitAlert =
      (line.toLowerCase().startsWith("**critical") ||
        line.toLowerCase().startsWith("critical alert:") ||
        line.toLowerCase().startsWith("**alert:**") ||
        line.toLowerCase().startsWith("alert:")) &&
      line.length < 240;

    if (isExplicitAlert) {
      elements.push(
        <div
          key={`alert-${i}`}
          className="my-3 p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="text-xs font-semibold leading-relaxed">
              {formatInlineText(line)}
            </div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 5. Headings (#, ##, ###)
    if (line.startsWith("#")) {
      const match = line.match(/^(#{1,4})\s*(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];

        if (level <= 2) {
          elements.push(
            <div
              key={`h-${i}`}
              className="mt-6 mb-3 pt-3 border-t border-[var(--border)] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-display text-sm sm:text-base font-bold text-[var(--fg)] tracking-tight uppercase">
                {text}
              </h3>
            </div>
          );
        } else {
          elements.push(
            <h4
              key={`h-${i}`}
              className="font-display text-xs sm:text-sm font-bold text-[var(--fg)] mt-4 mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{formatInlineText(text)}</span>
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 6. Highlight / Key takeaway boxes
    if (
      line.toLowerCase().startsWith("**bottom line:**") ||
      line.toLowerCase().startsWith("**key recommendation:**") ||
      line.toLowerCase().startsWith("**important:") ||
      line.toLowerCase().startsWith("**action:")
    ) {
      elements.push(
        <div
          key={`takeaway-${i}`}
          className="my-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-950 dark:text-amber-200 leading-relaxed shadow-xs"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>{formatInlineText(line)}</div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 7. Bullet Lists (- or * or numbered 1. 2.)
    if (line.match(/^(\*|\-|\d+\.)\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^(\*|\-|\d+\.)\s+/)) {
        listItems.push(lines[i].trim().replace(/^(\*|\-|\d+\.)\s+/, ""));
        i++;
      }

      elements.push(
        <ul key={`ul-${i}`} className="my-2.5 space-y-2 pl-1">
          {listItems.map((item, itemIdx) => (
            <li
              key={itemIdx}
              className="flex items-start gap-2 text-xs sm:text-sm text-[var(--fg)] leading-relaxed"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
              <div className="flex-1">{formatInlineText(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Default Paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm text-[var(--fg)] leading-relaxed mb-2"
      >
        {formatInlineText(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2">{elements}</div>;
}

function CopilotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("query");
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [conversations, setConversations] = useState<ConversationMeta[]>(DEFAULT_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>("c-1");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const [searchHistory, setSearchHistory] = useState("");

  // Context live states
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pid = user?.role === "patient" && user?.id ? user.id : "patient-ramesh";

  // Category router map for verified sources
  const categoryRouteMap: Record<string, string> = {
    prescriptions: "prescriptions",
    prescription: "prescriptions",
    "lab-reports": "lab-reports",
    "lab_reports": "lab-reports",
    "x-rays": "imaging",
    imaging: "imaging",
    other: "records",
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat history & clinical context
  useEffect(() => {
    // 1. Fetch persisted chat history
    fetch(`${API_BASE}/patient/${pid}/copilot-history`)
      .then((res) => res.json())
      .then((data) => {
        const msgs = data?.messages || data?.history;
        if (msgs && Array.isArray(msgs) && msgs.length > 0) {
          const loaded: Message[] = msgs.map((m: any, idx: number) => ({
            id: m.id || `persisted-${idx}`,
            role: m.role === "user" ? "user" : "assistant",
            content: m.content || m.answer || "",
            timestamp: m.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sources: m.sources,
            llm_tier: m.llm_tier,
          }));
          setMessages([WELCOME_MESSAGE, ...loaded]);
        }
      })
      .catch(() => {});

    // 2. Fetch timeline & vault context
    fetch(`${API_BASE}/patient/${pid}/timeline`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.schedule) setScheduleData(d.schedule);
      })
      .catch(() => {});

    fetch(`${API_BASE}/patient/${pid}/vault`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.documents) {
          const docs = d.documents;
          setLabReports(docs.filter((item: any) => item.category === "lab-reports" || item.category === "lab_reports"));
          setPrescriptions(docs.filter((item: any) => item.category === "prescriptions" || item.category === "prescription"));
        }
      })
      .catch(() => {});
  }, [pid]);

  // Handle URL query parameter prefill
  useEffect(() => {
    if (queryParam && messages.length === 1) {
      sendMessage(queryParam);
    }
  }, [queryParam]);

  async function sendMessage(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/patient/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: pid,
          question: text.trim(),
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || data.response || "No response received from clinical model.",
        sources: data.sources || [],
        response_type: data.response_type,
        suggested_action: data.suggested_action,
        llm_tier: data.llm_tier || "GPT-OSS 120B Cloud",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "Unable to connect to Sanjeevani Clinical Intelligence service. Please verify your connection or try again in a moment.",
        timestamp: timeStr,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewConversation() {
    setMessages([WELCOME_MESSAGE]);
    setActiveConversationId(`c-${Date.now()}`);
  }

  function handleFeedback(id: string, rating: "up" | "down") {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === rating ? null : rating } : m))
    );
  }

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col font-sans transition-colors">
      {/* TOP HEADER — Aligned with Sanjeevani App Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-elevated)]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-muted)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-sm sm:text-base font-extrabold tracking-tight">
                  Sanjeevani AI Copilot
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Context
                </span>
              </div>
              <p className="text-[11px] text-[var(--fg-muted)] hidden sm:block">
                Patient Health Intelligence · Linked to Vault Records & Prescriptions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle History */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-xl border border-[var(--border)] text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showHistory
                ? "bg-[var(--bg-muted)] text-[var(--fg)]"
                : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
            title="Toggle Conversations History"
          >
            {showHistory ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden md:inline text-[11px]">History</span>
          </button>

          {/* Toggle Context */}
          <button
            onClick={() => setShowContext(!showContext)}
            className={`p-2 rounded-xl border border-[var(--border)] text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showContext
                ? "bg-[var(--bg-muted)] text-[var(--fg)]"
                : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
            title="Toggle Health Context Pane"
          >
            {showContext ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden md:inline text-[11px]">Context</span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSTATION */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 max-w-7xl w-full mx-auto p-3 sm:p-4 gap-4">
        {/* LEFT COLUMN: CONVERSATION HISTORY */}
        {showHistory && (
          <aside className="hidden md:block md:col-span-3 space-y-4">
            <div className="glass-card p-4 rounded-2xl border border-[var(--border)] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  Conversations
                </span>
                <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                  {conversations.length} saved
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--fg-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Conversation items grouped */}
              <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {/* TODAY */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] mb-1.5 px-2">
                    Today
                  </div>
                  <div className="space-y-1">
                    {filteredConversations
                      .filter((c) => c.group === "TODAY")
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveConversationId(c.id)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${
                            activeConversationId === c.id
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20"
                              : "hover:bg-[var(--bg-muted)] text-[var(--fg)] border border-transparent"
                          }`}
                        >
                          <span className="truncate pr-2">{c.title}</span>
                          <span className="text-[10px] font-mono text-[var(--fg-muted)] shrink-0">
                            {c.time}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* YESTERDAY */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] mb-1.5 px-2">
                    Yesterday
                  </div>
                  <div className="space-y-1">
                    {filteredConversations
                      .filter((c) => c.group === "YESTERDAY")
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveConversationId(c.id)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${
                            activeConversationId === c.id
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20"
                              : "hover:bg-[var(--bg-muted)] text-[var(--fg)] border border-transparent"
                          }`}
                        >
                          <span className="truncate pr-2">{c.title}</span>
                          <span className="text-[10px] font-mono text-[var(--fg-muted)] shrink-0">
                            {c.time}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* SAVED */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] mb-1.5 px-2 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span>Saved Sessions</span>
                  </div>
                  <div className="space-y-1">
                    {filteredConversations
                      .filter((c) => c.group === "SAVED")
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveConversationId(c.id)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${
                            activeConversationId === c.id
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20"
                              : "hover:bg-[var(--bg-muted)] text-[var(--fg)] border border-transparent"
                          }`}
                        >
                          <span className="truncate pr-2">{c.title}</span>
                          <span className="text-[10px] font-mono text-[var(--fg-muted)] shrink-0">
                            {c.time}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* CENTER COLUMN: ACTIVE CHAT STREAM & INPUT */}
        <main
          className={`${
            showHistory && showContext
              ? "md:col-span-6"
              : showHistory || showContext
              ? "md:col-span-9"
              : "md:col-span-12"
          } flex flex-col h-[calc(100vh-100px)]`}
        >
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 sm:pr-2 pb-4">
            {messages.map((message) => {
              const isUser = message.role === "user";

              if (isUser) {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white px-5 py-3.5 shadow-sm space-y-1">
                      <div className="text-xs sm:text-sm leading-relaxed">{message.content}</div>
                      <div className="text-[10px] text-emerald-100 dark:text-emerald-200 text-right font-mono">
                        {message.timestamp}
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant Message Card
              return (
                <div
                  key={message.id}
                  className="glass-card rounded-2xl p-5 sm:p-6 border border-[var(--border)] space-y-4 shadow-sm"
                >
                  {/* Assistant Message Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-display text-xs font-bold tracking-tight">
                        Sanjeevani AI Copilot
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--fg-muted)]">
                        Clinical Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--fg-muted)]">
                      {message.llm_tier && (
                        <span className="hidden sm:inline">{message.llm_tier}</span>
                      )}
                      <span>{message.timestamp}</span>
                    </div>
                  </div>

                  {/* Assistant Body — Formatted by ClinicalMarkdownRenderer */}
                  <div className="py-1">
                    <ClinicalMarkdownRenderer content={message.content} />
                  </div>

                  {/* Sources / Evidence Trail if present */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="pt-3 border-t border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--fg-muted)] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Verified Evidence Sources ({message.sources.length})
                        </span>
                        <span>Click to view record</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {message.sources.map((src, idx) => {
                          const routeCategory = categoryRouteMap[src.category || ""] || "prescriptions";
                          return (
                            <Link
                              key={idx}
                              href={`/vault/${routeCategory}`}
                              className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-muted)] transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-[var(--fg-muted)] group-hover:text-emerald-600 shrink-0" />
                                <span className="text-xs truncate font-medium text-[var(--fg)] group-hover:text-emerald-600 transition-colors">
                                  {src.title}
                                </span>
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--fg-muted)] group-hover:text-emerald-600 shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested Clinical Action if present */}
                  {message.suggested_action && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-3">
                      <div className="text-xs text-[var(--fg)]">
                        <strong>Suggested Follow-up:</strong> Review electrolyte findings with Dr. Nitin Sharma
                      </div>
                      <Link
                        href="/vault"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shrink-0 transition-colors"
                      >
                        Open Vault
                      </Link>
                    </div>
                  )}

                  {/* Feedback Strip */}
                  <div className="flex items-center justify-between pt-2 text-xs text-[var(--fg-muted)] border-t border-[var(--border)]/60">
                    <span className="text-[11px] font-mono">Was this response clinically helpful?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleFeedback(message.id, "up")}
                        className={`p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors ${
                          message.feedback === "up" ? "text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : ""
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, "down")}
                        className={`p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors ${
                          message.feedback === "down" ? "text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/40" : ""
                        }`}
                        title="Unhelpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="glass-card rounded-2xl p-5 border border-[var(--border)] flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-xs font-mono text-[var(--fg-muted)]">
                  Consulting clinical records and generating evidence-backed response...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* BOTTOM CONTROLS & INPUT CONTAINER */}
          <div className="pt-2 space-y-2.5">
            {/* Quick Prompt Suggestions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Suggestions:
              </span>
              {TRY_ASKING_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt.query)}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-emerald-500 hover:text-emerald-600 text-[var(--fg)] px-3 py-1 text-xs shrink-0 transition-colors shadow-2xs font-medium"
                >
                  {prompt.label} →
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="glass-panel rounded-2xl border border-[var(--border)] p-2 shadow-sm flex items-center gap-2"
            >
              <button
                type="button"
                className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors"
                title="Attach medical document or lab report"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder="Ask about medications, lab results, doctor instructions..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none px-2"
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white p-2.5 transition-all shadow-sm flex items-center justify-center shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </main>

        {/* RIGHT COLUMN: CLINICAL HEALTH CONTEXT PANE */}
        {showContext && (
          <aside className="hidden md:block md:col-span-3 space-y-4 font-sans">
            <div className="glass-card p-4 rounded-2xl border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  Health Context
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Synced
                </span>
              </div>

              {/* Patient Demographics */}
              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-1">
                <div className="text-[10px] font-mono uppercase text-[var(--fg-muted)]">Patient Record</div>
                <div className="text-xs font-bold text-[var(--fg)] uppercase tracking-tight">
                  {user?.full_name || "Ramesh Kumar"}
                </div>
                <div className="text-[10px] font-mono text-[var(--fg-muted)]">
                  ID: {pid} · 54 YRS · MALE
                </div>
              </div>

              {/* Labs Widget */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--fg)]">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                    Recent Labs
                  </span>
                  <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                    {labReports.length || 4} Panels
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      Potassium
                    </span>
                    <span className="font-mono font-bold">6.2 mmol/L ↑</span>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    <span>HbA1c</span>
                    <span className="font-mono font-bold">6.9% ↑</span>
                  </div>

                  <div className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--fg-muted)] flex items-center justify-between">
                    <span>CBC Panel</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Normal</span>
                  </div>
                </div>
              </div>

              {/* Medications Widget */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--fg)]">
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    Active Medications
                  </span>
                  <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                    {scheduleData.length || 4} Active
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[var(--fg-muted)]">
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                    <span className="font-medium text-[var(--fg)]">Pan 40mg</span>
                    <span className="font-mono text-[11px]">08:00 AM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                    <span className="font-medium text-[var(--fg)]">Amoxicillin 500mg</span>
                    <span className="font-mono text-[11px]">01:00 PM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/40">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Clopidogrel 75mg</span>
                    <span className="font-mono text-[11px] text-rose-600">08:30 PM (Crit)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium text-[var(--fg)]">Multivitamin</span>
                    <span className="font-mono text-[11px]">10:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Care Team Widget */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--fg)]">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                    Care Team
                  </span>
                  <span className="text-[10px] font-mono text-[var(--fg-muted)]">2 Doctors</span>
                </div>

                <div className="space-y-1 text-xs text-[var(--fg-muted)]">
                  <div>
                    <span className="font-medium text-[var(--fg)]">Dr. Nitin Sharma</span> · Endocrinology
                  </div>
                  <div>
                    <span className="font-medium text-[var(--fg)]">Dr. V. K. Rai</span> · Cardiology
                  </div>
                </div>
              </div>

              {/* View Full Health Record */}
              <div className="pt-2 border-t border-[var(--border)]">
                <Link
                  href="/vault"
                  className="w-full py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-muted)] text-[var(--fg)] text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span>Open Patient Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-8 flex items-center justify-center font-mono text-xs uppercase tracking-widest">
          <Loader2 className="w-5 h-5 animate-spin mr-3 text-emerald-600" />
          Loading Sanjeevani AI Copilot...
        </div>
      }
    >
      <CopilotContent />
    </Suspense>
  );
}
