import { describe, expect, it } from "vitest";
import { CertConfigSchema } from "../types/cert-config";
import { QuestionSchema } from "../types/question";
import { makeConfig, makeQuestion } from "./fixtures";

/**
 * Questions and configs are data, so the schemas are the only thing standing
 * between a typo in a JSON file and a broken exam. These tests pin the
 * refinements that a type signature cannot express — a schema that silently
 * started accepting malformed data would still typecheck and still build.
 */

/** Builds an otherwise-valid question with one field deliberately broken. */
function brokenQuestion(overrides: Record<string, unknown>): unknown {
  return { ...makeQuestion(), ...overrides };
}

function messagesFor(input: unknown): string {
  const result = QuestionSchema.safeParse(input);
  return result.success ? "" : result.error.issues.map((i) => i.message).join(" | ");
}

describe("QuestionSchema", () => {
  it("accepts a well-formed question", () => {
    expect(QuestionSchema.safeParse(makeQuestion()).success).toBe(true);
  });

  it("defaults tags to an empty array so question files may omit them", () => {
    const { tags: _omitted, ...withoutTags } = makeQuestion();
    const result = QuestionSchema.safeParse(withoutTags);
    expect(result.success).toBe(true);
    expect(result.success && result.data.tags).toEqual([]);
  });

  it("rejects duplicate option ids", () => {
    const input = brokenQuestion({
      options: [
        { id: "a", text: "A" },
        { id: "a", text: "Also A" },
      ],
      correct: ["a"],
      distractorExplanations: {},
    });
    expect(messagesFor(input)).toContain("duplicate option ids");
  });

  it("rejects a correct id that is not one of the options", () => {
    expect(messagesFor(brokenQuestion({ correct: ["zz"] }))).toContain("not one of its options");
  });

  it("rejects a single-answer question with more than one correct answer", () => {
    const input = brokenQuestion({ type: "single", correct: ["a", "b"] });
    expect(messagesFor(input)).toContain('is type "single"');
  });

  it("rejects a multiple-answer question with fewer than two correct answers", () => {
    const input = brokenQuestion({ type: "multiple", correct: ["a"] });
    expect(messagesFor(input)).toContain('is type "multiple"');
  });

  it("requires a distractor explanation for every incorrect option", () => {
    const input = brokenQuestion({ distractorExplanations: { b: "no" } });
    expect(messagesFor(input)).toContain('missing a distractor explanation for option "c"');
  });

  it("rejects an empty stem, explanation or id rather than rendering a blank card", () => {
    expect(QuestionSchema.safeParse(brokenQuestion({ stem: "" })).success).toBe(false);
    expect(QuestionSchema.safeParse(brokenQuestion({ explanation: "" })).success).toBe(false);
    expect(QuestionSchema.safeParse(brokenQuestion({ id: "" })).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const { stem: _omitted, ...withoutStem } = makeQuestion();
    expect(QuestionSchema.safeParse(withoutStem).success).toBe(false);
  });

  it("rejects unknown difficulty and type values", () => {
    expect(QuestionSchema.safeParse(brokenQuestion({ difficulty: "trivial" })).success).toBe(false);
    expect(QuestionSchema.safeParse(brokenQuestion({ type: "essay" })).success).toBe(false);
  });
});

describe("CertConfigSchema", () => {
  it("accepts a well-formed config", () => {
    expect(CertConfigSchema.safeParse(makeConfig()).success).toBe(true);
  });

  it("rejects domain counts that do not sum to questionsPerExam", () => {
    const config = makeConfig();
    const input = {
      ...config,
      domains: config.domains.map((d, i) => (i === 0 ? { ...d, count: d.count + 1 } : d)),
    };
    const result = CertConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues.map((i) => i.message).join(" | ")).toContain(
      "expected questionsPerExam"
    );
  });

  it("rejects duplicate domain ids", () => {
    const config = makeConfig();
    const input = {
      ...config,
      domains: config.domains.map((d) => ({ ...d, id: "1.0" })),
    };
    const result = CertConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues.map((i) => i.message).join(" | ")).toContain(
      "must be unique"
    );
  });
});
