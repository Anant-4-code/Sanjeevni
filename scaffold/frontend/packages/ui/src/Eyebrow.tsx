export function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)] flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full" />
      {index} // {label}
    </p>
  );
}
