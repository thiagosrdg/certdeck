import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Button,
  MasteryBadge,
  ProgressRing,
  StatTile,
  SuitIcon,
  computeStudyStats,
  formatDuration,
  type DomainResult,
} from "@certdeck/engine";
import { PageShell } from "../components/PageShell";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { suitFor } from "../lib/suit";
import { useHistoryStore } from "../stores";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function DomainRow({ domain }: { domain: DomainResult }) {
  const suit = suitFor(domain.domainId);
  const weak = domain.percentage < 0.6;
  return (
    <li className="flex items-center gap-3 rounded-card border border-edge bg-card p-3">
      <ProgressRing
        value={domain.percentage}
        size={54}
        thickness={6}
        color={suit.hue}
        label={`${domain.domainName}: ${domain.correct} of ${domain.total}`}
      >
        <span className="font-mono text-xs font-bold">{pct(domain.percentage)}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <SuitIcon name={suit.name} src={suit.src} className="h-6 w-6 flex-shrink-0" />
          <span className="truncate text-sm font-semibold">{domain.domainName}</span>
        </div>
        <p className={`mt-0.5 font-mono text-[11px] ${weak ? "text-incorrect" : "text-ink-muted"}`}>
          {domain.correct}/{domain.total} correct
          {weak && " · needs work"}
        </p>
      </div>
    </li>
  );
}

export default function Results() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const entries = useHistoryStore((s) => s.entries);
  const entry = entries.find((e) => e.attempt.id === attemptId);

  // Stats for this attempt alone, and for everything up to and including it,
  // reusing the same engine rather than a parallel scoring path.
  const thisAttempt = useMemo(
    () => (entry ? computeStudyStats([entry], questions, certConfig) : null),
    [entry]
  );

  const previousSameMode = useMemo(() => {
    if (!entry) return null;
    const older = entries
      .filter((e) => e.attempt.mode === entry.attempt.mode && e.attempt.id !== entry.attempt.id)
      .filter((e) => (e.attempt.finishedAt ?? 0) < (entry.attempt.finishedAt ?? 0))
      .sort((a, b) => (b.attempt.finishedAt ?? 0) - (a.attempt.finishedAt ?? 0));
    return older[0] ?? null;
  }, [entries, entry]);

  if (!entry || !thisAttempt) {
    return (
      <PageShell title="Results" backTo="/">
        <p className="text-sm text-ink-muted">Attempt not found.</p>
      </PageShell>
    );
  }

  const { result } = entry;
  const delta = previousSameMode ? result.score - previousSameMode.result.score : null;
  const secondsPerQuestion = result.totalCount > 0 ? Math.round(result.timeTakenSeconds / result.totalCount) : 0;
  const answered = entry.attempt.questionIds.filter(
    (id) => (entry.attempt.answers[id]?.selected.length ?? 0) > 0
  ).length;
  const blanks = result.totalCount - answered;

  return (
    <PageShell title="Results" backTo="/">
      {/* The hand, revealed: one ring carrying the score, the verdict stated
          in words beside it. Calm on purpose — design.md keeps the drama for
          the flip. */}
      <div className="flex flex-col items-center gap-3 rounded-card border border-edge bg-card p-5 text-center">
        <ProgressRing
          value={result.score}
          size={132}
          thickness={10}
          color={result.passed ? "var(--cd-correct)" : "var(--cd-incorrect)"}
          label={`Score ${pct(result.score)}`}
        >
          <div>
            <div className={`text-3xl font-extrabold ${result.passed ? "text-correct" : "text-incorrect"}`}>
              {pct(result.score)}
            </div>
            <div className="font-mono text-[10px] text-ink-muted">
              {result.correctCount}/{result.totalCount}
            </div>
          </div>
        </ProgressRing>

        <div>
          <p className={`text-lg font-bold ${result.passed ? "text-correct" : "text-incorrect"}`}>
            {result.passed ? "Passed" : "Not passed"}
          </p>
          <p className="font-mono text-xs text-ink-muted">
            threshold {pct(result.passThreshold)}
            {delta !== null && (
              <>
                {" · "}
                <span className={delta > 0 ? "text-correct" : delta < 0 ? "text-incorrect" : ""}>
                  {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {pct(Math.abs(delta))} vs last
                </span>
              </>
            )}
          </p>
        </div>

        {thisAttempt.xp > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gilt px-3 py-1 font-mono text-xs text-gilt">
            +{thisAttempt.xp.toLocaleString()} XP
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Time" value={formatDuration(result.timeTakenSeconds)} hint={`${secondsPerQuestion}s per card`} />
        <StatTile label="Answered" value={`${answered}`} hint={blanks > 0 ? `${blanks} left blank` : "no blanks"} />
        <StatTile
          label="Missed"
          value={`${result.totalCount - result.correctCount}`}
          color={result.totalCount - result.correctCount > 0 ? "var(--cd-incorrect)" : undefined}
          hint="review below"
        />
        <StatTile
          label="Suits cleared"
          value={`${result.domainResults.filter((d) => d.percentage >= result.passThreshold).length}/${result.domainResults.length}`}
          hint="at threshold"
        />
      </div>

      {result.weakestDomain && (
        <div className="rounded-card border border-gilt bg-gilt/10 px-4 py-3 text-sm">
          <span className="font-semibold">Next study focus: </span>
          {result.weakestDomain.domainName} ({pct(result.weakestDomain.percentage)})
        </div>
      )}

      <section>
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">By suit</h2>
        <ul className="flex flex-col gap-2">
          {result.domainResults.map((d) => (
            <DomainRow key={d.domainId} domain={d} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">By rank</h2>
        <ul className="flex flex-col gap-2">
          {thisAttempt.difficulties
            .filter((d) => d.answered > 0)
            .map((d) => (
              <li key={d.difficulty} className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-card px-3 py-2">
                <span className="text-sm font-semibold capitalize">{d.difficulty}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-edge">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${d.accuracy * 100}%` }} />
                </div>
                <span className="w-20 text-right font-mono text-[11px] text-ink-muted">
                  {d.correct}/{d.answered} · {pct(d.accuracy)}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">Mastery after this hand</h2>
        <ul className="flex flex-col gap-1.5">
          {computeStudyStats(entries, questions, certConfig)
            .domains.filter((d) => d.answered > 0)
            .map((d) => {
              const suit = suitFor(d.domainId);
              return (
                <li key={d.domainId} className="flex items-center gap-2 rounded-lg border border-edge bg-card px-3 py-2">
                  <SuitIcon name={suit.name} src={suit.src} className="h-5 w-5 flex-shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs">{d.domainName}</span>
                  <MasteryBadge tier={d.tier} compact />
                </li>
              );
            })}
        </ul>
      </section>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={() => navigate(`/review/${entry.attempt.id}`)}>
          Review answers
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => navigate("/stats")}>
          Statistics
        </Button>
        <Button variant="ghost" className="flex-1" onClick={() => navigate("/")}>
          Home
        </Button>
      </div>
    </PageShell>
  );
}
