import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  CardFlip,
  ConfirmDialog,
  CardFrame,
  Navigator,
  OptionList,
  ProgressDeck,
  TimerDisplay,
  generateExam,
  useCountdownTimer,
  useKeyboardNav,
  type FlipTarget,
  type NavigatorState,
} from "@certdeck/engine";
import { certConfig } from "../cert.config";
import { questions } from "../data/questions";
import { withDisplayOptions } from "../lib/display-question";
import { effectiveConfig } from "../lib/effective-config";
import { domainName, suitFor } from "../lib/suit";
import { useExamStore, useHistoryStore, useSettingsStore } from "../stores";

export default function FullExam() {
  const navigate = useNavigate();
  const attempt = useExamStore((s) => s.attempt);
  const currentIndex = useExamStore((s) => s.currentIndex);
  const settings = useSettingsStore((s) => s.settings);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    const store = useExamStore.getState();
    if (store.attempt?.mode === "full-exam" && store.attempt.status === "in-progress") return;

    if (store.hasResumableAttempt()) {
      store.resume();
      if (useExamStore.getState().attempt?.mode === "full-exam") return;
      store.abandon();
    }

    const result = generateExam(certConfig, questions);
    setWarnings(result.warnings);
    store.start({
      mode: "full-exam",
      questionIds: result.questionIds,
      timeLimitMinutes: certConfig.timeLimitMinutes,
      usedFallback: result.usedFallback,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), []);

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

  const currentQuestionId = attempt?.questionIds[currentIndex];
  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) : undefined;
  const displayQuestion =
    currentQuestion && attempt ? withDisplayOptions(currentQuestion, attempt.id, settings.shuffleOptions) : undefined;
  const answer = currentQuestionId && attempt ? attempt.answers[currentQuestionId] : undefined;

  useKeyboardNav({
    enabled: !!displayQuestion && !!currentQuestionId,
    onSelectOption: (i) => {
      if (!displayQuestion || !currentQuestionId) return;
      const option = displayQuestion.options[i];
      if (!option) return;
      const current = answer?.selected ?? [];
      const selected =
        displayQuestion.type === "single"
          ? [option.id]
          : current.includes(option.id)
            ? current.filter((id) => id !== option.id)
            : [...current, option.id];
      useExamStore.getState().answer(currentQuestionId, selected);
    },
    onNext: goNext,
    onPrev: goPrev,
    onToggleFlag: () => currentQuestionId && useExamStore.getState().toggleFlag(currentQuestionId),
  });

  if (!attempt || !displayQuestion || !currentQuestionId) {
    return <div className="p-6 text-center text-ink-muted">Preparing exam…</div>;
  }

  const suit = suitFor(displayQuestion.domain);
  const isLast = currentIndex === attempt.questionIds.length - 1;
  const total = attempt.questionIds.length;
  const answeredCount = attempt.questionIds.filter((id) => (attempt.answers[id]?.selected.length ?? 0) > 0).length;
  const unansweredCount = total - answeredCount;
  const flaggedCount = attempt.questionIds.filter((id) => attempt.answers[id]?.flagged).length;

  const flipTarget: FlipTarget = {
    key: currentQuestionId,
    axis: "y",
    direction: directionRef.current,
    announce: `Question ${currentIndex + 1} of ${attempt.questionIds.length}. ${displayQuestion.stem}`,
    content: (
      <CardFrame
        suitName={suit.name}
        suitHue={suit.hue}
        domainLabel={domainName(displayQuestion.domain)}
        metaLeft={`${displayQuestion.domain} · Obj ${displayQuestion.objective} · Q ${currentIndex + 1}/${attempt.questionIds.length}`}
        difficulty={displayQuestion.difficulty}
        flagged={answer?.flagged}
        onToggleFlag={() => useExamStore.getState().toggleFlag(currentQuestionId)}
        footer={
          <>
            <Button variant="ghost" onClick={goPrev} disabled={currentIndex === 0}>
              ← Prev
            </Button>
            <ProgressDeck current={currentIndex + 1} total={attempt.questionIds.length} />
            {isLast ? (
              <Button onClick={() => setConfirmOpen(true)}>Submit</Button>
            ) : (
              <Button variant="ghost" onClick={goNext}>
                Next →
              </Button>
            )}
          </>
        }
      >
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed">{displayQuestion.stem}</p>
        <OptionList
          type={displayQuestion.type}
          options={displayQuestion.options}
          selected={answer?.selected ?? []}
          onChange={(selected) => useExamStore.getState().answer(currentQuestionId, selected)}
        />
      </CardFrame>
    ),
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <TimerDisplay secondsLeft={timer.secondsLeft} />
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
              index === currentIndex ? "current" : a?.flagged ? "flagged" : (a?.selected.length ?? 0) > 0 ? "answered" : "unanswered";
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
            {flaggedCount > 0 && (
              <p className="mt-1">
                {flaggedCount} still flagged for review.
              </p>
            )}
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
