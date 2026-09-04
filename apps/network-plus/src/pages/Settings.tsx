import { Button } from "@certdeck/engine";
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

  function clearAllData() {
    if (!window.confirm("This deletes all history and any in-progress attempt for PacketPrep. Continue?")) return;
    useHistoryStore.getState().clearAll();
    useExamStore.getState().abandon();
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
          <Button variant="secondary" onClick={clearAllData}>
            Clear all data
          </Button>
        </section>
      </div>
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
