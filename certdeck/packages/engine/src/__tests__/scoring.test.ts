import { describe, expect, it } from "vitest";
import { computeResults, isAnswerCorrect } from "../engine/scoring";
import type { Attempt } from "../types/attempt";
import { makeBank, makeConfig, makeQuestion } from "./fixtures";

describe("isAnswerCorrect", () => {
  it("matches a single-answer question exactly", () => {
    const q = makeQuestion({ type: "single", correct: ["a"] });
    expect(isAnswerCorrect(q, ["a"])).toBe(true);
    expect(isAnswerCorrect(q, ["b"])).toBe(false);
  });

  it("requires the exact set for a multiple-answer question — no partial credit", () => {
    const q = makeQuestion({
      type: "multiple",
      correct: ["a", "b"],
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      distractorExplanations: { c: "no" },
    });
    expect(isAnswerCorrect(q, ["a", "b"])).toBe(true);
    expect(isAnswerCorrect(q, ["b", "a"])).toBe(true);
    expect(isAnswerCorrect(q, ["a"])).toBe(false);
    expect(isAnswerCorrect(q, ["a", "b", "c"])).toBe(false);
  });
});

describe("computeResults", () => {
  it("scores an attempt with a per-domain breakdown and calls out the weakest domain", () => {
    const config = makeConfig();
    const bank = makeBank(config, 1);

    const attempt: Attempt = {
      id: "a1",
      certId: config.id,
      mode: "practice",
      status: "completed",
      questionIds: bank.map((q) => q.id),
      answers: {
        "1.0-0": { questionId: "1.0-0", selected: ["a"], flagged: false, answeredAt: 1 },
        "2.0-0": { questionId: "2.0-0", selected: ["b"], flagged: false, answeredAt: 2 },
        "3.0-0": { questionId: "3.0-0", selected: ["a"], flagged: false, answeredAt: 3 },
      },
      startedAt: 0,
      finishedAt: 10_000,
      timeLimitMinutes: null,
      remainingSeconds: null,
      domainsFilter: null,
      usedFallback: false,
    feedbackMode: "deferred",
    currentIndex: 0,
    };

    const result = computeResults(attempt, bank, config);

    expect(result.correctCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.missedQuestionIds).toEqual(["2.0-0"]);
    expect(result.weakestDomain?.domainId).toBe("2.0");
    expect(result.timeTakenSeconds).toBe(10);
  });

  it("respects the config pass threshold", () => {
    const config = makeConfig({ passThreshold: 0.5 });
    const bank = makeBank(config, 1);
    const attempt: Attempt = {
      id: "a2",
      certId: config.id,
      mode: "full-exam",
      status: "completed",
      questionIds: bank.map((q) => q.id),
      answers: Object.fromEntries(
        bank.map((q) => [q.id, { questionId: q.id, selected: ["a"], flagged: false, answeredAt: 1 }])
      ),
      startedAt: 0,
      finishedAt: 1000,
      timeLimitMinutes: null,
      remainingSeconds: null,
      domainsFilter: null,
      usedFallback: false,
    feedbackMode: "deferred",
    currentIndex: 0,
    };

    const result = computeResults(attempt, bank, config);
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
  });
});
