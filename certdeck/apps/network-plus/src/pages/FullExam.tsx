import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  CardFlip,
  CardFrame,
  ConfirmDialog,
  ExplanationPanel,
  Navigator,
  OptionList,
  ProgressDeck,
  TimerDisplay,
  generateExam,
  isAnswerCorrect,
  useCountdownTimer,
  useKeyboardNav,
  type FeedbackMode,
  type FlipTarget,
  type NavigatorState,
} from "@certdeck/engine";
import { PageShell } from "../components/PageShell";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { withDisplayOptions } from "../lib/display-question";
import { effectiveConfig } from "../lib/effective-config";
import { domainName, suitFor } from "../lib/suit";
import { useExamStore, useHistoryStore, useSettingsStore } from "../stores";

const MODES: ReadonlyArray<{ value: FeedbackMode; title: string; blurb: string; detail: string }> = [
  {
    value: "deferred",
    title: "Exam conditions",
    blurb: "Nothing is revealed until you submit.",
    detail: "Answer all 90, move freely between them, and see every answer and the full breakdown at the end. This is the real thing.",
  },
  {
    value: "immediate",
    title: "Card by card",
    blurb: "Each card is checked as you play it.",
    detail: "See the answer and its explanation while the question is still fresh. Answers lock once checked, so the score still counts — but it is a study run, not a rehearsal.",
  },
];

export default function FullExam() {
  const navigate = useNavigate();
  const attempt = useExamStore((s) => s.attempt);
  const currentIndex = useExamStore((s) => s.currentIndex);
  const settings = useSettingsStore((s) => s.settings);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [chosenMode, setChosenMode] = useState<FeedbackMode>("deferred");
  const [draftSelected, setDraftSelected] = useState<string[]>([]);
  const directionRef = useRef<1 | -1>(1);

  // Only resume here; starting is the setup screen's job, so the exam can no
  // longer begin before the mode has been chosen.
  useEffect(() => {
    const store = useExamStore.getState();
    if (store.attempt?.mode === "full-exam" && store.attempt.status === "in-progress") return;
    if (store.hasResumableAttempt()) {
      store.resume();
      if (useExamStore.getState().attempt?.mode !== "full-exam") store.abandon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraftSelected([]);
  }, [currentIndex, attempt?.id]);

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), []);

  function start() {
    const result = generateExam(certConfig, questions);
    setWarnings(result.warnings);
    useExamStore.getState().start({
      mode: "full-exam",
      questionIds: result.questionIds,
      timeLimitMinutes: certConfig.timeLimitMinutes,
      usedFallback: result.usedFallback,
      feedbackMode: chosenMode,
    });
  }

  function finish() {
    const store = useExamStore.getState();
    if (!store.attempt) return;
    const { attempt: finished, result } = store.finish(questions, effectiveConfig(settings));
    useHistoryStore.getState().addEntry({ attempt: finished, result });
    navigate(`/results/${finished.id}`, { replace: true });
  }

  const timer = useCountdownTimer({
    initialSeconds: attempt?.remainingSeconds ?? certConfig.timeLimitMinutes * 60,
    running: !!attempt,
    onExpire: finish,
  });

  useEffect(() => {
    if (attempt) useExamStore.getState().tick(timer.secondsLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.secondsLeft]);

  function goNext() {
    directionRef.current = 1;
    useExamStore.getState().next();
  }
  function goPrev() {
    directionRef.current = -1;
    useExamStore.getState().prev();
  }

  // Every hook below must run unconditionally on every render — including
  // during the setup phase, before `attempt` exists — so none of this can
  // move after the early returns further down.
  const immediate = attempt?.feedbackMode === "immediate";
  const currentQuestionId = attempt?.questionIds[currentIndex];
  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) : undefined;
  const displayQuestion =
    currentQuestion && attempt ? withDisplayOptions(currentQuestion, attempt.id, settings.shuffleOptions) : undefined;
  const answer = currentQuestionId && attempt ? attempt.answers[currentQuestionId] : undefined;
  /** Only meaningful in immediate mode: the card has been played and graded. */
  const revealed = immediate && !!answer?.answeredAt;
  const isLast = !!attempt && currentIndex === attempt.questionIds.length - 1;

  function checkAnswer() {
    if (!currentQuestionId || draftSelected.length === 0) return;
    useExamStore.getState().answer(currentQuestionId, draftSelected);
  }

  useKeyboardNav({
    enabled: !!displayQuestion && !!currentQuestionId,
    onSelectOption: (i) => {
      if (!displayQuestion || !currentQuestionId || revealed) return;
      const option = displayQuestion.options[i];
      if (!option) return;

      if (immediate) {
        setDraftSelected((prev) =>
          displayQuestion.type === "single"
            ? [option.id]
            : prev.includes(option.id)
              ? prev.filter((id) => id !== option.id)
              : [...prev, option.id]
        );
        return;
      }

      const current = answer?.selected ?? [];
      const selected =
        displayQuestion.type === "single"
          ? [option.id]
          : current.includes(option.id)
            ? current.filter((id) => id !== option.id)
            : [...current, option.id];
      useExamStore.getState().answer(currentQuestionId, selected);
    },
    onSubmit: immediate ? (revealed ? (isLast ? undefined : goNext) : checkAnswer) : undefined,
    onNext: immediate ? (revealed && !isLast ? goNext : undefined) : goNext,
    onPrev: immediate ? undefined : goPrev,
    onToggleFlag: () => currentQuestionId && useExamStore.getState().toggleFlag(currentQuestionId),
  });

  // ---- Setup: choose how the deck is played, before a card is dealt --------
  if (!attempt) {
    return (
      <PageShell title="Full exam" backTo="/">
        <p className="text-sm text-ink-muted">
          {certConfig.questionsPerExam} cards drawn to the official domain weighting, {certConfig.timeLimitMinutes}{" "}
          minutes on the clock. Choose how you want to play it.
        </p>

        <fieldset className="mt-2 flex flex-col gap-3">
          <legend className="sr-only">Feedback mode</legend>
          {MODES.map((m) => {
            const active = chosenMode === m.value;
            return (
              <label
                key={m.value}
                className={`cursor-pointer rounded-card border bg-card p-4 transition-colors ${
                  active ? "border-accent ring-2 ring-accent" : "border-edge hover:border-accent/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="feedback-mode"
                    value={m.value}
                    checked={active}
                    onChange={() => setChosenMode(m.value)}
                    className="mt-1 h-4 w-4 flex-shrink-0"
                    style={{ accentColor: "var(--cd-accent)" }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{m.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-muted">{m.blurb}</div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-muted">{m.detail}</p>
                  </div>
                </div>
              </label>
            );
          })}
        </fieldset>

        <Button className="mt-2" onClick={start}>
          Deal the exam
        </Button>
      </PageShell>
    );
  }

  if (!displayQuestion || !currentQuestionId) {
    return <div className="p-6 text-center text-ink-muted">Preparing exam…</div>;
  }

  const total = attempt.questionIds.length;
  const answeredCount = attempt.questionIds.filter((id) => (attempt.answers[id]?.selected.length ?? 0) > 0).length;
  const unansweredCount = total - answeredCount;
  const flaggedCount = attempt.questionIds.filter((id) => attempt.answers[id]?.flagged).length;
  const suit = suitFor(displayQuestion.domain);

  const flipTarget: FlipTarget = {
    key: `${currentQuestionId}-${revealed}`,
    axis: revealed ? "x" : "y",
    direction: directionRef.current,
    announce: revealed
      ? "Feedback revealed."
      : `Question ${currentIndex + 1} of ${total}. ${displayQuestion.stem}`,
    content: (
      <CardFrame
        suitName={suit.name}
        suitHue={suit.hue}
        domainLabel={domainName(displayQuestion.domain)}
        metaLeft={`${displayQuestion.domain} · Obj ${displayQuestion.objective} · Q ${currentIndex + 1}/${total}`}
        difficulty={displayQuestion.difficulty}
        flagged={answer?.flagged}
        onToggleFlag={() => useExamStore.getState().toggleFlag(currentQuestionId)}
        footer={
          immediate ? (
            <>
              <ProgressDeck current={currentIndex + 1} total={total} />
              {revealed ? (
                isLast ? (
                  <Button onClick={() => setConfirmOpen(true)}>Finish</Button>
                ) : (
                  <Button onClick={goNext}>Next →</Button>
                )
              ) : (
                <Button onClick={checkAnswer} disabled={draftSelected.length === 0}>
                  Check
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={goPrev} disabled={currentIndex === 0}>
                ← Prev
              </Button>
              <ProgressDeck current={currentIndex + 1} total={total} />
              {isLast ? (
                <Button onClick={() => setConfirmOpen(true)}>Submit</Button>
              ) : (
                <Button variant="ghost" onClick={goNext}>
                  Next →
                </Button>
              )}
            </>
          )
        }
      >
        {revealed ? (
          <div className="flex flex-col gap-4">
            <OptionList
              type={displayQuestion.type}
              options={displayQuestion.options}
              selected={answer?.selected ?? []}
              onChange={() => undefined}
              disabled
              reveal={{ correctIds: displayQuestion.correct }}
            />
            <ExplanationPanel
              question={displayQuestion}
              correct={isAnswerCorrect(displayQuestion, answer?.selected ?? [])}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayQuestion.stem}</p>
            <OptionList
              type={displayQuestion.type}
              options={displayQuestion.options}
              selected={immediate ? draftSelected : (answer?.selected ?? [])}
              onChange={
                immediate
                  ? setDraftSelected
                  : (selected) => useExamStore.getState().answer(currentQuestionId, selected)
              }
            />
          </div>
        )}
      </CardFrame>
    ),
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        {/* The mode changes what a click does, so it stays on screen — the
            phone is the primary study device, not the widest breakpoint. */}
        <div className="flex flex-col">
          <TimerDisplay secondsLeft={timer.secondsLeft} />
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            {immediate ? "Card by card" : "Exam conditions"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setNavigatorOpen((v) => !v)}>
            {navigatorOpen ? "Hide grid" : "Question grid"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Submit
          </Button>
        </div>
      </header>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-gilt bg-gilt/10 p-3 text-xs text-ink-muted">{warnings.join(" ")}</div>
      )}

      {navigatorOpen && (
        <Navigator
          items={attempt.questionIds.map((id, index) => {
            const q = questionMap.get(id)!;
            const a = attempt.answers[id];
            const state: NavigatorState =
              index === currentIndex
                ? "current"
                : a?.flagged
                  ? "flagged"
                  : (a?.selected.length ?? 0) > 0
                    ? "answered"
                    : "unanswered";
            const s = suitFor(q.domain);
            return { questionId: id, suitName: s.name, suitHue: s.hue, state };
          })}
          onSelect={(index) => {
            directionRef.current = index > currentIndex ? 1 : -1;
            useExamStore.getState().goTo(index);
          }}
        />
      )}

      <div className="mx-auto aspect-card w-full max-w-sm flex-1">
        <CardFlip target={flipTarget} disableAnimation={!settings.cardFlipEnabled} className="h-full w-full" />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit the exam?"
        confirmLabel="Submit"
        cancelLabel="Keep working"
        body={
          <>
            <p>
              Scoring {answeredCount} of {total} answered.
            </p>
            {unansweredCount > 0 && (
              <p className="mt-1 text-incorrect">
                {unansweredCount} question{unansweredCount === 1 ? "" : "s"} left blank will be marked incorrect.
              </p>
            )}
            {flaggedCount > 0 && <p className="mt-1">{flaggedCount} still flagged for review.</p>}
          </>
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          finish();
        }}
      />
    </div>
  );
}
