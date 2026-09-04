import { useEffect, useRef } from "react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Optional supporting copy — the stakes of confirming. */
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive/irreversible action. */
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * An in-app replacement for `window.confirm`.
 *
 * Native dialogs are not merely off-key here: a browser that has suppressed
 * them (Chrome's "prevent this page from creating additional dialogs", some
 * embedded webviews) makes `confirm()` return false with no signal, so a
 * button guarded by `confirm() && act()` silently does nothing. Anything the
 * user must be able to complete — submitting a finished exam above all —
 * cannot depend on that.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on open, and hand it back to whatever opened
  // it on close, so keyboard users are never stranded behind the overlay.
  useEffect(() => {
    if (!open) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => restoreTo?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      // Two focusable controls, so the trap is just a wrap between them.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-table/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-card border border-edge bg-card p-5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink">
          {title}
        </h2>
        {body && <div className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            className={`flex-1 ${tone === "danger" ? "bg-incorrect" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
