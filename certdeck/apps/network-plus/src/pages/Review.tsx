import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { CardFrame, ExplanationPanel, Navigator, OptionList, isAnswerCorrect, type NavigatorState } from "@certdeck/engine";
import { questions } from "../data/questions";
import { domainName, suitFor } from "../lib/suit";
import { useHistoryStore } from "../stores";

export default function Review() {
  const { attemptId } = useParams();
  const entries = useHistoryStore((s) => s.entries);
  const entry = entries.find((e) => e.attempt.id === attemptId);
  const [index, setIndex] = useState(0);

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), []);

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Header backTo="/history" />
        <p className="mt-4 text-sm text-ink-muted">Attempt not found.</p>
      </div>
    );
  }

  const questionId = entry.attempt.questionIds[index];
  const question = questionId ? questionMap.get(questionId) : undefined;
  const answer = questionId ? entry.attempt.answers[questionId] : undefined;
  const total = entry.attempt.questionIds.length;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <Header backTo={`/results/${entry.attempt.id}`} />

      <Navigator
        items={entry.attempt.questionIds.map((id, i) => {
          const q = questionMap.get(id)!;
          const a = entry.attempt.answers[id];
          const correct = a ? isAnswerCorrect(q, a.selected) : false;
          const s = suitFor(q.domain);
          // Reuses the "flagged" dot to mark a missed question in review, not a user flag.
          const state: NavigatorState = i === index ? "current" : correct ? "answered" : "flagged";
          return { questionId: id, suitName: s.name, suitHue: s.hue, state };
        })}
        onSelect={setIndex}
      />

      {question && (
        <div className="mx-auto aspect-card w-full max-w-sm flex-1">
          <CardFrame
            suitName={suitFor(question.domain).name}
            suitHue={suitFor(question.domain).hue}
            domainLabel={domainName(question.domain)}
            metaLeft={`${question.domain} · Obj ${question.objective} · Q ${index + 1}/${total}`}
            difficulty={question.difficulty}
            footer={
              <>
                <button
                  type="button"
                  className="text-sm text-ink-muted enabled:hover:text-ink disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  ← Prev
                </button>
                <span className="font-mono text-xs text-ink-muted">
                  Card {index + 1} of {total}
                </span>
                <button
                  type="button"
                  className="text-sm text-ink-muted enabled:hover:text-ink disabled:opacity-30"
                  disabled={index === total - 1}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  Next →
                </button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.stem}</p>
              <OptionList
                type={question.type}
                options={question.options}
                selected={answer?.selected ?? []}
                onChange={() => undefined}
                disabled
                reveal={{ correctIds: question.correct }}
              />
              <ExplanationPanel question={question} correct={answer ? isAnswerCorrect(question, answer.selected) : false} />
            </div>
          </CardFrame>
        </div>
      )}
    </div>
  );
}

function Header({ backTo }: { backTo: string }) {
  return (
    <header className="flex items-center gap-2">
      <Link to={backTo} className="text-lg text-ink-muted hover:text-ink" aria-label="Back">
        ←
      </Link>
      <h1 className="text-lg font-bold">Review</h1>
    </header>
  );
}
