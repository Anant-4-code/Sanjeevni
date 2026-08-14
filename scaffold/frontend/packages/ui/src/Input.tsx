import { InputHTMLAttributes } from "react";

export function FormField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.15em] text-[var(--fg-muted)]">{label}</span>
      <input
        {...props}
        className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--fg)]"
      />
    </label>
  );
}
