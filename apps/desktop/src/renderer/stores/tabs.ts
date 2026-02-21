import { create } from "zustand";
import type { Tab, TabType } from "@mixa-ai/types";

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (type: TabType, url?: string) => string;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  activateTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Pick<Tab, "title" | "url" | "faviconUrl" | "state" | "canGoBack" | "canGoForward">>) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  activateTabByIndex: (index: number) => void;
  getActiveTab: () => Tab | undefined;
}

let tabCounter = 0;

function generateTabId(): string {
  tabCounter += 1;
  return `tab-${Date.now()}-${tabCounter}`;
}

function defaultTitleForType(type: TabType): string {
  switch (type) {
    case "web":
      return "New Tab";
    case "terminal":
      return "Terminal";
    case "knowledge":
      return "Knowledge";
    case "chat":
      return "Chat";
    case "dashboard":
      return "Dashboard";
    case "settings":
      return "Settings";
  }
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (type: TabType, url?: string): string => {
    const id = generateTabId();
    const tab: Tab = {
      id,
      type,
      title: defaultTitleForType(type),
      url: url ?? null,
      faviconUrl: null,
      isActive: true,
      state: type === "web" && url ? "loading" : "idle",
      spaceId: null,
      canGoBack: false,
      canGoForward: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      tabs: [
        ...state.tabs.map((t) => ({ ...t, isActive: false })),
        tab,
      ],
      activeTabId: id,
    }));

    return id;
  },

  closeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    const newTabs = tabs.filter((t) => t.id !== id);

    // If closing the active tab, activate an adjacent one
    let newActiveId = activeTabId;
    if (activeTabId === id) {
      if (newTabs.length === 0) {
        newActiveId = null;
      } else if (index >= newTabs.length) {
        newActiveId = newTabs[newTabs.length - 1]!.id;
      } else {
        newActiveId = newTabs[index]!.id;
      }
    }

    set({
      tabs: newTabs.map((t) => ({
        ...t,
        isActive: t.id === newActiveId,
      })),
      activeTabId: newActiveId,
    });
  },

  closeOtherTabs: (id: string) => {
    const { tabs } = get();
    const kept = tabs.filter((t) => t.id === id);
    if (kept.length === 0) return;

    set({
      tabs: kept.map((t) => ({ ...t, isActive: true })),
      activeTabId: id,
    });
  },

  activateTab: (id: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => ({
        ...t,
        isActive: t.id === id,
      })),
      activeTabId: id,
    }));
  },

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    }));
  },

  moveTab: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      if (!moved) return state;
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    });
  },

  activateTabByIndex: (index: number) => {
    const { tabs } = get();
    const tab = tabs[index];
    if (tab) {
      get().activateTab(tab.id);
    }
  },

  getActiveTab: (): Tab | undefined => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId);
  },
}));
