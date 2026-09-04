import { beforeEach, describe, expect, it } from "vitest";
import { loadActiveAttempt } from "../engine/persistence";
import { createExamStore } from "../store/create-exam-store";
import { makeConfig, makeQuestion } from "./fixtures";

const CERT = "test-cert";
const questions = Array.from({ length: 5 }, (_, i) => makeQuestion({ id: `q${i}` }));
const config = makeConfig();

function freshStore() {
  const useStore = createExamStore(CERT);
  useStore.getState().start({
    mode: "full-exam",
    questionIds: questions.map((q) => q.id),
    timeLimitMinutes: 90,
  });
  return useStore;
}

beforeEach(() => {
  localStorage.clear();
});

describe("pausing and resuming", () => {
  it("remembers which card you were on, rather than starting over", () => {
    const store = freshStore();
    store.getState().goTo(3);
    store.getState().pause(1234);

    // Nothing in memory any more...
    expect(store.getState().attempt).toBeNull();
    expect(store.getState().currentIndex).toBe(0);

    // ...but still on disk, and resuming lands where it was paused.
    const resumed = createExamStore(CERT);
    expect(resumed.getState().hasResumableAttempt()).toBe(true);
    resumed.getState().resume();
    expect(resumed.getState().currentIndex).toBe(3);
    expect(resumed.getState().attempt?.questionIds).toHaveLength(5);
  });

  it("keeps the clock where it was left", () => {
    const store = freshStore();
    store.getState().pause(1234);
    const resumed = createExamStore(CERT);
    resumed.getState().resume();
    expect(resumed.getState().attempt?.remainingSeconds).toBe(1234);
  });

  it("keeps answers and flags across the pause", () => {
    const store = freshStore();
    store.getState().answer("q1", ["a"]);
    store.getState().toggleFlag("q2");
    store.getState().goTo(2);
    store.getState().pause(60);

    const resumed = createExamStore(CERT);
    resumed.getState().resume();
    const attempt = resumed.getState().attempt!;
    expect(attempt.answers["q1"]?.selected).toEqual(["a"]);
    expect(attempt.answers["q2"]?.flagged).toBe(true);
    expect(resumed.getState().currentIndex).toBe(2);
  });

  it("keeps the feedback mode it started under", () => {
    const store = createExamStore(CERT);
    store.getState().start({
      mode: "full-exam",
      questionIds: questions.map((q) => q.id),
      feedbackMode: "immediate",
    });
    store.getState().pause(null);

    const resumed = createExamStore(CERT);
    resumed.getState().resume();
    expect(resumed.getState().attempt?.feedbackMode).toBe("immediate");
  });

  it("pausing leaves the attempt resumable, unlike abandoning", () => {
    const paused = freshStore();
    paused.getState().pause(10);
    expect(loadActiveAttempt(CERT)).not.toBeNull();

    const abandoned = createExamStore(CERT);
    abandoned.getState().resume();
    abandoned.getState().abandon();
    expect(loadActiveAttempt(CERT)).toBeNull();
    expect(abandoned.getState().hasResumableAttempt()).toBe(false);
  });

  it("does nothing when there is no attempt to pause", () => {
    const store = createExamStore(CERT);
    expect(() => store.getState().pause(10)).not.toThrow();
    expect(loadActiveAttempt(CERT)).toBeNull();
  });

  it("clamps a resumed index that no longer fits the deck", () => {
    const store = freshStore();
    store.getState().goTo(4);
    store.getState().pause(null);

    // A shorter deck than the one that was saved.
    const saved = loadActiveAttempt(CERT)!;
    localStorage.setItem(
      `certdeck:${CERT}:active-attempt`,
      JSON.stringify({ ...saved, questionIds: ["q0", "q1"] })
    );

    const resumed = createExamStore(CERT);
    resumed.getState().resume();
    expect(resumed.getState().currentIndex).toBe(1);
  });

  it("finishing clears the attempt so nothing is left to resume", () => {
    const store = freshStore();
    store.getState().answer("q0", ["a"]);
    store.getState().finish(questions, config);
    expect(loadActiveAttempt(CERT)).toBeNull();
    expect(store.getState().hasResumableAttempt()).toBe(false);
  });
});

describe("navigation", () => {
  it("persists the index as you move, so a reload does not lose your place", () => {
    const store = freshStore();
    store.getState().next();
    store.getState().next();
    expect(loadActiveAttempt(CERT)?.currentIndex).toBe(2);
    store.getState().prev();
    expect(loadActiveAttempt(CERT)?.currentIndex).toBe(1);
  });

  it("stops at both ends of the deck", () => {
    const store = freshStore();
    store.getState().prev();
    expect(store.getState().currentIndex).toBe(0);
    for (let i = 0; i < 20; i++) store.getState().next();
    expect(store.getState().currentIndex).toBe(questions.length - 1);
  });
});
