import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCountdownTimerOptions {
  /** starting value in seconds */
  initialSeconds: number;
  /** ticks while true; defaults to true */
  running?: boolean;
  onExpire?: () => void;
}

export interface CountdownTimer {
  secondsLeft: number;
  isExpired: boolean;
  /** replace the remaining time, e.g. when resuming a persisted attempt */
  setSecondsLeft: (seconds: number) => void;
}

/**
 * A plain 1Hz countdown, resumable by passing the remaining seconds back in
 * as `initialSeconds` after a reload — the exam store is the source of
 * truth for what "remaining" means, this hook just ticks it down and fires
 * `onExpire` once.
 */
export function useCountdownTimer({ initialSeconds, running = true, onExpire }: UseCountdownTimerOptions): CountdownTimer {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    expiredRef.current = initialSeconds <= 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeconds]);

  useEffect(() => {
    if (!running || expiredRef.current) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  const setSecondsLeftSafe = useCallback((seconds: number) => {
    expiredRef.current = seconds <= 0;
    setSecondsLeft(Math.max(0, seconds));
  }, []);

  return { secondsLeft, isExpired: secondsLeft <= 0, setSecondsLeft: setSecondsLeftSafe };
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
