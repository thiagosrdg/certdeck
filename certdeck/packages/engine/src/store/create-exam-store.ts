import { create } from "zustand";
import { clearActiveAttempt, loadActiveAttempt, saveActiveAttempt } from "../engine/persistence";
import { computeResults } from "../engine/scoring";
import type { Answer, Attempt, ExamMode } from "../types/attempt";
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
  return create<ExamStore>((set, get) => ({
    attempt: null,
    currentIndex: 0,

    hasResumableAttempt: () => loadActiveAttempt(certId)?.status === "in-progress",

    resume: () => {
      const saved = loadActiveAttempt(certId);
      if (saved && saved.status === "in-progress") {
        set({ attempt: saved, currentIndex: 0 });
      }
    },

    discardResumable: () => {
      clearActiveAttempt(certId);
    },

    start: ({ mode, questionIds, timeLimitMinutes = null, domainsFilter = null, usedFallback = false }) => {
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

    goTo: (index) => {
      const attempt = get().attempt;
      if (!attempt) return;
      set({ currentIndex: Math.max(0, Math.min(index, attempt.questionIds.length - 1)) });
    },

    next: () => {
      const { attempt, currentIndex } = get();
      if (!attempt) return;
      set({ currentIndex: Math.min(currentIndex + 1, attempt.questionIds.length - 1) });
    },

    prev: () => {
      set((state) => ({ currentIndex: Math.max(state.currentIndex - 1, 0) }));
    },

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
  }));
}
