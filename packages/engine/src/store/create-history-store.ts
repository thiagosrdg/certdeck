import { create } from "zustand";
import {
  appendHistoryEntry,
  clearHistory as clearHistoryStorage,
  deleteHistoryEntry as deleteHistoryEntryStorage,
  loadHistory,
  type HistoryEntry,
} from "../engine/persistence";

export interface HistoryStore {
  entries: HistoryEntry[];
  refresh: () => void;
  addEntry: (entry: HistoryEntry) => void;
  removeEntry: (attemptId: string) => void;
  clearAll: () => void;
}

export function createHistoryStore(certId: string) {
  return create<HistoryStore>((set) => ({
    entries: loadHistory(certId),
    refresh: () => set({ entries: loadHistory(certId) }),
    addEntry: (entry) => {
      appendHistoryEntry(certId, entry);
      set({ entries: loadHistory(certId) });
    },
    removeEntry: (attemptId) => {
      deleteHistoryEntryStorage(certId, attemptId);
      set({ entries: loadHistory(certId) });
    },
    clearAll: () => {
      clearHistoryStorage(certId);
      set({ entries: [] });
    },
  }));
}

export type { HistoryEntry };
