import { Button } from "./Button";

export interface UpdateBannerProps {
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  /** Warns that reloading now interrupts something in progress. */
  busy?: boolean;
  className?: string;
}

/**
 * "A new deck has been printed" — a new build is cached and waiting.
 *
 * Deliberately non-blocking: it sits at the foot of the screen and never
 * takes focus or covers the card, because it can appear in the middle of a
 * 90-question exam and an update is never more urgent than the question the
 * user is on. Dismissing it is a real choice, not a delay — the new version
 * still arrives on a later launch.
 *
 * Gilt rather than accent: this is the app telling you something, not
 * something you came here to do.
 */
export function UpdateBanner({ open, onUpdate, onDismiss, busy = false, className = "" }: UpdateBannerProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 ${className}`}
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-card border border-gilt bg-card p-3 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">New version available</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {busy ? "Updating reloads — your attempt is saved and resumes" : "Includes any newly added cards"}
          </p>
        </div>
        <Button className="flex-shrink-0 px-3 py-2" onClick={onUpdate}>
          Update
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss update notice"
          className="flex-shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ×
        </button>
      </div>
    </div>
  );
}
