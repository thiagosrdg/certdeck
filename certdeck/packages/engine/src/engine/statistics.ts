import type { HistoryEntry } from "./persistence";
import { isAnswerCorrect } from "./scoring";
import type { CertConfig } from "../types/cert-config";
import type { Difficulty, Question } from "../types/question";

/**
 * Study statistics aggregated across every attempt in history.
 *
 * Nothing here knows any certification: domains, objectives and difficulties
 * all come from the config and the question bank that are passed in. Adding a
 * certification must not require touching this file.
 */

export type MasteryTier = "unranked" | "bronze" | "silver" | "gold";

/**
 * A tier needs both accuracy and volume — otherwise one lucky question would
 * read as mastery, which is exactly the sort of flattery that makes a study
 * tool useless.
 */
export const MASTERY_TIERS: ReadonlyArray<{ tier: MasteryTier; minAnswered: number; minAccuracy: number }> = [
  { tier: "gold", minAnswered: 30, minAccuracy: 0.85 },
  { tier: "silver", minAnswered: 20, minAccuracy: 0.7 },
  { tier: "bronze", minAnswered: 10, minAccuracy: 0.5 },
];

/** Harder questions are worth more, so grinding easy ones is not the fast path. */
export const XP_PER_CORRECT: Record<Difficulty, number> = { easy: 10, medium: 15, hard: 25 };
export const XP_EXAM_PASS_BONUS = 250;

/** Cumulative XP to reach level L is BASE * L * (L - 1) / 2 — a widening curve. */
const XP_LEVEL_BASE = 400;

export function xpForLevel(level: number): number {
  return (XP_LEVEL_BASE * level * (level - 1)) / 2;
}

export function levelFromXp(xp: number): number {
  // Invert the triangular curve; guard the sqrt for xp = 0.
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xp) / XP_LEVEL_BASE)) / 2));
}

export function masteryTier(answered: number, accuracy: number): MasteryTier {
  for (const t of MASTERY_TIERS) {
    if (answered >= t.minAnswered && accuracy >= t.minAccuracy) return t.tier;
  }
  return "unranked";
}

export interface DomainMastery {
  domainId: string;
  domainName: string;
  /** Times a question from this domain was answered, across all attempts. */
  answered: number;
  correct: number;
  /** 0..1; 0 when nothing has been answered yet. */
  accuracy: number;
  tier: MasteryTier;
  /** Distinct questions from this domain answered at least once. */
  questionsSeen: number;
  questionsTotal: number;
  /** 0..1 share of the domain's bank this user has actually met. */
  coverage: number;
  /** Answered occurrences needed for the next tier, or null at gold. */
  toNextTier: { tier: MasteryTier; answeredShort: number; accuracyShort: number } | null;
}

export interface DifficultyStat {
  difficulty: Difficulty;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface ObjectiveStat {
  objective: string;
  domainId: string;
  domainName: string;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface ExamTrendPoint {
  attemptId: string;
  finishedAt: number;
  score: number;
  passed: boolean;
}

export interface StudyStats {
  hasData: boolean;
  attempts: number;
  examAttempts: number;
  /** Answer events, not distinct questions. */
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
  totalStudySeconds: number;

  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;

  currentStreakDays: number;
  longestStreakDays: number;
  studiedToday: boolean;
  activeDays: number;

  domains: DomainMastery[];
  difficulties: DifficultyStat[];
  /** Weakest first; only objectives with enough answers to mean something. */
  weakestObjectives: ObjectiveStat[];
  strongestObjectives: ObjectiveStat[];

  questionsSeen: number;
  questionsTotal: number;
  bankCoverage: number;

  examTrend: ExamTrendPoint[];
  bestExamScore: number | null;
  lastExamScore: number | null;
  /** Questions answered wrong the last time they were seen. */
  needsReviewCount: number;
}

const DIFFICULTY_ORDER: readonly Difficulty[] = ["easy", "medium", "hard"];

/** Local-time day key, so a streak follows the user's calendar, not UTC. */
function dayKey(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + delta);
  return dayKey(date.getTime());
}

interface Tally {
  answered: number;
  correct: number;
}

function bump(map: Map<string, Tally>, key: string, correct: boolean): void {
  const t = map.get(key) ?? { answered: 0, correct: 0 };
  t.answered += 1;
  if (correct) t.correct += 1;
  map.set(key, t);
}

const ratio = (t: Tally): number => (t.answered > 0 ? t.correct / t.answered : 0);

/** An objective needs this many answers before its accuracy is worth ranking. */
const MIN_ANSWERS_FOR_OBJECTIVE_RANKING = 3;

export function computeStudyStats(
  history: readonly HistoryEntry[],
  questions: readonly Question[],
  config: CertConfig,
  now: number = Date.now()
): StudyStats {
  const byId = new Map(questions.map((q) => [q.id, q] as const));

  const domainTally = new Map<string, Tally>();
  const objectiveTally = new Map<string, Tally>();
  const difficultyTally = new Map<string, Tally>();
  const seenQuestionIds = new Set<string>();
  const domainSeen = new Map<string, Set<string>>();
  /** Most recent outcome per question, for the review queue. */
  const lastOutcome = new Map<string, { at: number; correct: boolean }>();
  const activeDayKeys = new Set<string>();

  let totalAnswered = 0;
  let totalCorrect = 0;
  let totalStudySeconds = 0;
  let xp = 0;
  let examAttempts = 0;
  const examTrend: ExamTrendPoint[] = [];

  for (const entry of history) {
    const { attempt, result } = entry;
    totalStudySeconds += result.timeTakenSeconds;
    const finishedAt = attempt.finishedAt ?? attempt.startedAt;
    activeDayKeys.add(dayKey(finishedAt));

    if (attempt.mode === "full-exam") {
      examAttempts += 1;
      examTrend.push({ attemptId: attempt.id, finishedAt, score: result.score, passed: result.passed });
      if (result.passed) xp += XP_EXAM_PASS_BONUS;
    }

    for (const qid of attempt.questionIds) {
      const question = byId.get(qid);
      if (!question) continue; // question retired from the bank since the attempt
      const selected = attempt.answers[qid]?.selected ?? [];
      if (selected.length === 0) continue; // skipped: tells us nothing about mastery

      const correct = isAnswerCorrect(question, selected);
      totalAnswered += 1;
      if (correct) {
        totalCorrect += 1;
        xp += XP_PER_CORRECT[question.difficulty];
      }

      bump(domainTally, question.domain, correct);
      bump(objectiveTally, question.objective, correct);
      bump(difficultyTally, question.difficulty, correct);

      seenQuestionIds.add(qid);
      const perDomain = domainSeen.get(question.domain) ?? new Set<string>();
      perDomain.add(qid);
      domainSeen.set(question.domain, perDomain);

      const previous = lastOutcome.get(qid);
      if (!previous || finishedAt >= previous.at) lastOutcome.set(qid, { at: finishedAt, correct });
    }
  }

  const bankByDomain = new Map<string, number>();
  for (const q of questions) bankByDomain.set(q.domain, (bankByDomain.get(q.domain) ?? 0) + 1);

  const domains: DomainMastery[] = config.domains.map((d) => {
    const tally = domainTally.get(d.id) ?? { answered: 0, correct: 0 };
    const accuracy = ratio(tally);
    const tier = masteryTier(tally.answered, accuracy);
    const questionsTotal = bankByDomain.get(d.id) ?? 0;
    const questionsSeen = domainSeen.get(d.id)?.size ?? 0;

    const nextTier = [...MASTERY_TIERS].reverse().find((t) => {
      const reached = tally.answered >= t.minAnswered && accuracy >= t.minAccuracy;
      return !reached;
    });

    return {
      domainId: d.id,
      domainName: d.name,
      answered: tally.answered,
      correct: tally.correct,
      accuracy,
      tier,
      questionsSeen,
      questionsTotal,
      coverage: questionsTotal > 0 ? questionsSeen / questionsTotal : 0,
      toNextTier:
        tier === "gold" || !nextTier
          ? null
          : {
              tier: nextTier.tier,
              answeredShort: Math.max(0, nextTier.minAnswered - tally.answered),
              accuracyShort: Math.max(0, nextTier.minAccuracy - accuracy),
            },
    };
  });

  const difficulties: DifficultyStat[] = DIFFICULTY_ORDER.map((difficulty) => {
    const tally = difficultyTally.get(difficulty) ?? { answered: 0, correct: 0 };
    return { difficulty, answered: tally.answered, correct: tally.correct, accuracy: ratio(tally) };
  });

  const domainNameById = new Map(config.domains.map((d) => [d.id, d.name] as const));
  const objectiveDomain = new Map<string, string>();
  for (const q of questions) if (!objectiveDomain.has(q.objective)) objectiveDomain.set(q.objective, q.domain);

  const objectives: ObjectiveStat[] = [...objectiveTally.entries()]
    .filter(([, t]) => t.answered >= MIN_ANSWERS_FOR_OBJECTIVE_RANKING)
    .map(([objective, t]) => {
      const domainId = objectiveDomain.get(objective) ?? "";
      return {
        objective,
        domainId,
        domainName: domainNameById.get(domainId) ?? domainId,
        answered: t.answered,
        correct: t.correct,
        accuracy: ratio(t),
      };
    });

  const byAccuracyAsc = [...objectives].sort(
    (a, b) => a.accuracy - b.accuracy || b.answered - a.answered || a.objective.localeCompare(b.objective)
  );

  // Streak: consecutive active days ending today, or ending yesterday if
  // nothing has been studied yet today — a day in progress must not read as
  // a broken streak.
  const today = dayKey(now);
  let cursor = activeDayKeys.has(today) ? today : addDays(today, -1);
  let currentStreakDays = 0;
  while (activeDayKeys.has(cursor)) {
    currentStreakDays += 1;
    cursor = addDays(cursor, -1);
  }

  const sortedDays = [...activeDayKeys].sort();
  let longestStreakDays = 0;
  let run = 0;
  let previousDay: string | null = null;
  for (const day of sortedDays) {
    run = previousDay && addDays(previousDay, 1) === day ? run + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, run);
    previousDay = day;
  }

  examTrend.sort((a, b) => a.finishedAt - b.finishedAt);
  const level = levelFromXp(xp);

  return {
    hasData: totalAnswered > 0,
    attempts: history.length,
    examAttempts,
    totalAnswered,
    totalCorrect,
    overallAccuracy: totalAnswered > 0 ? totalCorrect / totalAnswered : 0,
    totalStudySeconds,

    xp,
    level,
    xpIntoLevel: xp - xpForLevel(level),
    xpForNextLevel: xpForLevel(level + 1) - xpForLevel(level),

    currentStreakDays,
    longestStreakDays,
    studiedToday: activeDayKeys.has(today),
    activeDays: activeDayKeys.size,

    domains,
    difficulties,
    weakestObjectives: byAccuracyAsc.slice(0, 5),
    strongestObjectives: [...byAccuracyAsc].reverse().slice(0, 5),

    questionsSeen: seenQuestionIds.size,
    questionsTotal: questions.length,
    bankCoverage: questions.length > 0 ? seenQuestionIds.size / questions.length : 0,

    examTrend,
    bestExamScore: examTrend.length ? Math.max(...examTrend.map((p) => p.score)) : null,
    lastExamScore: examTrend.length ? examTrend[examTrend.length - 1]!.score : null,
    needsReviewCount: [...lastOutcome.values()].filter((o) => !o.correct).length,
  };
}
