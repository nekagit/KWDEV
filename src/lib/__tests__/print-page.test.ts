/**
 * Unit tests for print-page: triggerPrint with mocked window.
 * Runs in Node; window is undefined by default, so we mock it to assert behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerPrint } from "../print-page";

describe("triggerPrint", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if ("window" in globalThis) {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
  });

  it("calls window.print when window and window.print exist", () => {
    const print = vi.fn();
    (globalThis as unknown as { window: { print: () => void } }).window = {
      print,
    };

    triggerPrint();

    expect(print).toHaveBeenCalledTimes(1);
  });

  it("does not throw when window is undefined (SSR-safe)", () => {
    const g = globalThis as unknown as { window?: unknown };
    const hadWindow = "window" in g;
    const prev = g.window;
    g.window = undefined;
    try {
      expect(() => triggerPrint()).not.toThrow();
    } finally {
      if (hadWindow) g.window = prev;
      else delete g.window;
    }
  });

  it("does not throw when window.print is missing", () => {
    (globalThis as unknown as { window: Record<string, unknown> }).window = {};

    expect(() => triggerPrint()).not.toThrow();
  });
});
