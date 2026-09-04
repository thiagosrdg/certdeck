import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  LevelBar,
  MasteryBadge,
  ProgressRing,
  ScoreTrend,
  StatTile,
  SuitIcon,
  computeStudyStats,
  formatDuration,
  type DomainMastery,
} from "@certdeck/engine";
import { PageShell } from "../components/PageShell";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { effectiveConfig } from "../lib/effective-config";
import { suitFor } from "../lib/suit";
import { useHistoryStore, useSettingsStore } from "../stores";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">{title}</h2>
      {hint && <p className="mb-2 text-xs text-ink-muted">{hint}</p>}
      {children}
    </section>
  );
}

function DomainCard({ domain }: { domain: DomainMastery }) {
  const suit = suitFor(domain.domainId);
  return (
    <li className="flex items-center gap-3 rounded-card border border-edge bg-card p-3">
      <ProgressRing
        value={domain.accuracy}
        size={62}
        color={suit.hue}
        label={`${domain.domainName}: ${pct(domain.accuracy)} accuracy`}
      >
        <span className="font-mono text-sm font-bold">{domain.answered > 0 ? pct(domain.accuracy) : "—"}</span>
      </ProgressRing>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <SuitIcon name={suit.name} className="h-3.5 w-3.5 flex-shrink-0" style={{ color: suit.hue }} />
          <span className="truncate text-sm font-semibold">{domain.domainName}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <MasteryBadge tier={domain.tier} compact />
          <span className="font-mono text-[11px] text-ink-muted">
            {domain.correct}/{domain.answered} answered
          </span>
        </div>

        <p className="mt-1 font-mono text-[10px] text-ink-muted">
          {domain.questionsSeen}/{domain.questionsTotal} of the deck seen · {pct(domain.coverage)}
          {domain.toNextTier && domain.toNextTier.answeredShort > 0 && (
            <> · {domain.toNextTier.answeredShort} more for {domain.toNextTier.tier}</>
          )}
          {domain.toNextTier && domain.toNextTier.answeredShort === 0 && domain.toNextTier.accuracyShort > 0 && (
            <> · {pct(domain.toNextTier.accuracyShort)} more accuracy for {domain.toNextTier.tier}</>
          )}
        </p>
      </div>
    </li>
  );
}

export default function Stats() {
  const navigate = useNavigate();
  const entries = useHistoryStore((s) => s.entries);
  const settings = useSettingsStore((s) => s.settings);
  const config = useMemo(() => effectiveConfig(settings), [settings]);

  const stats = useMemo(() => computeStudyStats(entries, questions, certConfig), [entries]);

  if (!stats.hasData) {
    return (
      <PageShell title="Statistics" backTo="/">
        <div className="rounded-card border border-dashed border-edge bg-card p-6 text-center">
          <p className="text-sm font-semibold">No hands played yet.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Answer a few questions and this fills with your mastery per domain, your weakest objectives and how your
            exam scores move.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => navigate("/practice")}>
              Practice by domain
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => navigate("/exam")}>
              Take a full exam
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const weakest = [...stats.domains].filter((d) => d.answered > 0).sort((a, b) => a.accuracy - b.accuracy)[0];

  return (
    <PageShell title="Statistics" backTo="/">
      <LevelBar
        level={stats.level}
        xpIntoLevel={stats.xpIntoLevel}
        xpForNextLevel={stats.xpForNextLevel}
        totalXp={stats.xp}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Accuracy"
          value={pct(stats.overallAccuracy)}
          hint={`${stats.totalCorrect}/${stats.totalAnswered} answered`}
        />
        <StatTile
          label="Streak"
          value={`${stats.currentStreakDays}d`}
          color="var(--cd-gilt)"
          hint={stats.studiedToday ? "Studied today" : "Play a hand today"}
        />
        <StatTile label="Deck seen" value={pct(stats.bankCoverage)} hint={`${stats.questionsSeen}/${stats.questionsTotal} cards`} />
        <StatTile label="Time studied" value={formatDuration(stats.totalStudySeconds)} hint={`${stats.activeDays} active days`} />
      </div>

      {weakest && (
        <div className="rounded-card border border-gilt bg-gilt/10 px-4 py-3 text-sm">
          <span className="font-semibold">Next study focus: </span>
          {weakest.domainName} ({pct(weakest.accuracy)})
          {stats.needsReviewCount > 0 && (
            <span className="text-ink-muted">
              {" "}
              · {stats.needsReviewCount} card{stats.needsReviewCount === 1 ? "" : "s"} you missed last time
            </span>
          )}
        </div>
      )}

      <Section title="Mastery by suit" hint="A tier needs both accuracy and volume, so one lucky card is not mastery.">
        <ul className="flex flex-col gap-2">
          {stats.domains.map((d) => (
            <DomainCard key={d.domainId} domain={d} />
          ))}
        </ul>
      </Section>

      {stats.examTrend.length > 0 && (
        <Section title="Full exams over time">
          <div className="rounded-card border border-edge bg-card p-3">
            <ScoreTrend points={stats.examTrend} passThreshold={config.passThreshold} />
            <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-muted">
              <span>Best {stats.bestExamScore !== null ? pct(stats.bestExamScore) : "—"}</span>
              <span>
                {stats.examAttempts} exam{stats.examAttempts === 1 ? "" : "s"}
              </span>
              <span>Last {stats.lastExamScore !== null ? pct(stats.lastExamScore) : "—"}</span>
            </div>
          </div>
        </Section>
      )}

      <Section title="By rank" hint="Difficulty is the card's rank. A gap here says which rank to drill.">
        <ul className="flex flex-col gap-2">
          {stats.difficulties.map((d) => (
            <li key={d.difficulty} className="rounded-card border border-edge bg-card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold capitalize">{d.difficulty}</span>
                <span className="font-mono text-[11px] text-ink-muted">
                  {d.answered > 0 ? `${d.correct}/${d.answered} · ${pct(d.accuracy)}` : "not seen yet"}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-edge">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${d.accuracy * 100}%`, transition: "width var(--cd-flip-duration) var(--cd-flip-easing)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {stats.weakestObjectives.length > 0 && (
        <Section
          title="Weakest objectives"
          hint="Ranked once an objective has enough answers to mean something — these are the exam objectives to read up on."
        >
          <ul className="flex flex-col gap-1.5">
            {stats.weakestObjectives.map((o) => {
              const suit = suitFor(o.domainId);
              return (
                <li key={o.objective} className="flex items-center gap-2 rounded-lg border border-edge bg-card px-3 py-2">
                  <SuitIcon name={suit.name} className="h-3 w-3 flex-shrink-0" style={{ color: suit.hue }} />
                  <span className="font-mono text-xs font-semibold">{o.objective}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{o.domainName}</span>
                  <span className={`font-mono text-xs ${o.accuracy < 0.5 ? "text-incorrect" : "text-ink-muted"}`}>
                    {o.correct}/{o.answered} · {pct(o.accuracy)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={() => navigate("/practice")}>
          Practice weak suits
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => navigate("/history")}>
          Attempt history
        </Button>
      </div>
    </PageShell>
  );
}
