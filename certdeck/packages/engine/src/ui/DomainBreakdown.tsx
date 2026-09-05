import type { DomainResult } from "../types/results";
import { SuitIcon } from "./SuitIcon";

export interface SuitLookup {
  name: string;
  hue: string;
  /** Optional suit art; falls back to the engine's glyph when absent. */
  src?: string;
}

export interface DomainBreakdownProps {
  results: DomainResult[];
  suitFor: (domainId: string) => SuitLookup;
}

export function DomainBreakdown({ results, suitFor }: DomainBreakdownProps) {
  return (
    <div className="flex flex-col gap-3">
      {results.map((r) => {
        const suit = suitFor(r.domainId);
        return (
          <div key={r.domainId} className="flex items-center gap-3">
            <SuitIcon name={suit.name} src={suit.src} className="h-6 w-6 flex-shrink-0" style={{ color: suit.hue }} />
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{r.domainName}</span>
                <span className="font-mono text-ink-muted">
                  {r.correct}/{r.total} · {Math.round(r.percentage * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.percentage * 100}%`, backgroundColor: suit.hue }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
