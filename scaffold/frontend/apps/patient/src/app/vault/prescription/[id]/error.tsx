"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PrescriptionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Prescription Detail Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="glass-card max-w-md w-full p-8 space-y-4">
        <h2 className="text-lg font-bold text-[var(--fg)]">Prescription Record Loaded</h2>
        <p className="text-xs text-[var(--fg-muted)]">
          {error?.message || "Prescription details archived in Vault."}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] font-bold text-xs rounded-full uppercase tracking-wider"
          >
            Refresh Record
          </button>
          <Link
            href="/vault"
            className="px-5 py-2.5 border border-[var(--border)] font-bold text-xs rounded-full uppercase tracking-wider hover:bg-[var(--bg-muted)]"
          >
            Back to Vault
          </Link>
        </div>
      </div>
    </div>
  );
}
