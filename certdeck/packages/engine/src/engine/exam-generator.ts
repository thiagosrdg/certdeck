import type { CertConfig, DomainConfig } from "../types/cert-config";
import type { Question } from "../types/question";
import { shuffle, type RNG } from "../utils/random";

export interface ExamGenerationResult {
  questionIds: string[];
  /** true when at least one domain had too few questions and was backfilled */
  usedFallback: boolean;
  warnings: string[];
}

export interface GenerateExamOptions {
  /** restrict to these domain ids (practice mode); omit/empty for all domains */
  domainsFilter?: string[] | null;
  /** total question count; omit to use the config's full-exam distribution */
  count?: number;
  rng?: RNG;
}

/**
 * Draws a question set from `bank` following `config`'s domain
 * distribution. With no options, this reproduces the official full-exam
 * distribution (each domain's exact `count`). With a domain filter and/or a
 * custom count (practice mode), each selected domain's share is its weight
 * renormalised across the selected domains, rounded by largest remainder so
 * the total always matches exactly.
 *
 * If a domain doesn't have enough questions, the shortfall is backfilled
 * from the remaining domains (in config order, wrapping) so the requested
 * total is still met whenever the bank has enough questions overall.
 * `usedFallback` and `warnings` surface this so the UI can tell the user.
 */
export function generateExam(
  config: CertConfig,
  bank: readonly Question[],
  options: GenerateExamOptions = {}
): ExamGenerationResult {
  const rng = options.rng ?? Math.random;
  const isFullExamDefault = !options.domainsFilter && options.count === undefined;

  const domains =
    options.domainsFilter && options.domainsFilter.length > 0
      ? config.domains.filter((d) => options.domainsFilter!.includes(d.id))
      : config.domains;

  if (domains.length === 0) {
    return { questionIds: [], usedFallback: false, warnings: ["No domains selected."] };
  }

  const targetCount =
    options.count ?? (isFullExamDefault ? config.questionsPerExam : domains.reduce((sum, d) => sum + d.count, 0));

  const perDomainTarget = isFullExamDefault
    ? new Map(domains.map((d) => [d.id, d.count] as const))
    : distributeByWeight(domains, targetCount);

  const poolByDomain = new Map<string, Question[]>();
  for (const d of domains) {
    poolByDomain.set(
      d.id,
      shuffle(
        bank.filter((q) => q.domain === d.id),
        rng
      )
    );
  }

  const warnings: string[] = [];
  let usedFallback = false;
  const selected: Question[] = [];

  for (const d of domains) {
    const pool = poolByDomain.get(d.id) ?? [];
    const want = perDomainTarget.get(d.id) ?? 0;
    const take = pool.slice(0, want);
    selected.push(...take);
    poolByDomain.set(d.id, pool.slice(want));

    if (take.length < want) {
      usedFallback = true;
      warnings.push(
        `Domain "${d.name}" only has ${take.length} of the ${want} questions needed for this session; backfilling from other domains.`
      );
    }
  }

  let shortfall = targetCount - selected.length;
  if (shortfall > 0) {
    const selectedIds = new Set(selected.map((q) => q.id));
    let guard = 0;
    while (shortfall > 0 && guard < domains.length * 1000) {
      guard++;
      let tookAny = false;
      for (const d of domains) {
        if (shortfall <= 0) break;
        const leftover = poolByDomain.get(d.id) ?? [];
        const next = leftover.find((q) => !selectedIds.has(q.id));
        if (next) {
          selected.push(next);
          selectedIds.add(next.id);
          poolByDomain.set(
            d.id,
            leftover.filter((q) => q.id !== next.id)
          );
          shortfall--;
          tookAny = true;
        }
      }
      if (!tookAny) break;
    }
  }

  if (shortfall > 0) {
    warnings.push(
      `The question bank only has ${selected.length} of the ${targetCount} questions requested across the selected domains.`
    );
  }

  return {
    questionIds: shuffle(selected, rng).map((q) => q.id),
    usedFallback,
    warnings,
  };
}

function distributeByWeight(domains: readonly DomainConfig[], targetCount: number): Map<string, number> {
  const totalWeight = domains.reduce((sum, d) => sum + d.weight, 0) || domains.length;
  const shares = domains.map((d) => {
    const exact = (d.weight || 1 / domains.length) * (totalWeight ? targetCount / totalWeight : 0);
    const floor = Math.floor(exact);
    return { id: d.id, floor, frac: exact - floor };
  });

  const result = new Map<string, number>(shares.map((s) => [s.id, s.floor]));
  let assigned = shares.reduce((sum, s) => sum + s.floor, 0);
  let remainder = targetCount - assigned;

  const byFrac = [...shares].sort((a, b) => b.frac - a.frac);
  for (let i = 0; remainder > 0 && byFrac.length > 0; i++, remainder--) {
    const target = byFrac[i % byFrac.length]!;
    result.set(target.id, (result.get(target.id) ?? 0) + 1);
  }

  return result;
}
