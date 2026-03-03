/**
 * Unit tests for copy-app-version: copyAppVersionToClipboard with mocked getAppVersion and copyTextToClipboard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAppVersion = vi.fn();
const mockCopyTextToClipboard = vi.fn();

vi.mock("@/lib/app-version", () => ({
  getAppVersion: () => mockGetAppVersion(),
}));
vi.mock("@/lib/copy-to-clipboard", () => ({
  copyTextToClipboard: (text: string) => mockCopyTextToClipboard(text),
}));

describe("copyAppVersionToClipboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls copyTextToClipboard with 'v' + version when getAppVersion resolves", async () => {
    mockGetAppVersion.mockResolvedValue("0.1.0");
    mockCopyTextToClipboard.mockResolvedValue(true);

    const { copyAppVersionToClipboard } = await import("../copy-app-version");
    const result = await copyAppVersionToClipboard();

    expect(mockGetAppVersion).toHaveBeenCalledTimes(1);
    expect(mockCopyTextToClipboard).toHaveBeenCalledWith("v0.1.0");
    expect(result).toBe(true);
  });

  it("propagates copyTextToClipboard return value when copy succeeds", async () => {
    mockGetAppVersion.mockResolvedValue("1.2.3");
    mockCopyTextToClipboard.mockResolvedValue(true);

    const { copyAppVersionToClipboard } = await import("../copy-app-version");
    const result = await copyAppVersionToClipboard();

    expect(result).toBe(true);
  });

  it("propagates copyTextToClipboard return value when copy fails", async () => {
    mockGetAppVersion.mockResolvedValue("0.0.1");
    mockCopyTextToClipboard.mockResolvedValue(false);

    const { copyAppVersionToClipboard } = await import("../copy-app-version");
    const result = await copyAppVersionToClipboard();

    expect(mockCopyTextToClipboard).toHaveBeenCalledWith("v0.0.1");
    expect(result).toBe(false);
  });

  it("calls copyTextToClipboard with '—' when getAppVersion rejects", async () => {
    mockGetAppVersion.mockRejectedValue(new Error("version unavailable"));
    mockCopyTextToClipboard.mockResolvedValue(true);

    const { copyAppVersionToClipboard } = await import("../copy-app-version");
    const result = await copyAppVersionToClipboard();

    expect(mockCopyTextToClipboard).toHaveBeenCalledWith("—");
    expect(result).toBe(true);
  });

  it("returns false when getAppVersion rejects and copyTextToClipboard returns false", async () => {
    mockGetAppVersion.mockRejectedValue(new Error("network error"));
    mockCopyTextToClipboard.mockResolvedValue(false);

    const { copyAppVersionToClipboard } = await import("../copy-app-version");
    const result = await copyAppVersionToClipboard();

    expect(mockCopyTextToClipboard).toHaveBeenCalledWith("—");
    expect(result).toBe(false);
  });
});
