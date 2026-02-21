import { create } from "zustand";

/** Related item found in the knowledge base for the current page */
export interface AugmentedRelatedItem {
  id: string;
  title: string;
  url: string | null;
  domain: string | null;
  summary: string | null;
  score: number;
  capturedAt: string;
  itemType: string;
  faviconUrl: string | null;
}

interface AugmentedState {
  /** Related items keyed by tabId */
  relatedByTab: Record<string, AugmentedRelatedItem[]>;
  /** Whether the related items panel is open */
  isPanelOpen: boolean;

  // Actions
  setRelatedItems: (tabId: string, items: AugmentedRelatedItem[]) => void;
  clearTab: (tabId: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useAugmentedStore = create<AugmentedState>((set) => ({
  relatedByTab: {},
  isPanelOpen: false,

  setRelatedItems: (tabId, items) => {
    set((state) => ({
      relatedByTab: {
        ...state.relatedByTab,
        [tabId]: items,
      },
    }));
  },

  clearTab: (tabId) => {
    set((state) => {
      const { [tabId]: _, ...rest } = state.relatedByTab;
      return { relatedByTab: rest };
    });
  },

  togglePanel: () => {
    set((state) => ({ isPanelOpen: !state.isPanelOpen }));
  },

  openPanel: () => {
    set({ isPanelOpen: true });
  },

  closePanel: () => {
    set({ isPanelOpen: false });
  },
}));
