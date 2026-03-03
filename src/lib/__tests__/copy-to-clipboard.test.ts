/**
 * Unit tests for copy-to-clipboard: copyTextToClipboard with clipboard API and fallback.
 * Runs in Node; navigator and document are mocked. Fallback (execCommand) is not available in Node.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyTextToClipboard } from "../copy-to-clipboard";

const { mockToast } = vi.hoisted(() => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };
  return { mockToast };
});

vi.mock("sonner", () => ({ toast: mockToast }));

describe("copyTextToClipboard", () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("returns false and shows error toast when text is empty or whitespace", async () => {
    const nav = { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } };
    Object.defineProperty(globalThis, "navigator", { value: nav, writable: true, configurable: true });

    expect(await copyTextToClipboard("")).toBe(false);
    expect(await copyTextToClipboard("   ")).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith("Nothing to copy");
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("returns true and shows success toast when navigator.clipboard.writeText succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard("hello");

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(mockToast.success).toHaveBeenCalledWith("Copied to clipboard");
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("returns false and shows error toast when clipboard.writeText rejects and fallback unavailable", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });
    // In Node there is no document.body, so fallback fails

    const result = await copyTextToClipboard("text");

    expect(result).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith("Failed to copy");
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("falls back when navigator.clipboard is undefined and returns false in Node", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard("no clipboard");

    expect(result).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith("Failed to copy");
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("when silent: true, does not show toasts on success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard("hello", { silent: true });

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("when silent: true, does not show toasts on empty text", async () => {
    const nav = { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } };
    Object.defineProperty(globalThis, "navigator", { value: nav, writable: true, configurable: true });

    const result = await copyTextToClipboard("   ", { silent: true });

    expect(result).toBe(false);
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("when silent: true, does not show toasts on failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    const result = await copyTextToClipboard("text", { silent: true });

    expect(result).toBe(false);
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
