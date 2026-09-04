import { z } from "zod";

export const ExamModeSchema = z.enum(["full-exam", "practice", "random"]);
export type ExamMode = z.infer<typeof ExamModeSchema>;

export const AnswerSchema = z.object({
  questionId: z.string(),
  selected: z.array(z.string()).default([]),
  flagged: z.boolean().default(false),
  /** epoch ms the answer was (last) submitted; null while unanswered */
  answeredAt: z.number().nullable().default(null),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const AttemptStatusSchema = z.enum(["in-progress", "completed", "abandoned"]);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

/**
 * A single run through a deck: a full exam, a practice session, or a
 * random-question drill. Persisted so an in-progress attempt survives a
 * reload (resume) and a completed one becomes history.
 */
export const AttemptSchema = z.object({
  id: z.string(),
  certId: z.string(),
  mode: ExamModeSchema,
  status: AttemptStatusSchema,
  questionIds: z.array(z.string()),
  answers: z.record(z.string(), AnswerSchema),
  startedAt: z.number(),
  finishedAt: z.number().nullable().default(null),
  timeLimitMinutes: z.number().nullable().default(null),
  remainingSeconds: z.number().nullable().default(null),
  /** domains selected for a practice session; null for full-exam/random */
  domainsFilter: z.array(z.string()).nullable().default(null),
  /** true when the exam generator had to backfill from other domains */
  usedFallback: z.boolean().default(false),
});
export type Attempt = z.infer<typeof AttemptSchema>;
