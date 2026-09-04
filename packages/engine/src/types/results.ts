import { z } from "zod";
import { ExamModeSchema } from "./attempt";

export const DomainResultSchema = z.object({
  domainId: z.string(),
  domainName: z.string(),
  total: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  /** 0..1 */
  percentage: z.number().min(0).max(1),
});
export type DomainResult = z.infer<typeof DomainResultSchema>;

export const AttemptResultSchema = z.object({
  attemptId: z.string(),
  certId: z.string(),
  mode: ExamModeSchema,
  /** 0..1 */
  score: z.number().min(0).max(1),
  correctCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  passed: z.boolean(),
  passThreshold: z.number().min(0).max(1),
  timeTakenSeconds: z.number().int().nonnegative(),
  domainResults: z.array(DomainResultSchema),
  weakestDomain: DomainResultSchema.nullable(),
  missedQuestionIds: z.array(z.string()),
});
export type AttemptResult = z.infer<typeof AttemptResultSchema>;
