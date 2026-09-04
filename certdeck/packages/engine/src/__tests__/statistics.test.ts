import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "../engine/persistence";
import {
  computeStudyStats,
  levelFromXp,
  masteryTier,
  xpForLevel,
  XP_EXAM_PASS_BONUS,
  XP_PER_CORRECT,
} from "../engine/statistics";
import type { Attempt, ExamMode } from "../types/attempt";
import type { Question } from "../types/question";
import { makeConfig, makeQuestion } from "./fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A fixed local noon, so day-boundary maths never straddles midnight. */
const NOW = new Date(2026, 8, 4, 12, 0, 0).getTime();

function daysAgo(n: number): number {
  return NOW - n * DAY_MS;
}

/**
 * Builds a history entry. `answers` maps question id to the option ids the
 * user picked; a question left out of the map counts as skipped.
 */
function entry(options: {
  questions: Question[];
  answers: Record<string, string[]>;
  mode?: ExamMode;
  finishedAt?: number;
  passed?: boolean;
  timeTakenSeconds?: number;
  id?: string;
}): HistoryEntry {
  const {
    questions,
    answers,
    mode = "practice",
    finishedAt = daysAgo(0),
    passed = false,
    timeTakenSeconds = 60,
    id = `attempt-${finishedAt}-${mode}`,
  } = options;

  const attempt: Attempt = {
    id,
    certId: "test-cert",
    mode,
    status: "completed",
    questionIds: questions.map((q) => q.id),
    answers: Object.fromEntries(
      questions.map((q) => [
        q.id,
        { questionId: q.id, selected: answers[q.id] ?? [], flagged: false, answeredAt: finishedAt },
      ])
    ),
    startedAt: finishedAt - timeTakenSeconds * 1000,
    finishedAt,
    timeLimitMinutes: null,
    remainingSeconds: null,
    domainsFilter: null,
    usedFallback: false,
  };

  return {
    attempt,
    result: {
      attemptId: id,
      certId: "test-cert",
      mode,
      score: passed ? 1 : 0,
      correctCount: 0,
      totalCount: questions.length,
      passed,
      passThreshold: 0.75,
      timeTakenSeconds,
      domainResults: [],
      weakestDomain: null,
      missedQuestionIds: [],
    },
  };
}

const config = makeConfig();

/** Distinct questions in one domain, all single-answer with "a" correct. */
function bank(domain: string, count: number, difficulty: Question["difficulty"] = "easy"): Question[] {
  return Array.from({ length: count }, (_, i) =>
    makeQuestion({ id: `${domain}-q${i}`, domain, domainName: `Domain ${domain}`, difficulty })
  );
}

describe("level curve", () => {
  it("starts at level 1 with no XP and never returns level 0", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("widens: each level costs more than the last", () => {
    const costs = [2, 3, 4, 5].map((l) => xpForLevel(l) - xpForLevel(l - 1));
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(new Set(costs).size).toBe(costs.length);
  });

  it("agrees with its own inverse at every boundary", () => {
    for (let level = 1; level <= 12; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      expect(levelFromXp(xpForLevel(level + 1) - 1)).toBe(level);
    }
  });
});

describe("masteryTier", () => {
  it("withholds a tier until there is enough volume, however good the accuracy", () => {
    expect(masteryTier(5, 1)).toBe("unranked");
    expect(masteryTier(10, 1)).toBe("bronze");
    expect(masteryTier(20, 1)).toBe("silver");
    expect(masteryTier(30, 1)).toBe("gold");
  });

  it("withholds a tier on accuracy, however high the volume", () => {
    expect(masteryTier(500, 0.49)).toBe("unranked");
    expect(masteryTier(500, 0.5)).toBe("bronze");
    expect(masteryTier(500, 0.7)).toBe("silver");
    expect(masteryTier(500, 0.85)).toBe("gold");
  });
});

describe("computeStudyStats", () => {
  it("reports no data for an empty history rather than dividing by zero", () => {
    const stats = computeStudyStats([], bank("1.0", 3), config, NOW);
    expect(stats.hasData).toBe(false);
    expect(stats.overallAccuracy).toBe(0);
    expect(stats.level).toBe(1);
    expect(stats.currentStreakDays).toBe(0);
    expect(stats.bestExamScore).toBeNull();
    expect(stats.domains.every((d) => d.accuracy === 0 && d.tier === "unranked")).toBe(true);
  });

  it("ignores skipped questions instead of scoring them as wrong", () => {
    const qs = bank("1.0", 4);
    const stats = computeStudyStats(
      [entry({ questions: qs, answers: { "1.0-q0": ["a"], "1.0-q1": ["b"] } })],
      qs,
      config,
      NOW
    );
    // Two answered (one right, one wrong); two skipped and uncounted.
    expect(stats.totalAnswered).toBe(2);
    expect(stats.totalCorrect).toBe(1);
    expect(stats.overallAccuracy).toBe(0.5);
  });

  it("counts a question once per attempt it was answered in, but covers it once", () => {
    const qs = bank("1.0", 2);
    const answers = { "1.0-q0": ["a"], "1.0-q1": ["a"] };
    const stats = computeStudyStats(
      [
        entry({ questions: qs, answers, id: "a1", finishedAt: daysAgo(1) }),
        entry({ questions: qs, answers, id: "a2", finishedAt: daysAgo(0) }),
      ],
      qs,
      config,
      NOW
    );
    expect(stats.totalAnswered).toBe(4);
    expect(stats.questionsSeen).toBe(2);
    expect(stats.bankCoverage).toBe(1);
  });

  it("awards XP by difficulty, so hard questions are worth more than easy ones", () => {
    const easy = bank("1.0", 1, "easy");
    const hard = bank("2.0", 1, "hard");
    const xpOf = (qs: Question[]) =>
      computeStudyStats([entry({ questions: qs, answers: { [qs[0]!.id]: ["a"] } })], qs, config, NOW).xp;

    expect(xpOf(easy)).toBe(XP_PER_CORRECT.easy);
    expect(xpOf(hard)).toBe(XP_PER_CORRECT.hard);
    expect(xpOf(hard)).toBeGreaterThan(xpOf(easy));
  });

  it("awards no XP for a wrong answer", () => {
    const qs = bank("1.0", 1);
    const stats = computeStudyStats([entry({ questions: qs, answers: { "1.0-q0": ["b"] } })], qs, config, NOW);
    expect(stats.xp).toBe(0);
  });

  it("adds the pass bonus only for a passed full exam", () => {
    const qs = bank("1.0", 1);
    const answers = { "1.0-q0": ["a"] };
    const base = XP_PER_CORRECT.easy;

    const practice = computeStudyStats([entry({ questions: qs, answers, mode: "practice", passed: true })], qs, config, NOW);
    const failedExam = computeStudyStats([entry({ questions: qs, answers, mode: "full-exam", passed: false })], qs, config, NOW);
    const passedExam = computeStudyStats([entry({ questions: qs, answers, mode: "full-exam", passed: true })], qs, config, NOW);

    expect(practice.xp).toBe(base);
    expect(failedExam.xp).toBe(base);
    expect(passedExam.xp).toBe(base + XP_EXAM_PASS_BONUS);
  });

  it("tracks per-domain mastery and coverage independently", () => {
    const d1 = bank("1.0", 10);
    const d2 = bank("2.0", 4);
    const questions = [...d1, ...d2];
    const answers: Record<string, string[]> = {};
    for (const q of d1) answers[q.id] = ["a"]; // all correct
    answers["2.0-q0"] = ["b"]; // one wrong, rest skipped

    const stats = computeStudyStats([entry({ questions, answers })], questions, config, NOW);
    const one = stats.domains.find((d) => d.domainId === "1.0")!;
    const two = stats.domains.find((d) => d.domainId === "2.0")!;

    expect(one.answered).toBe(10);
    expect(one.accuracy).toBe(1);
    expect(one.tier).toBe("bronze"); // 10 answered clears bronze, not silver
    expect(one.coverage).toBe(1);

    expect(two.answered).toBe(1);
    expect(two.accuracy).toBe(0);
    expect(two.tier).toBe("unranked");
    expect(two.coverage).toBe(0.25);
  });

  it("says what the next tier still needs", () => {
    const qs = bank("1.0", 12);
    const answers = Object.fromEntries(qs.map((q, i) => [q.id, i < 9 ? ["a"] : ["b"]]));
    const stats = computeStudyStats([entry({ questions: qs, answers })], qs, config, NOW);
    const one = stats.domains.find((d) => d.domainId === "1.0")!;

    expect(one.tier).toBe("bronze");
    expect(one.toNextTier?.tier).toBe("silver");
    expect(one.toNextTier?.answeredShort).toBe(8); // 12 of the 20 silver needs
  });

  it("breaks accuracy down by difficulty", () => {
    const questions = [...bank("1.0", 2, "easy"), ...bank("2.0", 2, "hard")];
    const stats = computeStudyStats(
      [
        entry({
          questions,
          answers: { "1.0-q0": ["a"], "1.0-q1": ["a"], "2.0-q0": ["a"], "2.0-q1": ["b"] },
        }),
      ],
      questions,
      config,
      NOW
    );
    expect(stats.difficulties.find((d) => d.difficulty === "easy")!.accuracy).toBe(1);
    expect(stats.difficulties.find((d) => d.difficulty === "hard")!.accuracy).toBe(0.5);
    expect(stats.difficulties.find((d) => d.difficulty === "medium")!.answered).toBe(0);
  });

  it("ranks the weakest objectives first, ignoring ones with too few answers to judge", () => {
    const strong = Array.from({ length: 3 }, (_, i) =>
      makeQuestion({ id: `s${i}`, domain: "1.0", objective: "1.1" })
    );
    const weak = Array.from({ length: 3 }, (_, i) => makeQuestion({ id: `w${i}`, domain: "1.0", objective: "1.2" }));
    const barelySeen = [makeQuestion({ id: "x0", domain: "1.0", objective: "1.9" })];
    const questions = [...strong, ...weak, ...barelySeen];

    const answers: Record<string, string[]> = {};
    for (const q of strong) answers[q.id] = ["a"];
    for (const q of weak) answers[q.id] = ["b"];
    answers["x0"] = ["b"];

    const stats = computeStudyStats([entry({ questions, answers })], questions, config, NOW);
    expect(stats.weakestObjectives[0]?.objective).toBe("1.2");
    expect(stats.weakestObjectives.map((o) => o.objective)).not.toContain("1.9");
  });

  it("counts a question as needing review by its most recent outcome, not its worst", () => {
    const qs = bank("1.0", 1);
    const wrongThenRight = [
      entry({ questions: qs, answers: { "1.0-q0": ["b"] }, id: "old", finishedAt: daysAgo(3) }),
      entry({ questions: qs, answers: { "1.0-q0": ["a"] }, id: "new", finishedAt: daysAgo(1) }),
    ];
    expect(computeStudyStats(wrongThenRight, qs, config, NOW).needsReviewCount).toBe(0);

    const rightThenWrong = [
      entry({ questions: qs, answers: { "1.0-q0": ["a"] }, id: "old", finishedAt: daysAgo(3) }),
      entry({ questions: qs, answers: { "1.0-q0": ["b"] }, id: "new", finishedAt: daysAgo(1) }),
    ];
    expect(computeStudyStats(rightThenWrong, qs, config, NOW).needsReviewCount).toBe(1);
  });

  describe("streaks", () => {
    const qs = bank("1.0", 1);
    const on = (n: number) => entry({ questions: qs, answers: { "1.0-q0": ["a"] }, id: `d${n}`, finishedAt: daysAgo(n) });

    it("counts consecutive days ending today", () => {
      const stats = computeStudyStats([on(0), on(1), on(2)], qs, config, NOW);
      expect(stats.currentStreakDays).toBe(3);
      expect(stats.studiedToday).toBe(true);
    });

    it("keeps a streak alive on a day not yet studied", () => {
      // Studied yesterday and the day before, nothing yet today: the streak
      // is still running, it is just not extended.
      const stats = computeStudyStats([on(1), on(2)], qs, config, NOW);
      expect(stats.currentStreakDays).toBe(2);
      expect(stats.studiedToday).toBe(false);
    });

    it("breaks on a missed day", () => {
      const stats = computeStudyStats([on(0), on(1), on(3), on(4)], qs, config, NOW);
      expect(stats.currentStreakDays).toBe(2);
      expect(stats.longestStreakDays).toBe(2);
    });

    it("remembers the longest run even after it is broken", () => {
      const stats = computeStudyStats([on(0), on(5), on(6), on(7), on(8)], qs, config, NOW);
      expect(stats.currentStreakDays).toBe(1);
      expect(stats.longestStreakDays).toBe(4);
    });

    it("counts several sessions in one day as one active day", () => {
      const twice = [
        entry({ questions: qs, answers: { "1.0-q0": ["a"] }, id: "m", finishedAt: NOW - 3 * 60 * 60 * 1000 }),
        entry({ questions: qs, answers: { "1.0-q0": ["a"] }, id: "n", finishedAt: NOW - 60 * 60 * 1000 }),
      ];
      const stats = computeStudyStats(twice, qs, config, NOW);
      expect(stats.activeDays).toBe(1);
      expect(stats.currentStreakDays).toBe(1);
    });
  });

  it("orders the exam trend oldest first and reports best and last", () => {
    const qs = bank("1.0", 1);
    const exam = (n: number, passed: boolean) =>
      entry({ questions: qs, answers: { "1.0-q0": ["a"] }, mode: "full-exam", id: `e${n}`, finishedAt: daysAgo(n), passed });

    const stats = computeStudyStats([exam(0, true), exam(5, false)], qs, config, NOW);
    expect(stats.examTrend.map((p) => p.attemptId)).toEqual(["e5", "e0"]);
    expect(stats.examAttempts).toBe(2);
    expect(stats.lastExamScore).toBe(1);
    expect(stats.bestExamScore).toBe(1);
  });

  it("survives an attempt referencing a question that has left the bank", () => {
    const qs = bank("1.0", 1);
    const stale = entry({ questions: [...qs, makeQuestion({ id: "retired" })], answers: { "1.0-q0": ["a"], retired: ["a"] } });
    const stats = computeStudyStats([stale], qs, config, NOW);
    expect(stats.totalAnswered).toBe(1);
    expect(stats.questionsSeen).toBe(1);
  });
});
