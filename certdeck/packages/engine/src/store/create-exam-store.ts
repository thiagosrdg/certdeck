import { create } from "zustand";
import { clearActiveAttempt, loadActiveAttempt, saveActiveAttempt } from "../engine/persistence";
import { computeResults } from "../engine/scoring";
import type { Answer, Attempt, ExamMode, FeedbackMode } from "../types/attempt";
import type { CertConfig } from "../types/cert-config";
import type { Question } from "../types/question";
import type { AttemptResult } from "../types/results";
import { createId } from "../utils/id";

export interface StartAttemptInput {
  mode: ExamMode;
  questionIds: string[];
  timeLimitMinutes?: number | null;
  domainsFilter?: string[] | null;
  usedFallback?: boolean;
  feedbackMode?: FeedbackMode;
}

export interface FinishedAttempt {
  attempt: Attempt;
  result: AttemptResult;
}

export interface ExamStore {
  attempt: Attempt | null;
  currentIndex: number;

  hasResumableAttempt: () => boolean;
  resume: () => void;
  discardResumable: () => void;

  start: (input: StartAttemptInput) => void;
  answer: (questionId: string, selected: string[]) => void;
  toggleFlag: (questionId: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  tick: (remainingSeconds: number) => void;
  /** Leave the attempt in storage, resumable, and clear it from memory. */
  pause: (remainingSeconds?: number | null) => void;
  finish: (questions: readonly Question[], config: CertConfig) => FinishedAttempt;
  abandon: () => void;
}

function emptyAnswer(questionId: string): Answer {
  return { questionId, selected: [], flagged: false, answeredAt: null };
}

/**
 * The active-session state machine: one attempt in flight, persisted after
 * every mutation so a reload can resume it (including remaining time).
 * Content (questions, config) is never stored here — callers pass it into
 * `finish`, keeping this store certification-agnostic.
 */
export function createExamStore(certId: string) {
  return create<ExamStore>((set, get) => {
    /**
     * Moving between cards writes through to the persisted attempt, so a
     * paused exam knows where it was. Clamped here in one place rather than
     * in each caller.
     */
    function moveTo(index: number): void {
      const attempt = get().attempt;
      if (!attempt) return;
      const currentIndex = Math.max(0, Math.min(index, attempt.questionIds.length - 1));
      if (currentIndex === attempt.currentIndex && currentIndex === get().currentIndex) return;
      const next: Attempt = { ...attempt, currentIndex };
      saveActiveAttempt(certId, next);
      set({ attempt: next, currentIndex });
    }

    return {
    attempt: null,
    currentIndex: 0,

    hasResumableAttempt: () => loadActiveAttempt(certId)?.status === "in-progress",

    resume: () => {
      const saved = loadActiveAttempt(certId);
      if (saved && saved.status === "in-progress") {
        // Back to the card it was paused on, not to the start.
        set({ attempt: saved, currentIndex: Math.min(saved.currentIndex, Math.max(0, saved.questionIds.length - 1)) });
      }
    },

    discardResumable: () => {
      clearActiveAttempt(certId);
    },

    start: ({ mode, questionIds, timeLimitMinutes = null, domainsFilter = null, usedFallback = false, feedbackMode = "deferred" }) => {
      const answers: Record<string, Answer> = {};
      for (const id of questionIds) answers[id] = emptyAnswer(id);

      const attempt: Attempt = {
        id: createId("attempt"),
        certId,
        mode,
        status: "in-progress",
        questionIds,
        answers,
        startedAt: Date.now(),
        finishedAt: null,
        timeLimitMinutes,
        remainingSeconds: timeLimitMinutes != null ? timeLimitMinutes * 60 : null,
        domainsFilter,
        usedFallback,
        feedbackMode,
        currentIndex: 0,
      };

      saveActiveAttempt(certId, attempt);
      set({ attempt, currentIndex: 0 });
    },

    answer: (questionId, selected) => {
      const attempt = get().attempt;
      if (!attempt) return;

      const next: Attempt = {
        ...attempt,
        answers: {
          ...attempt.answers,
          [questionId]: { ...(attempt.answers[questionId] ?? emptyAnswer(questionId)), selected, answeredAt: Date.now() },
        },
      };
      saveActiveAttempt(certId, next);
      set({ attempt: next });
    },

    toggleFlag: (questionId) => {
      const attempt = get().attempt;
      if (!attempt) return;

      const existing = attempt.answers[questionId] ?? emptyAnswer(questionId);
      const next: Attempt = {
        ...attempt,
        answers: { ...attempt.answers, [questionId]: { ...existing, flagged: !existing.flagged } },
      };
      saveActiveAttempt(certId, next);
      set({ attempt: next });
    },

    goTo: (index) => moveTo(index),
    next: () => moveTo(get().currentIndex + 1),
    prev: () => moveTo(get().currentIndex - 1),

    tick: (remainingSeconds) => {
      const attempt = get().attempt;
      if (!attempt) return;
      const next: Attempt = { ...attempt, remainingSeconds };
      saveActiveAttempt(certId, next);
      set({ attempt: next });
    },

    finish: (questions, config) => {
      const attempt = get().attempt;
      if (!attempt) throw new Error("No active attempt to finish");

      const finished: Attempt = { ...attempt, status: "completed", finishedAt: Date.now() };
      const result = computeResults(finished, questions, config);

      clearActiveAttempt(certId);
      set({ attempt: null, currentIndex: 0 });

      return { attempt: finished, result };
    },

    abandon: () => {
      clearActiveAttempt(certId);
      set({ attempt: null, currentIndex: 0 });
    },

    /**
     * Step away without ending anything: the attempt stays in storage as
     * in-progress, so `hasResumableAttempt` still finds it. Flushes the
     * clock first, because the ticker stops the moment the exam screen
     * unmounts and the last tick may be up to a second stale.
     */
    pause: (remainingSeconds) => {
      const attempt = get().attempt;
      if (!attempt) return;
      const next: Attempt =
        remainingSeconds == null ? attempt : { ...attempt, remainingSeconds };
      saveActiveAttempt(certId, next);
      set({ attempt: null, currentIndex: 0 });
    },
    };
  });
}
