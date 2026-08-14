"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, Sparkles, Check } from "lucide-react";

type PrescriptionSelect = {
  id: string;
  title: string;
  doctor: string;
  date: string;
  conditionTag: string;
  medicines: string[];
  selected: boolean;
};

const DEMO_PRESCRIPTIONS: PrescriptionSelect[] = [];

export default function CreateFolderPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionSelect[]>(DEMO_PRESCRIPTIONS);
  const [autoSuggested, setAutoSuggested] = useState(false);

  function toggleSelect(id: string) {
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }

  function handleAutoSuggestAccept() {
    setName("Diabetes Management Collection");
    setDescription("Consolidated prescriptions tagged DIABETES from Dr. Patel and Dr. Rai.");
    setPrescriptions((prev) =>
      prev.map((p) => ({ ...p, selected: p.conditionTag === "DIABETES" }))
    );
    setAutoSuggested(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    // Route back to folder detail
    router.push("/vault/folders/f-1");
  }

  const selectedCount = prescriptions.filter((p) => p.selected).length;

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vault" aria-label="Back to Vault" className="hover:opacity-75">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
              03 // Collection Assembly
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FolderPlus className="w-6 h-6 text-[var(--fg)]" />
              Create Prescription Folder
            </h1>
          </div>
        </div>
      </div>

      {/* Auto-suggest Banner (PV-5) */}
      {autoSuggested && (
        <div className="border border-[var(--fg)] bg-[var(--bg-muted)] p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[var(--fg)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase font-mono font-bold text-[var(--fg)] mb-0.5">
                System Auto-Suggestion
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                We detected 2 prescriptions tagged <strong className="text-[var(--fg)]">DIABETES</strong> across Dr. Patel and Dr. Rai. Auto-group them into a folder?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoSuggestAccept}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[var(--fg)] text-[var(--bg)] px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Check className="w-4 h-4" /> Accept Suggestion
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
              Folder Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diabetes Management, Post-Surgery Recovery Q3"
              required
              className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)] rounded-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
              Description (Optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes on the care plan, participating specialists, or timeframe..."
              rows={2}
              className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)] rounded-sm"
            />
          </label>
        </div>

        {/* Prescription Selection */}
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] font-semibold">
              Select Prescriptions to Include ({selectedCount} Selected)
            </h2>
          </div>

          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <label
                key={rx.id}
                onClick={() => toggleSelect(rx.id)}
                className={`border p-4 flex items-center justify-between cursor-pointer transition-colors rounded-sm ${
                  rx.selected
                    ? "border-[var(--fg)] bg-[var(--bg-muted)]"
                    : "border-[var(--border)] hover:border-[var(--fg)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rx.selected}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[var(--fg)]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm sm:text-base">{rx.title}</p>
                      <span className="text-[10px] font-mono border border-[var(--border)] px-2 py-0.5 text-[var(--fg-muted)]">
                        {rx.conditionTag}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                      {rx.doctor} · {rx.date}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex gap-2">
                  {rx.medicines.map((m) => (
                    <span key={m} className="text-xs border border-[var(--border)] px-2 py-0.5 text-[var(--fg-muted)]">
                      {m}
                    </span>
                  ))}
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || selectedCount === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] py-4 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Create Folder ({selectedCount} Items) →
        </button>
      </form>
    </div>
  );
}
