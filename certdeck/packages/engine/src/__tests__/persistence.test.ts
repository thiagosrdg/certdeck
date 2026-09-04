import { beforeEach, describe, expect, it } from "vitest";
import {
  appendHistoryEntry,
  clearActiveAttempt,
  clearAllData,
  clearHistory,
  deleteHistoryEntry,
  loadActiveAttempt,
  loadHistory,
  loadSettings,
  saveActiveAttempt,
  saveSettings,
} from "../engine/persistence";
import type { Attempt } from "../types/attempt";
import type { AttemptResult } from "../types/results";
import { DEFAULT_SETTINGS } from "../types/settings";

function makeAttempt(certId: string, id: string): Attempt {
  return {
    id,
    certId,
    mode: "practice",
    status: "in-progress",
    questionIds: ["q1"],
    answers: {},
    startedAt: Date.now(),
    finishedAt: null,
    timeLimitMinutes: null,
    remainingSeconds: null,
    domainsFilter: null,
    usedFallback: false,
    feedbackMode: "deferred",
    currentIndex: 0,
  };
}

function makeResult(certId: string, attemptId: string): AttemptResult {
  return {
    attemptId,
    certId,
    mode: "practice",
    score: 1,
    correctCount: 1,
    totalCount: 1,
    passed: true,
    passThreshold: 0.7,
    timeTakenSeconds: 10,
    domainResults: [],
    weakestDomain: null,
    missedQuestionIds: [],
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("persistence namespacing", () => {
  it("keeps settings separate per certification", () => {
    saveSettings("cert-a", { ...DEFAULT_SETTINGS, theme: "dark" });
    saveSettings("cert-b", { ...DEFAULT_SETTINGS, theme: "light" });

    expect(loadSettings("cert-a").theme).toBe("dark");
    expect(loadSettings("cert-b").theme).toBe("light");
  });

  it("falls back to defaults when nothing is stored", () => {
    expect(loadSettings("cert-fresh")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps the active attempt separate per certification", () => {
    saveActiveAttempt("cert-a", makeAttempt("cert-a", "att-a"));
    saveActiveAttempt("cert-b", makeAttempt("cert-b", "att-b"));

    expect(loadActiveAttempt("cert-a")?.id).toBe("att-a");
    expect(loadActiveAttempt("cert-b")?.id).toBe("att-b");

    clearActiveAttempt("cert-a");
    expect(loadActiveAttempt("cert-a")).toBeNull();
    expect(loadActiveAttempt("cert-b")?.id).toBe("att-b");
  });

  it("keeps history separate per certification and supports delete/clear", () => {
    appendHistoryEntry("cert-a", { attempt: makeAttempt("cert-a", "att-1"), result: makeResult("cert-a", "att-1") });
    appendHistoryEntry("cert-a", { attempt: makeAttempt("cert-a", "att-2"), result: makeResult("cert-a", "att-2") });
    appendHistoryEntry("cert-b", { attempt: makeAttempt("cert-b", "att-3"), result: makeResult("cert-b", "att-3") });

    expect(loadHistory("cert-a")).toHaveLength(2);
    expect(loadHistory("cert-b")).toHaveLength(1);

    deleteHistoryEntry("cert-a", "att-1");
    expect(loadHistory("cert-a").map((e) => e.attempt.id)).toEqual(["att-2"]);
    expect(loadHistory("cert-b")).toHaveLength(1);

    clearHistory("cert-a");
    expect(loadHistory("cert-a")).toHaveLength(0);
    expect(loadHistory("cert-b")).toHaveLength(1);
  });

  it("clearAllData only touches the given certification", () => {
    saveSettings("cert-a", { ...DEFAULT_SETTINGS, theme: "dark" });
    saveActiveAttempt("cert-a", makeAttempt("cert-a", "att-a"));
    appendHistoryEntry("cert-a", { attempt: makeAttempt("cert-a", "att-a"), result: makeResult("cert-a", "att-a") });
    saveSettings("cert-b", { ...DEFAULT_SETTINGS, theme: "light" });

    clearAllData("cert-a");

    expect(loadSettings("cert-a")).toEqual(DEFAULT_SETTINGS);
    expect(loadActiveAttempt("cert-a")).toBeNull();
    expect(loadHistory("cert-a")).toHaveLength(0);
    expect(loadSettings("cert-b").theme).toBe("light");
  });
});
