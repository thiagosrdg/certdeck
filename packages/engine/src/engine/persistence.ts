import { z } from "zod";
import { AttemptSchema, type Attempt } from "../types/attempt";
import { AttemptResultSchema } from "../types/results";
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from "../types/settings";

/**
 * Every key is namespaced per certification id so two installed apps (each
 * its own PWA, but sharing the browser's localStorage per origin only in
 * dev — in production each app is a distinct origin/scope) never collide,
 * and so a single browser profile testing multiple certs in dev stays
 * separated too.
 */
const NAMESPACE = "certdeck";

function storageKey(certId: string, name: string): string {
  return `${NAMESPACE}:${certId}:${name}`;
}

function safeGet(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — the current
    // session keeps working in memory, it just won't persist.
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// The explicit Def/Input params keep TS from unifying T against a zod
// schema's (optional-field-heavy) input type instead of its output type.
function readJson<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ---- Settings -------------------------------------------------------------

export function loadSettings(certId: string): Settings {
  return readJson(storageKey(certId, "settings"), SettingsSchema) ?? DEFAULT_SETTINGS;
}

export function saveSettings(certId: string, settings: Settings): void {
  safeSet(storageKey(certId, "settings"), JSON.stringify(settings));
}

// ---- Active (resumable) attempt -------------------------------------------

export function loadActiveAttempt(certId: string): Attempt | null {
  return readJson(storageKey(certId, "active-attempt"), AttemptSchema);
}

export function saveActiveAttempt(certId: string, attempt: Attempt): void {
  safeSet(storageKey(certId, "active-attempt"), JSON.stringify(attempt));
}

export function clearActiveAttempt(certId: string): void {
  safeRemove(storageKey(certId, "active-attempt"));
}

// ---- History ----------------------------------------------------------------

export const HistoryEntrySchema = z.object({
  attempt: AttemptSchema,
  result: AttemptResultSchema,
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

const HistorySchema = z.array(HistoryEntrySchema);

const MAX_HISTORY_ENTRIES = 200;

export function loadHistory(certId: string): HistoryEntry[] {
  return readJson(storageKey(certId, "history"), HistorySchema) ?? [];
}

function saveHistory(certId: string, entries: HistoryEntry[]): void {
  safeSet(storageKey(certId, "history"), JSON.stringify(entries));
}

export function appendHistoryEntry(certId: string, entry: HistoryEntry): void {
  const existing = loadHistory(certId);
  const next = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  saveHistory(certId, next);
}

export function deleteHistoryEntry(certId: string, attemptId: string): void {
  const existing = loadHistory(certId);
  saveHistory(
    certId,
    existing.filter((e) => e.attempt.id !== attemptId)
  );
}

export function clearHistory(certId: string): void {
  safeRemove(storageKey(certId, "history"));
}

// ---- Everything -------------------------------------------------------------

export function clearAllData(certId: string): void {
  clearActiveAttempt(certId);
  clearHistory(certId);
  safeRemove(storageKey(certId, "settings"));
}
