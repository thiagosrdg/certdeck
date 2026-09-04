import { QuestionSchema, type Question } from "@certdeck/engine";

export interface QuestionLoadResult {
  questions: Question[];
  errors: string[];
}

/**
 * Loads every JSON file in ./questions via import.meta.glob, so adding a
 * new file never requires a code change. Every question is validated
 * against the shared Zod schema and against this app's own domain list —
 * a malformed file produces a visible error (see App.tsx), never a blank
 * screen.
 */
export function loadQuestions(knownDomainIds: ReadonlySet<string>): QuestionLoadResult {
  const modules = import.meta.glob("./questions/*.json", { eager: true }) as Record<string, unknown>;

  const questions: Question[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const [path, mod] of Object.entries(modules)) {
    const raw = (mod as { default?: unknown }).default ?? mod;
    const items = Array.isArray(raw) ? raw : [];

    if (!Array.isArray(raw)) {
      errors.push(`${path}: expected a JSON array of questions`);
      continue;
    }

    for (const [index, item] of items.entries()) {
      const parsed = QuestionSchema.safeParse(item);
      if (!parsed.success) {
        errors.push(`${path}[${index}]: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
        continue;
      }

      if (seenIds.has(parsed.data.id)) {
        errors.push(`${path}: duplicate question id "${parsed.data.id}"`);
        continue;
      }

      if (!knownDomainIds.has(parsed.data.domain)) {
        errors.push(`${path}: question "${parsed.data.id}" references unknown domain "${parsed.data.domain}"`);
        continue;
      }

      seenIds.add(parsed.data.id);
      questions.push(parsed.data);
    }
  }

  return { questions, errors };
}
