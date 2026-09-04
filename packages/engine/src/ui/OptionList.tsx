import type { Option, QuestionType } from "../types/question";

export interface OptionListReveal {
  correctIds: string[];
}

export interface OptionListProps {
  options: Option[];
  type: QuestionType;
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  /** shown after submission in practice/random modes */
  reveal?: OptionListReveal;
}

/**
 * Radio (single) or checkbox (multiple) option list. Number-key selection
 * (1-9) is wired via useKeyboardNav at the page level using the same
 * option order shown here.
 */
export function OptionList({ options, type, selected, onChange, disabled, reveal }: OptionListProps) {
  function toggle(id: string) {
    if (disabled) return;
    if (type === "single") {
      onChange([id]);
    } else {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    }
  }

  return (
    <div role={type === "single" ? "radiogroup" : "group"} className="flex flex-col gap-2">
      {options.map((option, index) => {
        const isSelected = selected.includes(option.id);
        const isCorrect = reveal?.correctIds.includes(option.id) ?? false;
        const showIncorrect = !!reveal && isSelected && !isCorrect;
        const showCorrect = !!reveal && isCorrect;

        return (
          <button
            key={option.id}
            type="button"
            role={type === "single" ? "radio" : "checkbox"}
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => toggle(option.id)}
            className={[
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default",
              showCorrect
                ? "border-correct bg-correct/10"
                : showIncorrect
                  ? "border-incorrect bg-incorrect/10"
                  : isSelected
                    ? "border-accent bg-accent/10"
                    : "border-edge enabled:hover:border-accent/60",
            ].join(" ")}
          >
            <span className="mt-0.5 font-mono text-xs text-ink-muted">{index + 1}</span>
            <span
              aria-hidden="true"
              className={[
                "mt-0.5 h-4 w-4 flex-shrink-0 border",
                type === "single" ? "rounded-full" : "rounded-[3px]",
                isSelected ? "border-accent bg-accent" : "border-ink-muted",
              ].join(" ")}
            />
            <span className="flex-1">{option.text}</span>
            {showCorrect && <span className="flex-shrink-0 text-xs font-semibold text-correct">Correct</span>}
            {showIncorrect && <span className="flex-shrink-0 text-xs font-semibold text-incorrect">Your answer</span>}
          </button>
        );
      })}
    </div>
  );
}
