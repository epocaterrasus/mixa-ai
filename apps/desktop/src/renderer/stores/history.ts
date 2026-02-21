import { create } from "zustand";

const MAX_HISTORY_ENTRIES = 10_000;
const STORAGE_KEY = "mixa-browsing-history";

interface HistoryEntry {
  url: string;
  title: string;
  faviconUrl: string | null;
  visitedAt: string;
}

interface HistoryStore {
  entries: HistoryEntry[];
  addEntry: (url: string, title: string, faviconUrl: string | null) => void;
  search: (query: string, limit?: number) => HistoryEntry[];
  getRecent: (limit?: number) => HistoryEntry[];
  clear: () => void;
}

function loadFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: loadFromStorage(),

  addEntry: (url: string, title: string, faviconUrl: string | null) => {
    // Skip empty, about:, chrome:, or data: URLs
    if (!url || url.startsWith("about:") || url.startsWith("chrome:") || url.startsWith("data:")) {
      return;
    }

    const entry: HistoryEntry = {
      url,
      title: title || url,
      faviconUrl,
      visitedAt: new Date().toISOString(),
    };

    set((state) => {
      // Remove duplicate of the same URL if it was visited recently (dedup last entry)
      const filtered = state.entries.filter(
        (e, i) => !(i === 0 && e.url === url),
      );
      const updated = [entry, ...filtered].slice(0, MAX_HISTORY_ENTRIES);
      saveToStorage(updated);
      return { entries: updated };
    });
  },

  search: (query: string, limit = 20): HistoryEntry[] => {
    const lower = query.toLowerCase();
    const { entries } = get();
    const results: HistoryEntry[] = [];

    for (const entry of entries) {
      if (results.length >= limit) break;
      if (
        entry.title.toLowerCase().includes(lower) ||
        entry.url.toLowerCase().includes(lower)
      ) {
        results.push(entry);
      }
    }

    return results;
  },

  getRecent: (limit = 20): HistoryEntry[] => {
    return get().entries.slice(0, limit);
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ entries: [] });
  },
}));
