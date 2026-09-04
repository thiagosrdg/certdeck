import type { CertConfig, Question } from "../types";

export function makeConfig(overrides: Partial<CertConfig> = {}): CertConfig {
  return {
    id: "test-cert",
    appName: "TestApp",
    certName: "Test Certification",
    examCode: "T00-000",
    questionsPerExam: 10,
    timeLimitMinutes: 30,
    passThreshold: 0.7,
    accentHue: "#123456",
    domains: [
      { id: "1.0", name: "Domain One", weight: 0.5, count: 5, hue: "#111111", icon: "node" },
      { id: "2.0", name: "Domain Two", weight: 0.3, count: 3, hue: "#222222", icon: "link" },
      { id: "3.0", name: "Domain Three", weight: 0.2, count: 2, hue: "#333333", icon: "wave" },
    ],
    ...overrides,
  };
}

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q-default",
    domain: "1.0",
    domainName: "Domain One",
    objective: "1.1",
    type: "single",
    difficulty: "easy",
    stem: "Stem",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ],
    correct: ["a"],
    explanation: "because",
    distractorExplanations: { b: "no", c: "no" },
    tags: [],
    ...overrides,
  };
}

export function makeBank(config: CertConfig, perDomainCount: number): Question[] {
  const questions: Question[] = [];
  for (const d of config.domains) {
    for (let i = 0; i < perDomainCount; i++) {
      questions.push(makeQuestion({ id: `${d.id}-${i}`, domain: d.id, domainName: d.name }));
    }
  }
  return questions;
}
