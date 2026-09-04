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
  /**
   * The exam objectives this domain covers, as the certification numbers
   * them ("1.1", "1.2", ...). Defaulted to empty so an app that has not
   * listed them yet still parses; `npm run validate` checks question
   * objectives against this list whenever it is non-empty.
   */
  objectives: z.array(z.string().min(1)).default([]),
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
    for (const d of cfg.domains) {
      const stray = d.objectives.filter((o) => !o.startsWith(`${d.id.split(".")[0]}.`));
      if (stray.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Domain ${d.id} lists objectives from another domain: ${stray.join(", ")}`,
        });
      }
      if (new Set(d.objectives).size !== d.objectives.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Domain ${d.id} lists a duplicate objective` });
      }
    }

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
