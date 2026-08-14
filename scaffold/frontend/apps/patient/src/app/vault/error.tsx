"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function VaultError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Vault Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="glass-card max-w-md w-full p-8 space-y-4">
        <h2 className="text-lg font-bold text-[var(--fg)]">Vault Record Error</h2>
        <p className="text-xs text-[var(--fg-muted)]">
          {error?.message || "Could not load vault records."}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] font-bold text-xs rounded-full uppercase tracking-wider"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-[var(--border)] font-bold text-xs rounded-full uppercase tracking-wider hover:bg-[var(--bg-muted)]"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
