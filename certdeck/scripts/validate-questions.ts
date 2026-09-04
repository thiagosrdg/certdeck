#!/usr/bin/env tsx
/**
 * Validates every question file in every app: schema validity, id
 * uniqueness within a certification, complete distractor explanations
 * (enforced by the schema itself), that every `domain` and `objective`
 * exists in that app's config, and per-domain counts against the config.
 * Run via
 * `npm run validate`; also wired into the pre-commit hook.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CertConfigSchema, QuestionSchema } from "@certdeck/engine";

const rootDir = process.cwd();
const appsDir = path.join(rootDir, "apps");

async function main() {
  const appNames = readdirSync(appsDir).filter((name) => existsSync(path.join(appsDir, name, "src", "cert.config.ts")));

  if (appNames.length === 0) {
    console.error(`No apps with a src/cert.config.ts found under ${appsDir}`);
    process.exit(1);
  }

  let hasErrors = false;

  for (const appName of appNames) {
    console.log(`\n== ${appName} ==`);
    const ok = await validateApp(appName);
    hasErrors = hasErrors || !ok;
  }

  if (hasErrors) {
    console.error("\nValidation failed.\n");
    process.exit(1);
  }

  console.log("\nAll question data is valid.\n");
}

async function validateApp(appName: string): Promise<boolean> {
  const appDir = path.join(appsDir, appName);
  const configPath = path.join(appDir, "src", "cert.config.ts");
  const questionsDir = path.join(appDir, "src", "data", "questions");

  let ok = true;

  const configModule = (await import(pathToFileURL(configPath).href)) as { certConfig?: unknown };
  const configResult = CertConfigSchema.safeParse(configModule.certConfig);
  if (!configResult.success) {
    console.error("  cert.config.ts is invalid:");
    for (const issue of configResult.error.issues) console.error(`    - ${issue.message}`);
    return false;
  }
  const certConfig = configResult.data;

  if (!existsSync(questionsDir)) {
    console.error(`  No questions directory found at ${questionsDir}`);
    return false;
  }

  const domainIds = new Set(certConfig.domains.map((d) => d.id));
  // A domain that lists no objectives opts out of the objective check.
  const objectivesByDomain = new Map(
    certConfig.domains.filter((d) => d.objectives.length > 0).map((d) => [d.id, new Set(d.objectives)])
  );
  const seenIds = new Set<string>();
  const perDomainCount = new Map<string, number>();

  const files = readdirSync(questionsDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`  No .json question files found in ${questionsDir}`);
    return false;
  }

  let questionCount = 0;

  for (const file of files) {
    const filePath = path.join(questionsDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (err) {
      console.error(`  ${file}: invalid JSON (${(err as Error).message})`);
      ok = false;
      continue;
    }

    if (!Array.isArray(raw)) {
      console.error(`  ${file}: expected a JSON array of questions`);
      ok = false;
      continue;
    }

    raw.forEach((item, index) => {
      const result = QuestionSchema.safeParse(item);
      if (!result.success) {
        ok = false;
        console.error(`  ${file}[${index}]: ${result.error.issues.map((i) => i.message).join("; ")}`);
        return;
      }

      const q = result.data;

      if (seenIds.has(q.id)) {
        ok = false;
        console.error(`  ${file}: duplicate question id "${q.id}"`);
        return;
      }
      seenIds.add(q.id);
      questionCount++;

      const allowedObjectives = objectivesByDomain.get(q.domain);
      if (allowedObjectives && !allowedObjectives.has(q.objective)) {
        ok = false;
        console.error(
          `  ${file}: question "${q.id}" references objective "${q.objective}", which domain ${q.domain} does not list ` +
            `(valid: ${[...allowedObjectives].join(", ")})`
        );
      }

      if (!domainIds.has(q.domain)) {
        ok = false;
        console.error(`  ${file}: question "${q.id}" references unknown domain "${q.domain}"`);
        return;
      }
      perDomainCount.set(q.domain, (perDomainCount.get(q.domain) ?? 0) + 1);
    });
  }

  console.log(`  ${files.length} file(s), ${questionCount} question(s)`);
  for (const domain of certConfig.domains) {
    const have = perDomainCount.get(domain.id) ?? 0;
    const enough = have >= domain.count;
    console.log(`  ${enough ? "✓" : "⚠"} ${domain.id} ${domain.name}: ${have} question(s) (a full exam draws ${domain.count})`);
    if (!enough) {
      console.warn(`    Fewer than ${domain.count} — a full exam will backfill from other domains for this one.`);
    }
  }

  return ok;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
