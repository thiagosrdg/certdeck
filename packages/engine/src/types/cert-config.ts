import { z } from "zod";

/**
 * A domain is a "suit" in the card-game metaphor. `hue` is a CSS colour
 * value the app supplies (see docs/design.md); `icon` names one of the
 * fixed inline-SVG icons the engine ships (see ui/SuitIcon.tsx). The engine
 * never hardcodes which icon or hue belongs to which domain — that is
 * entirely app data.
 */
export const DomainConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  count: z.number().int().positive(),
  hue: z.string().min(1),
  icon: z.string().min(1),
});
export type DomainConfig = z.infer<typeof DomainConfigSchema>;

/**
 * The contract every certification app must satisfy. Nothing in this type
 * or in packages/engine may reference a specific certification, exam code,
 * or domain name.
 */
export const CertConfigSchema = z
  .object({
    id: z.string().min(1),
    appName: z.string().min(1),
    certName: z.string().min(1),
    examCode: z.string().min(1),
    questionsPerExam: z.number().int().positive(),
    timeLimitMinutes: z.number().int().positive(),
    passThreshold: z.number().min(0).max(1),
    accentHue: z.string().min(1),
    domains: z.array(DomainConfigSchema).min(1),
  })
  .superRefine((cfg, ctx) => {
    const total = cfg.domains.reduce((sum, d) => sum + d.count, 0);
    if (total !== cfg.questionsPerExam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Domain counts sum to ${total}, expected questionsPerExam (${cfg.questionsPerExam})`,
      });
    }

    const ids = new Set(cfg.domains.map((d) => d.id));
    if (ids.size !== cfg.domains.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Domain ids must be unique within a certification",
      });
    }
  });

export type CertConfig = z.infer<typeof CertConfigSchema>;
