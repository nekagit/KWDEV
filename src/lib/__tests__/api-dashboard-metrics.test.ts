/**
 * Unit tests for api-dashboard-metrics: getDashboardMetrics dual-mode (Tauri invoke vs fetch).
 * Mocks @/lib/tauri and global fetch to cover both branches and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DashboardMetrics } from "@/types/dashboard";

const mockInvoke = vi.fn();
let mockIsTauri = false;
vi.mock("@/lib/tauri", () => ({
  get invoke() {
    return mockInvoke;
  },
  get isTauri() {
    return mockIsTauri;
  },
}));

const sampleMetrics: DashboardMetrics = {
  tickets_count: 10,
  prompts_count: 5,
  designs_count: 3,
  active_projects_count: 2,
  all_projects_count: 4,
};

describe("getDashboardMetrics", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    mockIsTauri = false;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls invoke and returns metrics when isTauri is true", async () => {
    mockIsTauri = true;
    mockInvoke.mockResolvedValue(sampleMetrics);

    const { getDashboardMetrics } = await import("../api-dashboard-metrics");
    const result = await getDashboardMetrics();

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("get_dashboard_metrics", {});
    expect(result).toEqual(sampleMetrics);
    expect(result.tickets_count).toBe(10);
    expect(result.active_projects_count).toBe(2);
  });

  it("calls fetch and returns parsed JSON when isTauri is false and response is ok", async () => {
    mockIsTauri = false;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleMetrics),
    });
    globalThis.fetch = fetchMock;

    const { getDashboardMetrics } = await import("../api-dashboard-metrics");
    const result = await getDashboardMetrics();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/data/dashboard-metrics");
    expect(result).toEqual(sampleMetrics);
  });

  it("throws with response text when isTauri is false and response is not ok", async () => {
    mockIsTauri = false;
    const errorBody = "Internal Server Error";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(errorBody),
    });
    globalThis.fetch = fetchMock;

    const { getDashboardMetrics } = await import("../api-dashboard-metrics");

    await expect(getDashboardMetrics()).rejects.toThrow(errorBody);
    expect(fetchMock).toHaveBeenCalledWith("/api/data/dashboard-metrics");
  });

  it("propagates error when invoke rejects (Tauri branch)", async () => {
    mockIsTauri = true;
    const err = new Error("Tauri backend error");
    mockInvoke.mockRejectedValue(err);

    const { getDashboardMetrics } = await import("../api-dashboard-metrics");

    await expect(getDashboardMetrics()).rejects.toThrow("Tauri backend error");
    expect(mockInvoke).toHaveBeenCalledWith("get_dashboard_metrics", {});
  });

  it("propagates error when fetch returns ok but json() rejects (browser branch)", async () => {
    mockIsTauri = false;
    const jsonError = new Error("Invalid JSON");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(jsonError),
    });
    globalThis.fetch = fetchMock;

    const { getDashboardMetrics } = await import("../api-dashboard-metrics");

    await expect(getDashboardMetrics()).rejects.toThrow("Invalid JSON");
    expect(fetchMock).toHaveBeenCalledWith("/api/data/dashboard-metrics");
  });
});
