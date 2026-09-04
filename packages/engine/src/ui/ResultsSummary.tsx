import { formatDuration } from "../hooks/useCountdownTimer";
import type { AttemptResult } from "../types/results";
import { DomainBreakdown, type SuitLookup } from "./DomainBreakdown";

export interface ResultsSummaryProps {
  result: AttemptResult;
  suitFor: (domainId: string) => SuitLookup;
}

export function ResultsSummary({ result, suitFor }: ResultsSummaryProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className={`text-4xl font-extrabold ${result.passed ? "text-correct" : "text-incorrect"}`}>
          {Math.round(result.score * 100)}%
        </span>
        <span className="font-mono text-sm text-ink-muted">
          {result.correctCount}/{result.totalCount} correct · {result.passed ? "Passed" : "Not passed"} (threshold{" "}
          {Math.round(result.passThreshold * 100)}%)
        </span>
        <span className="font-mono text-xs text-ink-muted">Time: {formatDuration(result.timeTakenSeconds)}</span>
      </div>

      {result.weakestDomain && (
        <div className="rounded-lg border border-gilt bg-gilt/10 px-4 py-3 text-sm">
          <span className="font-semibold">Next study focus: </span>
          {result.weakestDomain.domainName} ({Math.round(result.weakestDomain.percentage * 100)}%)
        </div>
      )}

      <div>
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">By domain</h3>
        <DomainBreakdown results={result.domainResults} suitFor={suitFor} />
      </div>
    </div>
  );
}
