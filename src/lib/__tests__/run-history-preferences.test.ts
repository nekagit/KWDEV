/**
 * Unit tests for src/lib/run-history-preferences.ts
 * Tests getRunHistoryPreferences, setRunHistoryPreferences, defaults, and validation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getRunHistoryPreferences,
  setRunHistoryPreferences,
  DEFAULT_RUN_HISTORY_PREFERENCES,
  RUN_HISTORY_FILTER_QUERY_MAX_LEN,
  type RunHistoryPreferences,
} from "../run-history-preferences";

const STORAGE_KEY = "kwcode-run-history-preferences";

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key() {
      return null;
    },
  };
}

describe("run-history-preferences", () => {
  let mockLocalStorage: Storage;
  let originalWindow: typeof globalThis.window;
  let originalLocalStorage: typeof globalThis.localStorage;

  beforeEach(() => {
    mockLocalStorage = createMockStorage();
    originalWindow = globalThis.window;
    originalLocalStorage = globalThis.localStorage;
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockLocalStorage,
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    (globalThis as unknown as { window: typeof originalWindow }).window = originalWindow;
    if (originalLocalStorage !== undefined) {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    } else {
      try { delete (globalThis as any).localStorage; } catch { /* ignore */ }
    }
    vi.restoreAllMocks();
  });

  describe("DEFAULT_RUN_HISTORY_PREFERENCES", () => {
    it("has expected shape and default values", () => {
      expect(DEFAULT_RUN_HISTORY_PREFERENCES).toEqual({
        sortOrder: "newest",
        exitStatusFilter: "all",
        dateRangeFilter: "all",
        slotFilter: "all",
        filterQuery: "",
      });
    });
  });

  describe("RUN_HISTORY_FILTER_QUERY_MAX_LEN", () => {
    it("is 500", () => {
      expect(RUN_HISTORY_FILTER_QUERY_MAX_LEN).toBe(500);
    });
  });

  describe("getRunHistoryPreferences", () => {
    it("returns defaults when storage is empty", () => {
      const prefs = getRunHistoryPreferences();
      expect(prefs).toEqual(DEFAULT_RUN_HISTORY_PREFERENCES);
    });

    it("returns defaults when storage has no key", () => {
      mockLocalStorage.setItem("other-key", "{}");
      const prefs = getRunHistoryPreferences();
      expect(prefs).toEqual(DEFAULT_RUN_HISTORY_PREFERENCES);
    });

    it("returns validated preferences when storage has valid JSON", () => {
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sortOrder: "oldest",
          exitStatusFilter: "failed",
          dateRangeFilter: "7d",
          slotFilter: "2",
          filterQuery: "my label",
        })
      );
      const prefs = getRunHistoryPreferences();
      expect(prefs.sortOrder).toBe("oldest");
      expect(prefs.exitStatusFilter).toBe("failed");
      expect(prefs.dateRangeFilter).toBe("7d");
      expect(prefs.slotFilter).toBe("2");
      expect(prefs.filterQuery).toBe("my label");
    });

    it("falls back to defaults for invalid sortOrder", () => {
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sortOrder: "invalid", filterQuery: "" })
      );
      const prefs = getRunHistoryPreferences();
      expect(prefs.sortOrder).toBe("newest");
    });

    it("falls back to defaults for invalid exitStatusFilter", () => {
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ exitStatusFilter: "unknown" })
      );
      const prefs = getRunHistoryPreferences();
      expect(prefs.exitStatusFilter).toBe("all");
    });

    it("falls back to defaults for invalid dateRangeFilter", () => {
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dateRangeFilter: "90d" })
      );
      const prefs = getRunHistoryPreferences();
      expect(prefs.dateRangeFilter).toBe("all");
    });

    it("falls back to defaults for invalid slotFilter", () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ slotFilter: "99" }));
      const prefs = getRunHistoryPreferences();
      expect(prefs.slotFilter).toBe("all");
    });

    it("trims and caps filterQuery", () => {
      const longQuery = "a".repeat(600);
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filterQuery: "  trim me  " })
      );
      const prefs = getRunHistoryPreferences();
      expect(prefs.filterQuery).toBe("trim me");
    });

    it("caps filterQuery at RUN_HISTORY_FILTER_QUERY_MAX_LEN", () => {
      const longQuery = "a".repeat(600);
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filterQuery: longQuery })
      );
      const prefs = getRunHistoryPreferences();
      expect(prefs.filterQuery.length).toBe(RUN_HISTORY_FILTER_QUERY_MAX_LEN);
      expect(prefs.filterQuery).toBe("a".repeat(RUN_HISTORY_FILTER_QUERY_MAX_LEN));
    });

    it("returns defaults when stored value is not valid JSON", () => {
      mockLocalStorage.setItem(STORAGE_KEY, "not json {");
      const prefs = getRunHistoryPreferences();
      expect(prefs).toEqual(DEFAULT_RUN_HISTORY_PREFERENCES);
    });

    it("returns defaults when stored value is the JSON string 'null' (parse throws)", () => {
      mockLocalStorage.setItem(STORAGE_KEY, "null");
      const prefs = getRunHistoryPreferences();
      expect(prefs).toEqual(DEFAULT_RUN_HISTORY_PREFERENCES);
    });
  });

  describe("setRunHistoryPreferences", () => {
    it("writes full defaults when given full default shape", () => {
      setRunHistoryPreferences(DEFAULT_RUN_HISTORY_PREFERENCES);
      const stored = mockLocalStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!) as RunHistoryPreferences;
      expect(parsed).toEqual(DEFAULT_RUN_HISTORY_PREFERENCES);
    });

    it("merges partial update onto current preferences", () => {
      setRunHistoryPreferences({ sortOrder: "oldest" });
      let prefs = getRunHistoryPreferences();
      expect(prefs.sortOrder).toBe("oldest");
      expect(prefs.exitStatusFilter).toBe("all");

      setRunHistoryPreferences({ exitStatusFilter: "failed" });
      prefs = getRunHistoryPreferences();
      expect(prefs.sortOrder).toBe("oldest");
      expect(prefs.exitStatusFilter).toBe("failed");
    });

    it("ignores invalid partial sortOrder and keeps current", () => {
      setRunHistoryPreferences({ sortOrder: "oldest" });
      setRunHistoryPreferences({ sortOrder: "invalid" as "newest" });
      const prefs = getRunHistoryPreferences();
      expect(prefs.sortOrder).toBe("oldest");
    });

    it("normalizes and caps filterQuery on set", () => {
      setRunHistoryPreferences({
        filterQuery: "  search  ",
      });
      expect(getRunHistoryPreferences().filterQuery).toBe("search");

      setRunHistoryPreferences({
        filterQuery: "x".repeat(600),
      });
      expect(getRunHistoryPreferences().filterQuery.length).toBe(
        RUN_HISTORY_FILTER_QUERY_MAX_LEN
      );
    });
  });

  describe("SSR guard (window undefined)", () => {
    it("getRunHistoryPreferences returns defaults when window is undefined", () => {
      (globalThis as unknown as { window: undefined }).window = undefined;
      const prefs = getRunHistoryPreferences();
      expect(prefs).toEqual(DEFAULT_RUN_HISTORY_PREFERENCES);
    });

    it("setRunHistoryPreferences does not throw when window is undefined", () => {
      (globalThis as unknown as { window: undefined }).window = undefined;
      expect(() => {
        setRunHistoryPreferences({ sortOrder: "oldest" });
      }).not.toThrow();
    });
  });
});
