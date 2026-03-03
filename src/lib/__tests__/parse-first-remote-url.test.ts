/**
 * Unit tests for parse-first-remote-url: parsing git remote -v output for first http(s) URL.
 * Used by CommandPalette to open the first project's Git remote in the browser.
 */
import { describe, it, expect } from "vitest";
import { parseFirstRemoteUrl } from "../parse-first-remote-url";

describe("parseFirstRemoteUrl", () => {
  it("returns first https URL and strips .git suffix from typical git remote -v output", () => {
    const remotes =
      "origin  https://github.com/user/repo.git (fetch)\norigin  https://github.com/user/repo.git (push)";
    expect(parseFirstRemoteUrl(remotes)).toBe("https://github.com/user/repo");
  });

  it("returns first http URL when present", () => {
    const remotes = "origin  http://git.example.com/proj.git (fetch)";
    expect(parseFirstRemoteUrl(remotes)).toBe("http://git.example.com/proj");
  });

  it("returns URL without .git suffix unchanged", () => {
    const remotes = "origin  https://github.com/org/name (fetch)";
    expect(parseFirstRemoteUrl(remotes)).toBe("https://github.com/org/name");
  });

  it("returns null for empty string", () => {
    expect(parseFirstRemoteUrl("")).toBe(null);
  });

  it("returns null for whitespace-only string", () => {
    expect(parseFirstRemoteUrl("   ")).toBe(null);
    expect(parseFirstRemoteUrl("\n\t  \n")).toBe(null);
  });

  it("returns null when remotes contains no http(s) URL (e.g. SSH only)", () => {
    const remotes = "origin  git@github.com:user/repo.git (fetch)";
    expect(parseFirstRemoteUrl(remotes)).toBe(null);
  });

  it("returns first URL when multiple remotes exist", () => {
    const remotes =
      "origin  https://github.com/first/repo.git (fetch)\nupstream  https://github.com/upstream/repo.git (fetch)";
    expect(parseFirstRemoteUrl(remotes)).toBe("https://github.com/first/repo");
  });

  it("stops at first space after URL (fetch/push suffix not included)", () => {
    const remotes = "origin  https://example.com/repo.git  (fetch)";
    expect(parseFirstRemoteUrl(remotes)).toBe("https://example.com/repo");
  });

  it("returns null for non-string input (defensive)", () => {
    expect(parseFirstRemoteUrl(null as unknown as string)).toBe(null);
    expect(parseFirstRemoteUrl(undefined as unknown as string)).toBe(null);
  });

  it("handles single-line remote output", () => {
    const remotes = "origin  https://gitlab.com/group/project.git (fetch)";
    expect(parseFirstRemoteUrl(remotes)).toBe("https://gitlab.com/group/project");
  });

  it("trims leading/trailing whitespace from input before matching", () => {
    const remotes = "  \n  origin  https://github.com/a/b.git (fetch)  \n  ";
    expect(parseFirstRemoteUrl(remotes)).toBe("https://github.com/a/b");
  });
});
