const LABELS: Record<number, string> = { 1: "Routine", 2: "Urgent", 3: "Critical" };
const COLORS: Record<number, string> = { 1: "var(--fg-muted)", 2: "#B8862B", 3: "var(--warn)" };

export function SeverityBadge({ level }: { level: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wide border"
      style={{ color: COLORS[level], borderColor: COLORS[level] }}
    >
      ● {LABELS[level]}
    </span>
  );
}
