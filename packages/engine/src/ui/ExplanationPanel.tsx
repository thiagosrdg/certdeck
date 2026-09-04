import type { Question } from "../types/question";

export interface ExplanationPanelProps {
  question: Question;
  correct: boolean;
}

/**
 * The back of the card — the actual product. Verdict, the correct
 * answer restated, why it's correct, and why every distractor is wrong.
 * Always shows the full breakdown, not just what the user got wrong.
 */
export function ExplanationPanel({ question, correct }: ExplanationPanelProps) {
  const correctOptions = question.options.filter((o) => question.correct.includes(o.id));
  const distractors = question.options.filter((o) => !question.correct.includes(o.id));

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className={`text-base font-bold ${correct ? "text-correct" : "text-incorrect"}`}>
        {correct ? "Correct" : "Incorrect"}
      </div>

      <div>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">Correct answer</p>
        <p className="font-medium">{correctOptions.map((o) => o.text).join("; ")}</p>
      </div>

      <div>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">Why</p>
        <p className="text-ink-muted">{question.explanation}</p>
      </div>

      {distractors.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">Why not the others</p>
          <dl className="flex flex-col gap-2">
            {distractors.map((o) => (
              <div key={o.id}>
                <dt className="font-medium">{o.text}</dt>
                <dd className="text-ink-muted">{question.distractorExplanations[o.id]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
