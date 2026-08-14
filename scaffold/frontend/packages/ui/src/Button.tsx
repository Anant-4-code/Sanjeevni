import { ReactNode } from "react";

export function PrimaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--fg)] px-6 py-3 text-sm font-medium hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
    >
      {children}
    </button>
  );
}
