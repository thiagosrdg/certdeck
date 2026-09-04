export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Smaller line under the value — a unit, a comparison, a qualifier. */
  hint?: React.ReactNode;
  /** Any CSS colour for the value; defaults to ink. */
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * One number with its name. The label is monospace and small, matching the
 * card's metadata row, so a grid of tiles reads as the same print run as
 * the deck rather than as a dashboard bolted on.
 */
export function StatTile({ label, value, hint, color, icon, className = "" }: StatTileProps) {
  return (
    <div className={`rounded-card border border-edge bg-card p-3 ${className}`}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold leading-none" style={color ? { color } : undefined}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}
