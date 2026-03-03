/**
 * Unit tests for csv-helpers: RFC 4180-style CSV field escaping.
 */
import { describe, it, expect } from "vitest";
import { escapeCsvField } from "../csv-helpers";

describe("escapeCsvField", () => {
  it("returns value unchanged when it contains no comma, newline, or double-quote", () => {
    expect(escapeCsvField("hello")).toBe("hello");
    expect(escapeCsvField("title")).toBe("title");
    expect(escapeCsvField("")).toBe("");
  });

  it("wraps in double-quotes when value contains comma", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField("one,two,three")).toBe('"one,two,three"');
  });

  it("wraps in double-quotes when value contains newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("a\r\nb")).toBe('"a\r\nb"');
  });

  it("doubles internal double-quotes and wraps in quotes", () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvField('""')).toBe('""""""');
  });

  it("handles null/undefined by stringifying to empty string", () => {
    expect(escapeCsvField(null as unknown as string)).toBe("");
    expect(escapeCsvField(undefined as unknown as string)).toBe("");
  });

  it("handles numeric-like strings (no quoting if no special chars)", () => {
    expect(escapeCsvField("123")).toBe("123");
    expect(escapeCsvField("3.14")).toBe("3.14");
  });

  it("quotes field that contains comma and double-quote", () => {
    expect(escapeCsvField('a,b"c')).toBe('"a,b""c"');
  });
});
