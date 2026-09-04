import { useState } from "react";
import { Button, ConfirmDialog } from "@certdeck/engine";
import { PageShell } from "../components/PageShell";
import { certConfig } from "../cert.config";
import { useExamStore, useHistoryStore, useSettingsStore } from "../stores";

export default function Settings() {
  const settings = useSettingsStore((s) => s.settings);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setPassThreshold = useSettingsStore((s) => s.setPassThreshold);
  const setTimerEnabledInPractice = useSettingsStore((s) => s.setTimerEnabledInPractice);
  const setShuffleOptions = useSettingsStore((s) => s.setShuffleOptions);
  const setCardFlipEnabled = useSettingsStore((s) => s.setCardFlipEnabled);

  const [confirmReset, setConfirmReset] = useState(false);
  const attemptCount = useHistoryStore((s) => s.entries.length);
  const hasInProgress = useExamStore((s) => s.hasResumableAttempt());

  function resetProgress() {
    useHistoryStore.getState().clearAll();
    useExamStore.getState().abandon();
    setConfirmReset(false);
  }

  return (
    <PageShell title="Settings" backTo="/">
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold">Theme</h2>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${settings.theme === t ? "border-accent bg-accent/10" : "border-edge"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Pass threshold</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round((settings.passThreshold ?? certConfig.passThreshold) * 100)}
              onChange={(e) => setPassThreshold(Number(e.target.value) / 100)}
              className="w-20 rounded-lg border border-edge bg-card px-2 py-1.5 text-sm"
            />
            <span className="text-sm text-ink-muted">% (default {Math.round(certConfig.passThreshold * 100)}%)</span>
            {settings.passThreshold != null && (
              <button type="button" className="text-xs text-ink-muted underline" onClick={() => setPassThreshold(null)}>
                Reset
              </button>
            )}
          </div>
        </section>

        <ToggleRow label="Timer in practice mode" checked={settings.timerEnabledInPractice} onChange={setTimerEnabledInPractice} />
        <ToggleRow label="Shuffle answer options" checked={settings.shuffleOptions} onChange={setShuffleOptions} />
        <ToggleRow label="Card flip animation" checked={settings.cardFlipEnabled} onChange={setCardFlipEnabled} />

        <section className="border-t border-edge pt-4">
          <h2 className="mb-1 text-sm font-semibold">Reset progress</h2>
          <p className="mb-3 text-xs text-ink-muted">
            Discards every attempt and any exam in progress. The settings on this page are kept.
          </p>
          <Button variant="secondary" onClick={() => setConfirmReset(true)} disabled={attemptCount === 0 && !hasInProgress}>
            Reset progress
          </Button>
          {attemptCount === 0 && !hasInProgress && (
            <p className="mt-2 font-mono text-[11px] text-ink-muted">Nothing to reset yet.</p>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset your progress?"
        tone="danger"
        confirmLabel="Reset progress"
        cancelLabel="Keep it"
        body={
          <>
            <p>
              This deletes {attemptCount} recorded attempt{attemptCount === 1 ? "" : "s"}
              {hasInProgress && " and the exam you have in progress"}, along with the XP, level, streak and mastery
              built from them.
            </p>
            <p className="mt-1">Your theme, pass threshold and other settings are kept. This cannot be undone.</p>
          </>
        }
        onCancel={() => setConfirmReset(false)}
        onConfirm={resetProgress}
      />
    </PageShell>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
        style={{ accentColor: "var(--cd-accent)" }}
      />
    </label>
  );
}
