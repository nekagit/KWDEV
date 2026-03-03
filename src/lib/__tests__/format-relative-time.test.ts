/**
 * Unit tests for src/lib/format-relative-time.ts.
 * Uses vi.useFakeTimers for deterministic "now" so relative time boundaries are testable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "../format-relative-time";

const MS_SEC = 1000;
const MS_MIN = 60 * MS_SEC;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

/** Fixed "now" for tests (midnight 2001-09-09 UTC). */
const NOW = 1000000000000;

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" when diff is zero', () => {
    expect(formatRelativeTime(NOW)).toBe("just now");
  });

  it('returns "just now" when diff is under 1 minute', () => {
    expect(formatRelativeTime(NOW - 30 * MS_SEC)).toBe("just now");
    expect(formatRelativeTime(NOW - 59 * MS_SEC)).toBe("just now");
  });

  it('returns "X min ago" when diff is at least 1 minute and under 1 hour', () => {
    expect(formatRelativeTime(NOW - 1 * MS_MIN)).toBe("1 min ago");
    expect(formatRelativeTime(NOW - 5 * MS_MIN)).toBe("5 min ago");
    expect(formatRelativeTime(NOW - 59 * MS_MIN)).toBe("59 min ago");
  });

  it('returns "X h ago" when diff is at least 1 hour and under 1 day', () => {
    expect(formatRelativeTime(NOW - 1 * MS_HOUR)).toBe("1 h ago");
    expect(formatRelativeTime(NOW - 12 * MS_HOUR)).toBe("12 h ago");
    expect(formatRelativeTime(NOW - 23 * MS_HOUR)).toBe("23 h ago");
  });

  it('returns "1 day ago" when diff is exactly 1 day', () => {
    expect(formatRelativeTime(NOW - 1 * MS_DAY)).toBe("1 day ago");
  });

  it('returns "X days ago" when diff is more than 1 day', () => {
    expect(formatRelativeTime(NOW - 2 * MS_DAY)).toBe("2 days ago");
    expect(formatRelativeTime(NOW - 7 * MS_DAY)).toBe("7 days ago");
  });

  it('returns "just now" for future timestamp (diff clamped to 0)', () => {
    expect(formatRelativeTime(NOW + MS_SEC)).toBe("just now");
    expect(formatRelativeTime(NOW + MS_DAY)).toBe("just now");
  });

  it("uses correct boundary between just now and min ago", () => {
    expect(formatRelativeTime(NOW - 60 * MS_SEC)).toBe("1 min ago");
  });

  it("uses correct boundary between min ago and h ago", () => {
    expect(formatRelativeTime(NOW - 60 * MS_MIN)).toBe("1 h ago");
  });

  it("uses correct boundary between h ago and day(s) ago", () => {
    expect(formatRelativeTime(NOW - 24 * MS_HOUR)).toBe("1 day ago");
  });
});
