"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Patient App Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-muted)]">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-[var(--fg)]">Something went wrong</h2>
        <p className="text-xs text-[var(--fg-muted)]">
          {error?.message || "An unexpected application error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] font-bold text-xs rounded-full uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
