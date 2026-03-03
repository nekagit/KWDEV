/**
 * Unit tests for src/lib/utils.ts helpers used across the app.
 */
import { describe, it, expect } from "vitest";
import {
  cn,
  humanizeAgentId,
  normalizePath,
  scatter,
  formatDate,
  getApiErrorMessage,
} from "../utils";

describe("cn", () => {
  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("merges multiple class strings", () => {
    const result = cn("a", "b");
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  it("skips falsy values (undefined, null, false)", () => {
    const result = cn("base", undefined, "extra", null, false);
    expect(result).toContain("base");
    expect(result).toContain("extra");
  });

  it("tailwind-merge deduplicates conflicting utilities (last wins)", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toContain("py-1");
    expect(result).toContain("px-4");
    expect(result).not.toContain("px-2");
  });
});

describe("humanizeAgentId", () => {
  it("converts kebab-case to Title Case", () => {
    expect(humanizeAgentId("frontend-dev")).toBe("Frontend Dev");
  });

  it("converts snake_case to Title Case", () => {
    expect(humanizeAgentId("backend_dev")).toBe("Backend Dev");
  });

  it("handles mixed separators", () => {
    expect(humanizeAgentId("solution-architect")).toBe("Solution Architect");
  });

  it("handles single word", () => {
    expect(humanizeAgentId("tester")).toBe("Tester");
  });

  it("handles empty string", () => {
    expect(humanizeAgentId("")).toBe("");
  });

  it("handles consecutive separators (double hyphen)", () => {
    expect(humanizeAgentId("frontend--dev")).toBe("Frontend  Dev");
  });

  it("handles consecutive underscores", () => {
    expect(humanizeAgentId("a__b")).toBe("A  B");
  });
});

describe("normalizePath", () => {
  it("replaces backslashes with forward slashes", () => {
    expect(normalizePath("C:\\Users\\project")).toBe("C:/Users/project");
  });

  it("leaves forward slashes unchanged", () => {
    expect(normalizePath("/home/user/project")).toBe("/home/user/project");
  });

  it("handles mixed slashes", () => {
    expect(normalizePath("C:\\foo/bar\\baz")).toBe("C:/foo/bar/baz");
  });

  it("handles empty string", () => {
    expect(normalizePath("")).toBe("");
  });
});

describe("scatter", () => {
  it("returns value in 0..1 for index and prime", () => {
    const v = scatter(0, 7, 10);
    expect(v).toBe(0);
    expect(scatter(1, 7, 10)).toBe(0.7);
    expect(scatter(2, 7, 10)).toBe(0.4);
  });

  it("uses modulo so result is always in [0, 1)", () => {
    for (let i = 0; i < 20; i++) {
      const v = scatter(i, 31, 100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("returns 0 when mod is 0 (avoids division by zero)", () => {
    expect(scatter(0, 7, 0)).toBe(0);
    expect(scatter(5, 11, 0)).toBe(0);
  });
});

describe("formatDate", () => {
  it("formats valid ISO string as date and time", () => {
    const result = formatDate("2025-02-17T14:30:00.000Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result).toMatch(/\d/);
  });

  it("returns original string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("returns original string for empty string", () => {
    expect(formatDate("")).toBe("");
  });

  it("returns original string for invalid calendar date (e.g. Feb 30)", () => {
    // new Date("2025-02-30") does not throw but yields Invalid Date (NaN)
    expect(formatDate("2025-02-30")).toBe("2025-02-30");
  });

  it("returns original string when input is literal 'Invalid Date' (e.g. from API)", () => {
    // new Date("Invalid Date") yields Invalid Date; we return iso unchanged
    expect(formatDate("Invalid Date")).toBe("Invalid Date");
  });
});

describe("getApiErrorMessage", () => {
  it("returns JSON error field when present", async () => {
    const res = new Response('{"error":"Something failed"}');
    expect(await getApiErrorMessage(res)).toBe("Something failed");
  });

  it("returns JSON detail field when error is missing", async () => {
    const res = new Response('{"detail":"Validation failed"}');
    expect(await getApiErrorMessage(res)).toBe("Validation failed");
  });

  it("prefers error over detail when both present", async () => {
    const res = new Response('{"error":"Primary","detail":"Secondary"}');
    expect(await getApiErrorMessage(res)).toBe("Primary");
  });

  it("replaces Internal Server Error with friendly message (error field)", async () => {
    const res = new Response('{"error":"Internal Server Error"}', { status: 500 });
    expect(await getApiErrorMessage(res)).toBe("Server error loading data");
  });

  it("replaces Internal Server Error with friendly message (detail field)", async () => {
    const res = new Response('{"detail":"Internal Server Error"}');
    expect(await getApiErrorMessage(res)).toBe("Server error loading data");
  });

  it("returns status text when body is empty and status is not 500", async () => {
    const res = new Response("", { status: 404, statusText: "Not Found" });
    expect(await getApiErrorMessage(res)).toBe("Not Found");
  });

  it("returns friendly message for 500 with empty body", async () => {
    const res = new Response("", { status: 500 });
    expect(await getApiErrorMessage(res)).toBe("Server error loading data");
  });

  it("returns trimmed body for non-JSON response with text", async () => {
    const res = new Response("  Connection refused  ");
    expect(await getApiErrorMessage(res)).toBe("Connection refused");
  });

  it("truncates long non-JSON body to 200 characters", async () => {
    const longBody = "x".repeat(300);
    const res = new Response(longBody, { status: 500 });
    const msg = await getApiErrorMessage(res);
    expect(msg).toHaveLength(200);
    expect(msg).toBe("x".repeat(200));
  });

  it("returns friendly message when non-JSON body is Internal Server Error", async () => {
    const res = new Response("  Internal Server Error  ");
    expect(await getApiErrorMessage(res)).toBe("Server error loading data");
  });

  it("returns Request failed when body is empty and statusText is empty", async () => {
    const res = new Response("", { status: 400, statusText: "" });
    expect(await getApiErrorMessage(res)).toBe("Request failed");
  });

  it("ignores non-string error and returns trimmed body", async () => {
    const res = new Response('{"error":500}', { status: 500 });
    expect(await getApiErrorMessage(res)).toBe('{"error":500}');
  });

  it("ignores non-string detail and falls back to status/body", async () => {
    const res = new Response('{"detail":{}}', { status: 502 });
    expect(await getApiErrorMessage(res)).toBe('{"detail":{}}');
  });

  it("falls back to trimmed body when JSON error is empty string", async () => {
    const res = new Response('{"error":""}');
    expect(await getApiErrorMessage(res)).toBe('{"error":""}');
  });

  it("returns trimmed body when JSON has no error or detail (e.g. empty object)", async () => {
    const res = new Response("{}", { status: 500 });
    expect(await getApiErrorMessage(res)).toBe("{}");
  });

  it("returns whitespace-only error string as-is (no trim)", async () => {
    const res = new Response('{"error":"   "}');
    expect(await getApiErrorMessage(res)).toBe("   ");
  });

  it("returns trimmed body when JSON has unescapable control chars in detail", async () => {
    const res = new Response('{"detail":"\t\n"}', { status: 400 });
    // JSON.parse rejects literal control chars in strings per spec; falls to body path
    expect(await getApiErrorMessage(res)).toBe('{"detail":"\t\n"}');
  });

  it("returns status-based message when body is whitespace-only non-JSON", async () => {
    const res500 = new Response("   \n\t  ", { status: 500 });
    expect(await getApiErrorMessage(res500)).toBe("Server error loading data");
    const res404 = new Response("   ", { status: 404, statusText: "Not Found" });
    expect(await getApiErrorMessage(res404)).toBe("Not Found");
  });
});
