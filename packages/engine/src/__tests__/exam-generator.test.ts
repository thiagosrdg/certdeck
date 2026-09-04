import { describe, expect, it } from "vitest";
import { generateExam } from "../engine/exam-generator";
import { mulberry32 } from "../utils/random";
import { makeBank, makeConfig } from "./fixtures";

describe("generateExam", () => {
  it("draws the exact official per-domain counts for a full exam", () => {
    const config = makeConfig();
    const bank = makeBank(config, 20);
    const result = generateExam(config, bank, { rng: mulberry32(1) });

    expect(result.usedFallback).toBe(false);
    expect(result.questionIds).toHaveLength(10);

    const byDomain = new Map<string, number>();
    for (const id of result.questionIds) {
      const domain = id.split("-")[0]!;
      byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
    }
    expect(byDomain.get("1.0")).toBe(5);
    expect(byDomain.get("2.0")).toBe(3);
    expect(byDomain.get("3.0")).toBe(2);
  });

  it("never returns duplicate questions", () => {
    const config = makeConfig();
    const bank = makeBank(config, 20);
    const result = generateExam(config, bank, { rng: mulberry32(42) });
    expect(new Set(result.questionIds).size).toBe(result.questionIds.length);
  });

  it("backfills from other domains when one domain is short, and warns about it", () => {
    const config = makeConfig();
    const bank = [...makeBank(config, 20).filter((q) => q.domain !== "1.0"), ...makeBank(config, 2).filter((q) => q.domain === "1.0")];

    const result = generateExam(config, bank, { rng: mulberry32(7) });

    expect(result.questionIds).toHaveLength(10);
    expect(result.usedFallback).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("restricts to the requested domains and honours a custom count for practice mode", () => {
    const config = makeConfig();
    const bank = makeBank(config, 20);
    const result = generateExam(config, bank, { domainsFilter: ["1.0", "2.0"], count: 8, rng: mulberry32(3) });

    expect(result.questionIds).toHaveLength(8);
    for (const id of result.questionIds) {
      expect(id.startsWith("3.0")).toBe(false);
    }
  });

  it("is deterministic for a given seed", () => {
    const config = makeConfig();
    const bank = makeBank(config, 20);
    const a = generateExam(config, bank, { rng: mulberry32(99) });
    const b = generateExam(config, bank, { rng: mulberry32(99) });
    expect(a.questionIds).toEqual(b.questionIds);
  });
});
