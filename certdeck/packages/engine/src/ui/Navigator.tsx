import { SuitIcon } from "./SuitIcon";

export type NavigatorState = "current" | "answered" | "flagged" | "unanswered";

export interface NavigatorItem {
  questionId: string;
  suitName: string;
  suitHue: string;
  suitSrc?: string;
  state: NavigatorState;
}

export interface NavigatorProps {
  items: NavigatorItem[];
  onSelect: (index: number) => void;
  className?: string;
}

/**
 * The "spread" — a fanned grid of face-down mini cards. Each shows its
 * domain's suit, whether it's answered, flagged, or the current card.
 */
export function Navigator({ items, onSelect, className = "" }: NavigatorProps) {
  return (
    <div role="list" aria-label="Question navigator" className={`grid grid-cols-6 gap-1.5 sm:grid-cols-8 ${className}`}>
      {items.map((item, index) => (
        <button
          key={item.questionId}
          role="listitem"
          type="button"
          onClick={() => onSelect(index)}
          aria-current={item.state === "current" ? "true" : undefined}
          aria-label={`Question ${index + 1}, ${item.state}`}
          className={[
            "relative aspect-card rounded-[4px] border text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            item.state === "current" ? "border-accent ring-2 ring-accent" : "border-edge",
            item.state === "answered" || item.state === "flagged" ? "bg-card" : "bg-table",
          ].join(" ")}
        >
          <span className="absolute inset-0 grid place-items-center">
            <SuitIcon name={item.suitName} src={item.suitSrc} className="h-4 w-4 opacity-80" style={{ color: item.suitHue }} />
          </span>
          {item.state === "flagged" && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gilt" aria-hidden="true" />
          )}
          {item.state === "unanswered" && (
            <span className="absolute inset-0 rounded-[4px] border border-dashed border-ink-muted/40" aria-hidden="true" />
          )}
          <span className="absolute bottom-0 left-0 right-0 pb-0.5 text-center font-mono leading-none text-ink-muted">
            {index + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
