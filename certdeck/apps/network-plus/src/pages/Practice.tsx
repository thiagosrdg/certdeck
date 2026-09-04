import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  ConfirmDialog,
  MasteryBadge,
  ProgressRing,
  SuitIcon,
  computeStudyStats,
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
  const [confirmExit, setConfirmExit] = useState(false);
  const [draftSelected, setDraftSelected] = useState<string[]>([]);
  const historyEntries = useHistoryStore((s) => s.entries);
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

  /** How many cards each suit holds, so the picker can say what it is offering. */
  const perDomainTotal = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) counts.set(q.domain, (counts.get(q.domain) ?? 0) + 1);
    return counts;
  }, []);

  /** Accuracy per suit, so the weakest is visible while choosing what to drill. */
  const masteryByDomain = useMemo(() => {
    const stats = computeStudyStats(historyEntries, questions, certConfig);
    return new Map(stats.domains.map((d) => [d.domainId, d]));
  }, [historyEntries]);

  const availableInSelection = useMemo(
    () => selectedDomains.reduce((sum, id) => sum + (perDomainTotal.get(id) ?? 0), 0),
    [selectedDomains, perDomainTotal]
  );

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
          <fieldset>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <legend className="text-sm font-semibold">Suits</legend>
              {/* Whole-set toggles, because five taps to clear is four too many. */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDomains(certConfig.domains.map((d) => d.id))}
                  className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDomains([])}
                  className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {certConfig.domains.map((d) => {
                const suit = suitFor(d.id);
                const active = selectedDomains.includes(d.id);
                const mastery = masteryByDomain.get(d.id);
                const seen = mastery && mastery.answered > 0;
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-card border bg-card p-3 transition-colors ${
                      active ? "border-accent ring-2 ring-accent" : "border-edge hover:border-accent/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleDomain(d.id)}
                      className="h-5 w-5 flex-shrink-0"
                      style={{ accentColor: "var(--cd-accent)" }}
                    />

                    {/* The suit itself, in its own hue — the same mark the card
                        carries, so the picker and the deck agree. */}
                    <span
                      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border"
                      style={{ borderColor: suit.hue, backgroundColor: `${suit.hue}1a` }}
                      aria-hidden="true"
                    >
                      <SuitIcon name={suit.name} className="h-5 w-5" style={{ color: suit.hue }} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d.name}</span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-ink-muted">
                          {perDomainTotal.get(d.id) ?? 0} cards
                        </span>
                        {seen && <MasteryBadge tier={mastery.tier} compact />}
                      </span>
                    </span>

                    {/* Only once there is something to show: the weakest suit
                        should be visible while deciding what to drill. */}
                    {seen && (
                      <ProgressRing
                        value={mastery.accuracy}
                        size={40}
                        thickness={4}
                        color={suit.hue}
                        label={`${d.name}: ${Math.round(mastery.accuracy * 100)}% accuracy`}
                        className="flex-shrink-0"
                      >
                        <span className="font-mono text-[10px] font-bold">
                          {Math.round(mastery.accuracy * 100)}
                        </span>
                      </ProgressRing>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">How many cards</legend>
            <div className="grid grid-cols-4 gap-2">
              {COUNT_OPTIONS.map((c) => {
                const active = count === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    aria-pressed={active}
                    className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                      active ? "border-accent bg-accent/10 text-accent" : "border-edge bg-card hover:border-accent/60"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <Button className="w-full" onClick={start} disabled={selectedDomains.length === 0}>
              Start practice
            </Button>
            <p className="mt-2 text-center font-mono text-[11px] text-ink-muted">
              {selectedDomains.length === 0
                ? "Pick at least one suit"
                : `${Math.min(count, availableInSelection)} cards drawn from ${availableInSelection} available in ${selectedDomains.length} suit${selectedDomains.length === 1 ? "" : "s"}`}
            </p>
          </div>
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
        <Button variant="ghost" onClick={() => setConfirmExit(true)}>
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

      <ConfirmDialog
        open={confirmExit}
        title="End this practice session?"
        tone="danger"
        confirmLabel="End session"
        cancelLabel="Keep practising"
        body="This session is discarded rather than scored, so nothing from it reaches your history or stats."
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => {
          setConfirmExit(false);
          exit();
        }}
      />
    </div>
  );
}
