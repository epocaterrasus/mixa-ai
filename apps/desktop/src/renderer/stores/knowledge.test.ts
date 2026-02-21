import { describe, it, expect, beforeEach, vi } from "vitest";
import { useKnowledgeStore, type KnowledgeItem } from "./knowledge";

// Mock the trpc client
vi.mock("../trpc", () => ({
  trpc: {
    items: {
      list: {
        query: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      },
      search: {
        query: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      },
      delete: {
        mutate: vi.fn().mockResolvedValue({ success: true }),
      },
      update: {
        mutate: vi.fn().mockResolvedValue({}),
      },
    },
  },
}));

function makeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: overrides.id ?? "item-1",
    url: overrides.url ?? "https://example.com/article",
    title: overrides.title ?? "Test Article",
    description: overrides.description ?? "A test article description",
    contentText: overrides.contentText ?? "Full article text content here.",
    contentHtml: overrides.contentHtml ?? null,
    itemType: overrides.itemType ?? "article",
    sourceType: overrides.sourceType ?? "manual",
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    faviconUrl: overrides.faviconUrl ?? null,
    domain: overrides.domain ?? "example.com",
    wordCount: overrides.wordCount ?? 42,
    readingTime: overrides.readingTime ?? 1,
    isArchived: overrides.isArchived ?? false,
    isFavorite: overrides.isFavorite ?? false,
    capturedAt: overrides.capturedAt ?? "2026-02-21T10:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-02-21T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-02-21T10:00:00.000Z",
  };
}

describe("Knowledge Store", () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useKnowledgeStore.setState({
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
      filters: { itemType: undefined, isFavorite: undefined, isArchived: false, dateFrom: undefined, dateTo: undefined },
      sortBy: "capturedAt",
      sortOrder: "desc",
      page: 0,
      pageSize: 24,
    });
  });

  describe("viewMode", () => {
    it("defaults to grid view", () => {
      expect(useKnowledgeStore.getState().viewMode).toBe("grid");
    });

    it("switches to list view", () => {
      useKnowledgeStore.getState().setViewMode("list");
      expect(useKnowledgeStore.getState().viewMode).toBe("list");
    });

    it("switches back to grid view", () => {
      useKnowledgeStore.getState().setViewMode("list");
      useKnowledgeStore.getState().setViewMode("grid");
      expect(useKnowledgeStore.getState().viewMode).toBe("grid");
    });
  });

  describe("filters", () => {
    it("defaults with no item type filter", () => {
      expect(useKnowledgeStore.getState().filters.itemType).toBeUndefined();
    });

    it("sets item type filter", () => {
      useKnowledgeStore.getState().setFilter("itemType", "article");
      expect(useKnowledgeStore.getState().filters.itemType).toBe("article");
    });

    it("sets favorite filter", () => {
      useKnowledgeStore.getState().setFilter("isFavorite", true);
      expect(useKnowledgeStore.getState().filters.isFavorite).toBe(true);
    });

    it("resets page when filter changes", () => {
      useKnowledgeStore.setState({ page: 3 });
      useKnowledgeStore.getState().setFilter("itemType", "highlight");
      expect(useKnowledgeStore.getState().page).toBe(0);
    });

    it("clears checked items when filter changes", () => {
      useKnowledgeStore.setState({ checkedIds: new Set(["a", "b"]) });
      useKnowledgeStore.getState().setFilter("itemType", "code");
      expect(useKnowledgeStore.getState().checkedIds.size).toBe(0);
    });

    it("clears all filters", () => {
      useKnowledgeStore.getState().setFilter("itemType", "article");
      useKnowledgeStore.getState().setFilter("isFavorite", true);
      useKnowledgeStore.getState().clearFilters();
      expect(useKnowledgeStore.getState().filters.itemType).toBeUndefined();
      expect(useKnowledgeStore.getState().filters.isFavorite).toBeUndefined();
      expect(useKnowledgeStore.getState().filters.isArchived).toBe(false);
    });
  });

  describe("sorting", () => {
    it("defaults to capturedAt desc", () => {
      const { sortBy, sortOrder } = useKnowledgeStore.getState();
      expect(sortBy).toBe("capturedAt");
      expect(sortOrder).toBe("desc");
    });

    it("sets sort field", () => {
      useKnowledgeStore.getState().setSortBy("title");
      expect(useKnowledgeStore.getState().sortBy).toBe("title");
    });

    it("sets sort order", () => {
      useKnowledgeStore.getState().setSortOrder("asc");
      expect(useKnowledgeStore.getState().sortOrder).toBe("asc");
    });

    it("resets page when sort changes", () => {
      useKnowledgeStore.setState({ page: 2 });
      useKnowledgeStore.getState().setSortBy("title");
      expect(useKnowledgeStore.getState().page).toBe(0);
    });
  });

  describe("pagination", () => {
    it("defaults to page 0", () => {
      expect(useKnowledgeStore.getState().page).toBe(0);
    });

    it("sets page", () => {
      useKnowledgeStore.getState().setPage(3);
      expect(useKnowledgeStore.getState().page).toBe(3);
    });

    it("clears checked items when page changes", () => {
      useKnowledgeStore.setState({ checkedIds: new Set(["a"]) });
      useKnowledgeStore.getState().setPage(1);
      expect(useKnowledgeStore.getState().checkedIds.size).toBe(0);
    });
  });

  describe("item selection", () => {
    it("selects an item from the items list", () => {
      const item = makeItem({ id: "item-1" });
      useKnowledgeStore.setState({ items: [item] });

      useKnowledgeStore.getState().selectItem("item-1");

      expect(useKnowledgeStore.getState().selectedItemId).toBe("item-1");
      expect(useKnowledgeStore.getState().selectedItem).toEqual(item);
    });

    it("deselects when selecting null", () => {
      const item = makeItem({ id: "item-1" });
      useKnowledgeStore.setState({
        items: [item],
        selectedItemId: "item-1",
        selectedItem: item,
      });

      useKnowledgeStore.getState().selectItem(null);

      expect(useKnowledgeStore.getState().selectedItemId).toBeNull();
      expect(useKnowledgeStore.getState().selectedItem).toBeNull();
    });

    it("returns null selectedItem when item is not in list", () => {
      useKnowledgeStore.setState({ items: [] });
      useKnowledgeStore.getState().selectItem("nonexistent");
      expect(useKnowledgeStore.getState().selectedItem).toBeNull();
    });
  });

  describe("checked items (bulk selection)", () => {
    it("toggles item check on", () => {
      useKnowledgeStore.getState().toggleCheckItem("item-1");
      expect(useKnowledgeStore.getState().checkedIds.has("item-1")).toBe(true);
    });

    it("toggles item check off", () => {
      useKnowledgeStore.setState({ checkedIds: new Set(["item-1"]) });
      useKnowledgeStore.getState().toggleCheckItem("item-1");
      expect(useKnowledgeStore.getState().checkedIds.has("item-1")).toBe(false);
    });

    it("checks all items", () => {
      const items = [
        makeItem({ id: "a" }),
        makeItem({ id: "b" }),
        makeItem({ id: "c" }),
      ];
      useKnowledgeStore.setState({ items });
      useKnowledgeStore.getState().checkAllItems();
      expect(useKnowledgeStore.getState().checkedIds.size).toBe(3);
      expect(useKnowledgeStore.getState().checkedIds.has("a")).toBe(true);
      expect(useKnowledgeStore.getState().checkedIds.has("b")).toBe(true);
      expect(useKnowledgeStore.getState().checkedIds.has("c")).toBe(true);
    });

    it("clears all checked items", () => {
      useKnowledgeStore.setState({ checkedIds: new Set(["a", "b"]) });
      useKnowledgeStore.getState().clearChecked();
      expect(useKnowledgeStore.getState().checkedIds.size).toBe(0);
    });
  });

  describe("search", () => {
    it("sets search query and resets page", () => {
      useKnowledgeStore.setState({ page: 2 });
      useKnowledgeStore.getState().search("react hooks");
      expect(useKnowledgeStore.getState().searchQuery).toBe("react hooks");
      expect(useKnowledgeStore.getState().page).toBe(0);
    });

    it("clears checked items on search", () => {
      useKnowledgeStore.setState({ checkedIds: new Set(["a"]) });
      useKnowledgeStore.getState().search("test");
      expect(useKnowledgeStore.getState().checkedIds.size).toBe(0);
    });
  });

  describe("filter panel", () => {
    it("defaults to hidden", () => {
      expect(useKnowledgeStore.getState().showFilters).toBe(false);
    });

    it("toggles filter panel visibility", () => {
      useKnowledgeStore.getState().toggleFilters();
      expect(useKnowledgeStore.getState().showFilters).toBe(true);
      useKnowledgeStore.getState().toggleFilters();
      expect(useKnowledgeStore.getState().showFilters).toBe(false);
    });
  });

  describe("error handling", () => {
    it("clears error", () => {
      useKnowledgeStore.setState({ error: "Something went wrong" });
      useKnowledgeStore.getState().clearError();
      expect(useKnowledgeStore.getState().error).toBeNull();
    });
  });
});
