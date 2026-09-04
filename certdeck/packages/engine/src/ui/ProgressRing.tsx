export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  /** Diameter in px. */
  size?: number;
  thickness?: number;
  /** Any CSS colour; defaults to the app accent. */
  color?: string;
  /** Rendered in the middle of the ring. */
  children?: React.ReactNode;
  label?: string;
  className?: string;
}

/**
 * A dial for one proportion — a domain's accuracy, a deck's coverage.
 *
 * The ring animates its own fill on mount and whenever the value changes,
 * using the deck's flip easing so progress feels part of the same object,
 * and `--cd-flip-duration` so the reduced-motion override in tokens.css
 * shortens it along with everything else.
 */
export function ProgressRing({
  value,
  size = 72,
  thickness = 7,
  color = "var(--cd-accent)",
  children,
  label,
  className = "",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={`relative inline-grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped * 100)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cd-edge)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{
            transition: "stroke-dashoffset var(--cd-flip-duration) var(--cd-flip-easing)",
          }}
        />
      </svg>
      {children && <div className="absolute grid place-items-center text-center leading-none">{children}</div>}
    </div>
  );
}
