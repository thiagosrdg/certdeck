import { formatDuration } from "../hooks/useCountdownTimer";

export interface TimerDisplayProps {
  secondsLeft: number;
  warnAtSeconds?: number;
  className?: string;
}

export function TimerDisplay({ secondsLeft, warnAtSeconds = 300, className = "" }: TimerDisplayProps) {
  const warning = secondsLeft <= warnAtSeconds;
  return (
    <span
      role="timer"
      aria-live={warning ? "assertive" : "off"}
      className={`font-mono text-sm font-semibold ${warning ? "text-incorrect" : "text-ink"} ${className}`}
    >
      {formatDuration(secondsLeft)}
    </span>
  );
}
