import { create } from "zustand";
import { loadSettings, saveSettings } from "../engine/persistence";
import { DEFAULT_SETTINGS, type Settings, type Theme } from "../types/settings";

export interface SettingsStore {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setPassThreshold: (threshold: number | null) => void;
  setTimerEnabledInPractice: (enabled: boolean) => void;
  setShuffleOptions: (enabled: boolean) => void;
  setCardFlipEnabled: (enabled: boolean) => void;
  setAccent: (accentId: string | null) => void;
  resetToDefaults: () => void;
}

/**
 * A factory, not a singleton store: each app calls this once with its own
 * certification id so settings for two installed apps never collide, even
 * though the store implementation itself knows nothing about which
 * certification it belongs to.
 */
export function createSettingsStore(certId: string) {
  return create<SettingsStore>((set, get) => {
    function update(patch: Partial<Settings>) {
      const next = { ...get().settings, ...patch };
      saveSettings(certId, next);
      set({ settings: next });
    }

    return {
      settings: loadSettings(certId),
      setTheme: (theme) => update({ theme }),
      setPassThreshold: (passThreshold) => update({ passThreshold }),
      setTimerEnabledInPractice: (timerEnabledInPractice) => update({ timerEnabledInPractice }),
      setShuffleOptions: (shuffleOptions) => update({ shuffleOptions }),
      setCardFlipEnabled: (cardFlipEnabled) => update({ cardFlipEnabled }),
      setAccent: (accent) => update({ accent }),
      resetToDefaults: () => update(DEFAULT_SETTINGS),
    };
  });
}
