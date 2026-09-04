import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  ConfirmDialog,
  SuitIcon,
  Wordmark,
  computeStudyStats,
  formatDuration,
  loadActiveAttempt,
} from "@certdeck/engine";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { suitFor } from "../lib/suit";
import { useExamStore, useHistoryStore } from "../stores";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function Home() {
  const navigate = useNavigate();
  const resumable = useExamStore((s) => s.hasResumableAttempt());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Read the paused attempt without resuming it, so the card can say what is
  // waiting rather than just that something is.
  const paused = useMemo(() => (resumable ? loadActiveAttempt(certConfig.id) : null), [resumable]);
  const entries = useHistoryStore((s) => s.entries);
  const stats = useMemo(() => computeStudyStats(entries, questions, certConfig), [entries]);

  function resume() {
    useExamStore.getState().resume();
    const attempt = useExamStore.getState().attempt;
    if (!attempt) return;
    navigate(attempt.mode === "full-exam" ? "/exam" : attempt.mode === "practice" ? "/practice" : "/random");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      {/* The deck's front: title card, then the five suits it is cut from. */}
      <div className="rounded-card border border-edge bg-card px-5 py-7">
        <Wordmark
          name={certConfig.appName}
          subtitle={`${certConfig.certName} · ${certConfig.examCode}`}
          meta={`${questions.length} cards in the deck`}
        />

        <ul className="mt-5 flex items-center justify-center gap-4" aria-label="Domains in this deck">
          {certConfig.domains.map((d) => {
            const suit = suitFor(d.id);
            return (
              <li key={d.id} title={d.name}>
                <SuitIcon name={suit.name} className="h-4 w-4" style={{ color: suit.hue }} />
                <span className="sr-only">{d.name}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Where the player stands — only once there is something to say. */}
      {stats.hasData && (
        <button
          onClick={() => navigate("/stats")}
          className="rounded-card border border-edge bg-card px-4 py-3 text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-table"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Level</span>
              <span className="text-xl font-extrabold leading-none text-gilt">{stats.level}</span>
            </span>
            <span className="font-mono text-[11px] text-ink-muted">
              {pct(stats.overallAccuracy)} accuracy · {stats.currentStreakDays}d streak
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-edge">
            <div
              className="h-full rounded-full bg-gilt"
              style={{
                width: `${stats.xpForNextLevel > 0 ? (stats.xpIntoLevel / stats.xpForNextLevel) * 100 : 0}%`,
                transition: "width var(--cd-flip-duration) var(--cd-flip-easing)",
              }}
            />
          </div>
        </button>
      )}

      {paused && (
        <div className="rounded-card border border-gilt bg-gilt/10 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">
              {paused.mode === "full-exam" ? "Exam paused" : "Session paused"}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
              {paused.feedbackMode === "immediate" ? "Card by card" : "Exam conditions"}
            </span>
          </div>

          <p className="mt-1 font-mono text-[11px] text-ink-muted">
            On card {Math.min(paused.currentIndex + 1, paused.questionIds.length)} of {paused.questionIds.length} ·{" "}
            {paused.questionIds.filter((id) => (paused.answers[id]?.selected.length ?? 0) > 0).length} answered
            {paused.remainingSeconds != null && <> · {formatDuration(paused.remainingSeconds)} left</>}
          </p>

          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={resume}>
              Resume
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
              Discard
            </Button>
          </div>
        </div>
      )}

      <nav className="flex flex-col gap-3">
        <Button onClick={() => navigate("/exam")}>Full exam</Button>
        <Button variant="secondary" onClick={() => navigate("/practice")}>
          Practice by domain
        </Button>
        <Button variant="secondary" onClick={() => navigate("/random")}>
          Random question
        </Button>
        <div className="mt-1 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => navigate("/stats")}>
            Statistics
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => navigate("/history")}>
            History
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => navigate("/settings")}>
            Settings
          </Button>
        </div>
      </nav>

      <p className="text-center text-xs text-ink-muted">Unofficial. Not affiliated with CompTIA.</p>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard the paused exam?"
        tone="danger"
        confirmLabel="Discard"
        cancelLabel="Keep it"
        body="It is thrown away unscored, so nothing from it reaches your history or stats. You can leave it paused as long as you like instead."
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          useExamStore.getState().abandon();
        }}
      />
    </div>
  );
}
