import { create } from "zustand";
import { trpc } from "../trpc";

// ── Types ─────────────────────────────────────────────────────

export interface ItemTag {
  id: string;
  name: string;
  color: string | null;
}

export interface KnowledgeItem {
  id: string;
  url: string | null;
  title: string;
  description: string | null;
  contentText: string | null;
  contentHtml: string | null;
  itemType: string;
  sourceType: string;
  thumbnailUrl: string | null;
  faviconUrl: string | null;
  domain: string | null;
  wordCount: number | null;
  readingTime: number | null;
  summary: string | null;
  isArchived: boolean;
  isFavorite: boolean;
  tags: ItemTag[];
  projectId: string | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTag {
  id: string;
  name: string;
  color: string | null;
}

export interface AvailableProject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export type SortField = "capturedAt" | "title" | "updatedAt";
export type ViewMode = "grid" | "list";

export interface KnowledgeFilters {
  itemType: "article" | "highlight" | "youtube" | "pdf" | "code" | "image" | "terminal" | undefined;
  isFavorite: boolean | undefined;
  isArchived: boolean | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  tagIds: string[];
  projectId: string | undefined;
}

const DEFAULT_FILTERS: KnowledgeFilters = {
  itemType: undefined,
  isFavorite: undefined,
  isArchived: false,
  dateFrom: undefined,
  dateTo: undefined,
  tagIds: [],
  projectId: undefined,
};

const PAGE_SIZE = 24;

interface KnowledgeStore {
  // State
  items: KnowledgeItem[];
  total: number;
  selectedItemId: string | null;
  selectedItem: KnowledgeItem | null;
  viewMode: ViewMode;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  checkedIds: Set<string>;
  showFilters: boolean;
  filters: KnowledgeFilters;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  availableTags: AvailableTag[];
  availableProjects: AvailableProject[];

  // Actions
  loadItems: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadProjects: () => Promise<void>;
  search: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilter: <K extends keyof KnowledgeFilters>(key: K, value: KnowledgeFilters[K]) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: SortField) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setPage: (page: number) => void;
  selectItem: (id: string | null) => void;
  toggleCheckItem: (id: string) => void;
  checkAllItems: () => void;
  clearChecked: () => void;
  deleteItems: (ids: string[]) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  toggleFilters: () => void;
  clearError: () => void;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  items: [],
  total: 0,
  selectedItemId: null,
  selectedItem: null,
  viewMode: "grid",
  searchQuery: "",
  isLoading: false,
  error: null,
  checkedIds: new Set<string>(),
  showFilters: false,
  filters: { ...DEFAULT_FILTERS },
  sortBy: "capturedAt",
  sortOrder: "desc",
  page: 0,
  pageSize: PAGE_SIZE,
  availableTags: [],
  availableProjects: [],

  loadItems: async () => {
    const { searchQuery, filters, sortBy, sortOrder, page, pageSize } = get();
    set({ isLoading: true, error: null });

    try {
      if (searchQuery.trim()) {
        // Use text search
        const result = await trpc.items.search.query({
          query: searchQuery.trim(),
          limit: pageSize,
          itemType: filters.itemType,
        }) as { items: KnowledgeItem[]; total: number };

        set({
          items: result.items,
          total: result.total,
          isLoading: false,
        });
      } else {
        // Use list with filters
        const result = await trpc.items.list.query({
          limit: pageSize,
          offset: page * pageSize,
          itemType: filters.itemType,
          isFavorite: filters.isFavorite,
          isArchived: filters.isArchived,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          sortBy,
          sortOrder,
        }) as { items: KnowledgeItem[]; total: number };

        set({
          items: result.items,
          total: result.total,
          isLoading: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load items";
      set({ error: message, isLoading: false });
    }
  },

  loadTags: async () => {
    try {
      const result = await trpc.tags.list.query({}) as { tags: AvailableTag[] };
      set({ availableTags: result.tags });
    } catch {
      // Tags not yet available — silently ignore
    }
  },

  loadProjects: async () => {
    try {
      const result = await trpc.projects.list.query({}) as { projects: AvailableProject[] };
      set({ availableProjects: result.projects });
    } catch {
      // Projects not yet available — silently ignore
    }
  },

  search: (query: string) => {
    set({ searchQuery: query, page: 0, checkedIds: new Set<string>() });
    void get().loadItems();
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  setFilter: <K extends keyof KnowledgeFilters>(key: K, value: KnowledgeFilters[K]) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      page: 0,
      checkedIds: new Set<string>(),
    }));
    void get().loadItems();
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS }, page: 0, checkedIds: new Set<string>() });
    void get().loadItems();
  },

  setSortBy: (sortBy: SortField) => {
    set({ sortBy, page: 0 });
    void get().loadItems();
  },

  setSortOrder: (order: "asc" | "desc") => {
    set({ sortOrder: order, page: 0 });
    void get().loadItems();
  },

  setPage: (page: number) => {
    set({ page, checkedIds: new Set<string>() });
    void get().loadItems();
  },

  selectItem: (id: string | null) => {
    if (id === null) {
      set({ selectedItemId: null, selectedItem: null });
      return;
    }
    const item = get().items.find((i) => i.id === id) ?? null;
    set({ selectedItemId: id, selectedItem: item });
  },

  toggleCheckItem: (id: string) => {
    set((state) => {
      const next = new Set(state.checkedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { checkedIds: next };
    });
  },

  checkAllItems: () => {
    set((state) => ({
      checkedIds: new Set(state.items.map((i) => i.id)),
    }));
  },

  clearChecked: () => {
    set({ checkedIds: new Set<string>() });
  },

  deleteItems: async (ids: string[]) => {
    try {
      for (const id of ids) {
        await trpc.items.delete.mutate({ id });
      }
      set((state) => ({
        checkedIds: new Set<string>(),
        selectedItemId: ids.includes(state.selectedItemId ?? "") ? null : state.selectedItemId,
        selectedItem: ids.includes(state.selectedItemId ?? "") ? null : state.selectedItem,
      }));
      void get().loadItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete items";
      set({ error: message });
    }
  },

  toggleFavorite: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    try {
      await trpc.items.update.mutate({ id, isFavorite: !item.isFavorite });
      set((state) => ({
        items: state.items.map((i) =>
          i.id === id ? { ...i, isFavorite: !i.isFavorite } : i,
        ),
        selectedItem:
          state.selectedItem?.id === id
            ? { ...state.selectedItem, isFavorite: !state.selectedItem.isFavorite }
            : state.selectedItem,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update item";
      set({ error: message });
    }
  },

  toggleArchive: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    try {
      await trpc.items.update.mutate({ id, isArchived: !item.isArchived });
      void get().loadItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update item";
      set({ error: message });
    }
  },

  toggleFilters: () => {
    set((state) => ({ showFilters: !state.showFilters }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
