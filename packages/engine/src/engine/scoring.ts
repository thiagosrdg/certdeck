import type { Attempt } from "../types/attempt";
import type { CertConfig } from "../types/cert-config";
import type { Question } from "../types/question";
import type { AttemptResult, DomainResult } from "../types/results";

/**
 * A question is correct only when the selected set exactly matches the
 * correct set — no partial credit on multi-answer questions, matching how
 * CompTIA exams themselves grade "choose N" items.
 */
export function isAnswerCorrect(question: Question, selected: readonly string[]): boolean {
  if (selected.length !== question.correct.length) return false;
  const correctSet = new Set(question.correct);
  return selected.every((id) => correctSet.has(id));
}

export function computeResults(attempt: Attempt, questions: readonly Question[], config: CertConfig): AttemptResult {
  const byId = new Map(questions.map((q) => [q.id, q] as const));
  const stats = new Map<string, { total: number; correct: number }>();

  let correctCount = 0;
  const missedQuestionIds: string[] = [];

  for (const qid of attempt.questionIds) {
    const question = byId.get(qid);
    if (!question) continue;

    const selected = attempt.answers[qid]?.selected ?? [];
    const correct = isAnswerCorrect(question, selected);

    const entry = stats.get(question.domain) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (correct) {
      entry.correct += 1;
      correctCount += 1;
    } else {
      missedQuestionIds.push(qid);
    }
    stats.set(question.domain, entry);
  }

  const totalCount = attempt.questionIds.length;
  const score = totalCount > 0 ? correctCount / totalCount : 0;

  const domainResults: DomainResult[] = config.domains
    .map((d): DomainResult => {
      const entry = stats.get(d.id) ?? { total: 0, correct: 0 };
      return {
        domainId: d.id,
        domainName: d.name,
        total: entry.total,
        correct: entry.correct,
        percentage: entry.total > 0 ? entry.correct / entry.total : 0,
      };
    })
    .filter((r) => r.total > 0);

  const weakestDomain = domainResults.reduce<DomainResult | null>((worst, r) => {
    if (!worst || r.percentage < worst.percentage) return r;
    return worst;
  }, null);

  const finishedAt = attempt.finishedAt ?? Date.now();
  const timeTakenSeconds = Math.max(0, Math.round((finishedAt - attempt.startedAt) / 1000));

  return {
    attemptId: attempt.id,
    certId: attempt.certId,
    mode: attempt.mode,
    score,
    correctCount,
    totalCount,
    passed: score >= config.passThreshold,
    passThreshold: config.passThreshold,
    timeTakenSeconds,
    domainResults,
    weakestDomain,
    missedQuestionIds,
  };
}
