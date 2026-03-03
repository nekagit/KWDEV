/**
 * Unit tests for src/lib/format-timestamp.ts
 */
import { describe, it, expect } from "vitest";
import { formatTimestampShort, formatTimestampFull } from "../format-timestamp";

describe("formatTimestampShort", () => {
  it("formats valid ISO string as short date and medium time", () => {
    const result = formatTimestampShort("2026-02-18T14:30:45.000Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result).not.toBe("2026-02-18T14:30:45.000Z");
  });

  it("returns original string for invalid ISO", () => {
    expect(formatTimestampShort("not-a-date")).toBe("not-a-date");
    expect(formatTimestampShort("")).toBe("");
  });

  it("returns original string when date is invalid (NaN getTime)", () => {
    expect(formatTimestampShort("Invalid Date")).toBe("Invalid Date");
  });
});

describe("formatTimestampFull", () => {
  it("formats valid ISO string as long date and medium time", () => {
    const result = formatTimestampFull("2026-02-18T14:30:45.000Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result).not.toBe("2026-02-18T14:30:45.000Z");
  });

  it("returns original string for invalid ISO", () => {
    expect(formatTimestampFull("not-a-date")).toBe("not-a-date");
    expect(formatTimestampFull("")).toBe("");
  });

  it("returns original string when date is invalid (NaN getTime)", () => {
    expect(formatTimestampFull("Invalid Date")).toBe("Invalid Date");
  });

  it("full form is at least as long as short form for same input", () => {
    const iso = "2026-02-18T14:30:45.000Z";
    const short = formatTimestampShort(iso);
    const full = formatTimestampFull(iso);
    expect(full.length).toBeGreaterThanOrEqual(short.length);
  });
});
