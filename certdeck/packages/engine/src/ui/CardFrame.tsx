import type { ReactNode } from "react";
import type { Difficulty } from "../types/question";
import { SuitIcon } from "./SuitIcon";

export interface CardFrameProps {
  suitName: string;
  suitHue: string;
  /** Optional suit art; the engine falls back to its glyph without it. */
  suitSrc?: string;
  domainLabel: string;
  metaLeft: string;
  difficulty?: Difficulty;
  flagged?: boolean;
  onToggleFlag?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const RANK_LABEL: Record<Difficulty, string> = { easy: "E", medium: "M", hard: "H" };

/**
 * The physical card chrome: suit tab, rank corner, gilt hairlines,
 * scrollable body, optional footer. Used as the content of both faces
 * inside CardFlip — it is purely presentational, it never knows about
 * flip state.
 */
export function CardFrame({
  suitName,
  suitHue,
  suitSrc,
  domainLabel,
  metaLeft,
  difficulty,
  flagged,
  onToggleFlag,
  children,
  footer,
}: CardFrameProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-card border border-edge bg-card text-ink shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between px-4 pt-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ color: suitHue, backgroundColor: `color-mix(in srgb, ${suitHue} 16%, transparent)` }}
        >
          <SuitIcon name={suitName} src={suitSrc} className="h-5 w-5" />
          {domainLabel}
        </span>
        {difficulty && (
          <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border border-gilt font-mono text-[11px] font-semibold text-gilt">
            {RANK_LABEL[difficulty]}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pt-1.5">
        <span className="font-mono text-[11px] text-ink-muted">{metaLeft}</span>
        {onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            aria-pressed={flagged}
            aria-label={flagged ? "Remove flag" : "Flag for review"}
            className={`rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              flagged ? "text-gilt" : "text-ink-muted hover:text-gilt"
            }`}
          >
            <FlagIcon className="h-4 w-4" filled={!!flagged} />
          </button>
        )}
      </div>

      <div className="mt-2 border-t border-edge" />

      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

      {footer && (
        <>
          <div className="border-t border-edge" />
          <div className="flex items-center justify-between px-4 py-3">{footer}</div>
        </>
      )}
    </div>
  );
}

function FlagIcon({ className, filled }: { className?: string; filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path d="M5 3v18" strokeLinecap="round" />
      <path d="M5 4h11l-2.5 3.5L16 11H5V4z" strokeLinejoin="round" />
    </svg>
  );
}
