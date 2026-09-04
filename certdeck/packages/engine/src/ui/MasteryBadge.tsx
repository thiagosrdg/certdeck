import type { MasteryTier } from "../engine/statistics";

const TIER_META: Record<MasteryTier, { label: string; color: string; pips: number }> = {
  unranked: { label: "Unranked", color: "var(--cd-ink-muted)", pips: 0 },
  bronze: { label: "Bronze", color: "var(--cd-tier-bronze)", pips: 1 },
  silver: { label: "Silver", color: "var(--cd-tier-silver)", pips: 2 },
  gold: { label: "Gold", color: "var(--cd-tier-gold)", pips: 3 },
};

export interface MasteryBadgeProps {
  tier: MasteryTier;
  /** Hides the word, keeping the pips — for tight rows. */
  compact?: boolean;
  className?: string;
}

/**
 * A domain's mastery tier.
 *
 * The pip count carries the same information as the colour, so the tier is
 * still readable without colour vision — the quality floor's "never colour
 * alone" rule.
 */
export function MasteryBadge({ tier, compact = false, className = "" }: MasteryBadgeProps) {
  const meta = TIER_META[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${className}`}
      style={{ borderColor: meta.color, color: meta.color }}
      title={meta.label}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full border"
            style={{
              borderColor: meta.color,
              backgroundColor: i < meta.pips ? meta.color : "transparent",
            }}
          />
        ))}
      </span>
      {!compact && meta.label}
      <span className="sr-only">{compact ? meta.label : ""}</span>
    </span>
  );
}

export { TIER_META };
