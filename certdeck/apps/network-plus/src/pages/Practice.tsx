import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  CardFlip,
  CardFrame,
  ExplanationPanel,
  Navigator,
  OptionList,
  ProgressDeck,
  generateExam,
  isAnswerCorrect,
  useKeyboardNav,
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

const COUNT_OPTIONS = [10, 20, 30, 50];

export default function Practice() {
  const navigate = useNavigate();
  const attempt = useExamStore((s) => s.attempt);
  const currentIndex = useExamStore((s) => s.currentIndex);
  const settings = useSettingsStore((s) => s.settings);

  const [selectedDomains, setSelectedDomains] = useState<string[]>(certConfig.domains.map((d) => d.id));
  const [count, setCount] = useState(20);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [draftSelected, setDraftSelected] = useState<string[]>([]);
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    const store = useExamStore.getState();
    if (store.attempt?.mode === "practice" && store.attempt.status === "in-progress") return;
    if (store.hasResumableAttempt()) {
      store.resume();
      if (useExamStore.getState().attempt?.mode !== "practice") store.abandon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraftSelected([]);
  }, [currentIndex, attempt?.id]);

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), []);

  function toggleDomain(id: string) {
    setSelectedDomains((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function start() {
    if (selectedDomains.length === 0) return;
    const result = generateExam(certConfig, questions, { domainsFilter: selectedDomains, count });
    setWarnings(result.warnings);
    const timeLimitMinutes = settings.timerEnabledInPractice
      ? Math.max(1, Math.round((certConfig.timeLimitMinutes * count) / certConfig.questionsPerExam))
      : null;
    useExamStore.getState().start({
      mode: "practice",
      questionIds: result.questionIds,
      timeLimitMinutes,
      domainsFilter: selectedDomains,
      usedFallback: result.usedFallback,
    });
  }

  function finish() {
    const store = useExamStore.getState();
    if (!store.attempt) return;
    const { attempt: finished, result } = store.finish(questions, effectiveConfig(settings));
    useHistoryStore.getState().addEntry({ attempt: finished, result });
    navigate(`/results/${finished.id}`, { replace: true });
  }

  function exit() {
    if (!window.confirm("End this practice session? Your progress on it will be lost.")) return;
    useExamStore.getState().abandon();
    navigate("/");
  }

  // Every hook below must run unconditionally on every render — including
  // during the domain-picker phase, before `attempt` exists — so none of
  // this can move after the `if (!attempt)` early return further down.
  const currentQuestionId = attempt?.questionIds[currentIndex];
  const currentQuestion = currentQuestionId ? questionMap.get(currentQuestionId) : undefined;
  const displayQuestion =
    currentQuestion && attempt ? withDisplayOptions(currentQuestion, attempt.id, settings.shuffleOptions) : undefined;
  const answer = currentQuestionId && attempt ? attempt.answers[currentQuestionId] : undefined;
  const revealed = !!answer?.answeredAt;
  const isLast = !!attempt && currentIndex === attempt.questionIds.length - 1;

  function goNext() {
    directionRef.current = 1;
    useExamStore.getState().next();
  }
  function goPrev() {
    directionRef.current = -1;
    useExamStore.getState().prev();
  }
  function checkAnswer() {
    if (!currentQuestionId || draftSelected.length === 0) return;
    useExamStore.getState().answer(currentQuestionId, draftSelected);
  }

  useKeyboardNav({
    enabled: !!displayQuestion,
    onSelectOption: (i) => {
      if (revealed || !displayQuestion) return;
      const option = displayQuestion.options[i];
      if (!option) return;
      setDraftSelected((prev) =>
        displayQuestion.type === "single" ? [option.id] : prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id]
      );
    },
    onSubmit: revealed ? goNext : checkAnswer,
    onNext: revealed && !isLast ? goNext : undefined,
    onPrev: currentIndex > 0 ? goPrev : undefined,
    onToggleFlag: () => currentQuestionId && useExamStore.getState().toggleFlag(currentQuestionId),
  });

  if (!attempt) {
    return (
      <PageShell title="Practice by domain" backTo="/">
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Domains</legend>
            {certConfig.domains.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(d.id)}
                  onChange={() => toggleDomain(d.id)}
                  className="h-4 w-4"
                  style={{ accentColor: "var(--cd-accent)" }}
                />
                {d.name}
              </label>
            ))}
          </fieldset>

          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="count">
              Question count
            </label>
            <select
              id="count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-edge bg-card px-3 py-2 text-sm"
            >
              {COUNT_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={start} disabled={selectedDomains.length === 0}>
            Start practice
          </Button>
        </div>
      </PageShell>
    );
  }

  if (!displayQuestion || !currentQuestionId) {
    return <div className="p-6 text-center text-ink-muted">Loading…</div>;
  }

  const suit = suitFor(displayQuestion.domain);

  const flipTarget: FlipTarget = {
    key: `${currentQuestionId}-${revealed}`,
    axis: revealed ? "x" : "y",
    direction: 1,
    announce: revealed ? "Feedback revealed." : displayQuestion.stem,
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
            {revealed ? (
              isLast ? (
                <Button onClick={finish}>Finish</Button>
              ) : (
                <Button onClick={goNext}>Next →</Button>
              )
            ) : (
              <Button onClick={checkAnswer} disabled={draftSelected.length === 0}>
                Check
              </Button>
            )}
          </>
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
            <ExplanationPanel question={displayQuestion} correct={isAnswerCorrect(displayQuestion, answer?.selected ?? [])} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayQuestion.stem}</p>
            <OptionList type={displayQuestion.type} options={displayQuestion.options} selected={draftSelected} onChange={setDraftSelected} />
          </div>
        )}
      </CardFrame>
    ),
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <Button variant="ghost" onClick={exit}>
          Exit
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setNavigatorOpen((v) => !v)}>
            {navigatorOpen ? "Hide grid" : "Question grid"}
          </Button>
          <Button variant="secondary" onClick={finish}>
            Finish
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
            const state: NavigatorState = index === currentIndex ? "current" : a?.flagged ? "flagged" : a?.answeredAt ? "answered" : "unanswered";
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
    </div>
  );
}
