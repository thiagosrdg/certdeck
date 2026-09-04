export interface LevelBarProps {
  level: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP the current level spans. */
  xpForNextLevel: number;
  totalXp: number;
  className?: string;
}

/**
 * Level and progress toward the next one.
 *
 * The bar is gilt because levelling is the deck's own "foil" achievement,
 * the same detail the card corners and dividers use — the accent stays
 * reserved for things the user can act on.
 */
export function LevelBar({ level, xpIntoLevel, xpForNextLevel, totalXp, className = "" }: LevelBarProps) {
  const fraction = xpForNextLevel > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpForNextLevel)) : 0;
  const remaining = Math.max(0, xpForNextLevel - xpIntoLevel);

  return (
    <div className={`rounded-card border border-edge bg-card p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Level</span>
          <span className="text-2xl font-extrabold leading-none text-gilt">{level}</span>
        </div>
        <span className="font-mono text-xs text-ink-muted">{totalXp.toLocaleString()} XP</span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-edge"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpForNextLevel}
        aria-valuenow={xpIntoLevel}
        aria-label={`Progress to level ${level + 1}`}
      >
        <div
          className="h-full rounded-full bg-gilt"
          style={{
            width: `${fraction * 100}%`,
            transition: "width var(--cd-flip-duration) var(--cd-flip-easing)",
          }}
        />
      </div>

      <p className="mt-2 font-mono text-[11px] text-ink-muted">
        {remaining.toLocaleString()} XP to level {level + 1}
      </p>
    </div>
  );
}
