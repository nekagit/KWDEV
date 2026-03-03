/**
 * Unit tests for recent-projects: getRecentProjectIds and recordProjectVisit.
 * Used by command palette for last-N project ordering. Mocks window and localStorage.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRecentProjectIds, recordProjectVisit } from "../recent-projects";

const STORAGE_KEY = "kwcode-recent-project-ids";

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

describe("recent-projects", () => {
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
    // Source uses bare `localStorage` which resolves to globalThis.localStorage in Node
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
  });

  describe("getRecentProjectIds", () => {
    it("returns [] when window is undefined (SSR-safe)", () => {
      (globalThis as unknown as { window: undefined }).window = undefined;
      expect(getRecentProjectIds()).toEqual([]);
    });

    it("returns [] when storage key is missing", () => {
      expect(getRecentProjectIds()).toEqual([]);
    });

    it("returns [] when storage key is null (getItem returns null)", () => {
      mockLocalStorage.setItem("other", "x");
      expect(getRecentProjectIds()).toEqual([]);
    });

    it("returns [] for invalid JSON", () => {
      mockLocalStorage.setItem(STORAGE_KEY, "not json");
      expect(getRecentProjectIds()).toEqual([]);
    });

    it("returns [] when stored value is not an array", () => {
      mockLocalStorage.setItem(STORAGE_KEY, "{}");
      expect(getRecentProjectIds()).toEqual([]);
      mockLocalStorage.setItem(STORAGE_KEY, '"string"');
      expect(getRecentProjectIds()).toEqual([]);
      mockLocalStorage.setItem(STORAGE_KEY, "123");
      expect(getRecentProjectIds()).toEqual([]);
    });

    it("returns filtered string array and filters out non-strings", () => {
      mockLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(["a", 1, null, "b", {}, "c", undefined])
      );
      expect(getRecentProjectIds()).toEqual(["a", "b", "c"]);
    });

    it("returns at most MAX_RECENT (10) entries", () => {
      const ids = Array.from({ length: 15 }, (_, i) => `id-${i}`);
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      expect(getRecentProjectIds()).toHaveLength(10);
      expect(getRecentProjectIds()).toEqual(ids.slice(0, 10));
    });

    it("returns valid string array when storage has valid JSON array of strings", () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(["p1", "p2", "p3"]));
      expect(getRecentProjectIds()).toEqual(["p1", "p2", "p3"]);
    });
  });

  describe("recordProjectVisit", () => {
    it("does nothing when window is undefined", () => {
      (globalThis as unknown as { window: undefined }).window = undefined;
      recordProjectVisit("proj-1");
      (globalThis as unknown as { window: unknown }).window = {
        localStorage: mockLocalStorage,
      };
      expect(getRecentProjectIds()).toEqual([]);
    });

    it("does nothing when projectId is empty string", () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(["existing"]));
      recordProjectVisit("");
      expect(getRecentProjectIds()).toEqual(["existing"]);
    });

    it("does nothing when projectId is whitespace-only", () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(["existing"]));
      recordProjectVisit("   ");
      recordProjectVisit("\t\n");
      expect(getRecentProjectIds()).toEqual(["existing"]);
    });

    it("prepends new id and persists to localStorage", () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(["old"]));
      recordProjectVisit("new");
      expect(getRecentProjectIds()).toEqual(["new", "old"]);
      expect(mockLocalStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["new", "old"]));
    });

    it("dedupes: moving existing id to front", () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(["a", "b", "c"]));
      recordProjectVisit("b");
      expect(getRecentProjectIds()).toEqual(["b", "a", "c"]);
    });

    it("trims projectId before storing", () => {
      recordProjectVisit("  proj-1  ");
      expect(getRecentProjectIds()).toEqual(["proj-1"]);
      expect(mockLocalStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["proj-1"]));
    });

    it("caps at MAX_RECENT (10) entries", () => {
      for (let i = 0; i < 12; i++) {
        (globalThis as unknown as { window: unknown }).window = {
          localStorage: mockLocalStorage,
        };
        recordProjectVisit(`id-${i}`);
      }
      const recent = getRecentProjectIds();
      expect(recent).toHaveLength(10);
      expect(recent[0]).toBe("id-11");
      expect(recent[9]).toBe("id-2");
    });

    it("persists to localStorage after recordProjectVisit", () => {
      recordProjectVisit("only");
      expect(mockLocalStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["only"]));
    });
  });
});
