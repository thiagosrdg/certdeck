import { createExamStore, createHistoryStore, createSettingsStore } from "@certdeck/engine";
import { certConfig } from "./cert.config";

export const useSettingsStore = createSettingsStore(certConfig.id);
export const useHistoryStore = createHistoryStore(certConfig.id);
export const useExamStore = createExamStore(certConfig.id);
