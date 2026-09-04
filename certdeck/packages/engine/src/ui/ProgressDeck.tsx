export interface ProgressDeckProps {
  current: number;
  total: number;
  className?: string;
}

/** "Cards remaining" — the progress indicator reads as a deck, not a percentage bar. */
export function ProgressDeck({ current, total, className = "" }: ProgressDeckProps) {
  return (
    <span className={`font-mono text-xs text-ink-muted ${className}`}>
      Card {current} of {total}
    </span>
  );
}
