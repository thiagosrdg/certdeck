import { useEffect } from "react";

export interface KeyboardNavHandlers {
  /** 1-9 keys, zero-based option index */
  onSelectOption?: (index: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSubmit?: () => void;
  onToggleFlag?: () => void;
  enabled?: boolean;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Global shortcuts for exam pages: number keys select an option, arrow
 * keys move between questions, Enter submits, F flags. Disabled while
 * focus is in a form control so it never fights normal typing.
 */
export function useKeyboardNav({ onSelectOption, onNext, onPrev, onSubmit, onToggleFlag, enabled = true }: KeyboardNavHandlers): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && EDITABLE_TAGS.has(target.tagName)) return;

      if (event.key >= "1" && event.key <= "9" && onSelectOption) {
        onSelectOption(Number(event.key) - 1);
        return;
      }

      switch (event.key) {
        case "ArrowRight":
          if (onNext) {
            event.preventDefault();
            onNext();
          }
          break;
        case "ArrowLeft":
          if (onPrev) {
            event.preventDefault();
            onPrev();
          }
          break;
        case "Enter":
          onSubmit?.();
          break;
        case "f":
        case "F":
          onToggleFlag?.();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onSelectOption, onNext, onPrev, onSubmit, onToggleFlag]);
}
