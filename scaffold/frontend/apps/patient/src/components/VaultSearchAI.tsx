"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X, ShieldCheck, AlertTriangle, FileText, ArrowRight, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

type SearchResult = {
  id: string;
  title: string;
  category: string;
  doctor_name: string;
  date: string;
  summary: string;
  status: "verified" | "unverified";
  source: "clinic_verified" | "patient_uploaded" | "external_import";
  relevance_score: number;
  match_snippet: string;
  medicines_count?: number;
};

export default function VaultSearchAI({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_BASE}/patient/${patientId || "demo-patient"}/vault/search-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "Show prescriptions for diabetes and Metformin",
    "When was my last spine MRI or X-ray?",
    "Recent blood tests with cholesterol results",
    "Hospital discharge summaries and antibiotics",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-[var(--fg)]">
                Smart Vault AI Search (VA-7)
              </h2>
              <p className="text-xs text-[var(--fg-muted)]">
                Scoped exclusively to your verified health archive.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your vault records (e.g. 'prescriptions for nerve pain')..."
              className="w-full bg-[var(--bg-muted)] border border-[var(--border)] pl-11 pr-24 py-3.5 text-sm font-medium focus:outline-none focus:border-[var(--fg)] transition-all rounded-2xl"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[var(--fg)] text-[var(--bg)] text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
          </div>

          {/* Sample Query Chips */}
          {!hasSearched && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] font-bold">
                Suggested Queries:
              </p>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      // Trigger search immediately
                      setTimeout(() => {
                        setLoading(true);
                        setHasSearched(true);
                        fetch(`${API_BASE}/patient/${patientId || "demo-patient"}/vault/search-ai`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ query: q }),
                        })
                          .then((r) => r.json())
                          .then((d) => setResults(Array.isArray(d?.results) ? d.results : []))
                          .finally(() => setLoading(false));
                      }, 50);
                    }}
                    className="text-xs border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--fg)] px-3 py-1.5 rounded-full text-left transition-colors"
                  >
                    ✨ {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Results List */}
        {hasSearched && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pt-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--fg-muted)]">
              <span>{results.length} Vault Results for &ldquo;{query}&rdquo;</span>
            </div>

            {results.map((doc) => (
              <div
                key={doc.id}
                className="glass-card p-4 sm:p-5 rounded-2xl border border-[var(--border)] hover:border-[var(--fg)] transition-all space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/vault/prescription/${doc.id}`}
                      onClick={onClose}
                      className="font-bold text-sm sm:text-base hover:underline text-[var(--fg)]"
                    >
                      {doc.title}
                    </Link>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-muted)] border border-[var(--border)]">
                      {doc.category}
                    </span>
                  </div>

                  {/* Verification Source Badge */}
                  {doc.source === "patient_uploaded" ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> PATIENT UPLOADED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> CLINICALLY VERIFIED
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--fg-muted)] font-medium">
                  Doctor / Source: <strong className="text-[var(--fg)]">{doc.doctor_name}</strong> · Date: {doc.date}
                </p>

                <p className="text-xs text-[var(--fg)] bg-[var(--bg-muted)]/60 rounded-xl p-2.5 leading-relaxed font-mono">
                  🔎 {doc.match_snippet}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    Relevance: {doc.relevance_score}% Match
                  </span>
                  <Link
                    href={`/vault/prescription/${doc.id}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--fg)] hover:underline"
                  >
                    <span>Open Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {results.length === 0 && !loading && (
              <div className="glass-card p-8 text-center rounded-2xl">
                <FileText className="w-8 h-8 text-[var(--fg-muted)] mx-auto mb-2" />
                <p className="text-sm font-bold">No Matching Records in Vault</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  Try searching by doctor name, medication, condition, or scan type.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
