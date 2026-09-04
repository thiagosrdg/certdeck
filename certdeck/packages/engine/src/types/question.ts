import { z } from "zod";

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuestionTypeSchema = z.enum(["single", "multiple"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const OptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type Option = z.infer<typeof OptionSchema>;

/**
 * A question is certification-agnostic data. Nothing here may assume a
 * particular exam — `domain` is validated against the app's own
 * CertConfig at load time, not against any hardcoded list.
 */
export const QuestionSchema = z
  .object({
    id: z.string().min(1),
    domain: z.string().min(1),
    domainName: z.string().min(1),
    objective: z.string().min(1),
    type: QuestionTypeSchema,
    difficulty: DifficultySchema,
    stem: z.string().min(1),
    options: z.array(OptionSchema).min(2),
    correct: z.array(z.string().min(1)).min(1),
    explanation: z.string().min(1),
    distractorExplanations: z.record(z.string(), z.string().min(1)),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((q, ctx) => {
    const optionIds = new Set(q.options.map((o) => o.id));

    if (optionIds.size !== q.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question "${q.id}" has duplicate option ids`,
      });
    }

    for (const id of q.correct) {
      if (!optionIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question "${q.id}" lists correct id "${id}" which is not one of its options`,
        });
      }
    }

    if (q.type === "single" && q.correct.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question "${q.id}" is type "single" but has ${q.correct.length} correct answers`,
      });
    }

    if (q.type === "multiple" && q.correct.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question "${q.id}" is type "multiple" but has fewer than 2 correct answers`,
      });
    }

    const correctSet = new Set(q.correct);
    for (const opt of q.options) {
      if (!correctSet.has(opt.id) && !(opt.id in q.distractorExplanations)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question "${q.id}" is missing a distractor explanation for option "${opt.id}"`,
        });
      }
    }
  });

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionBankSchema = z.array(QuestionSchema);
