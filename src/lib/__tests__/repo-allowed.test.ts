/**
 * Unit tests for repo-allowed (API access path validation).
 */
import { describe, it, expect } from "vitest";
import path from "path";
import { repoAllowed } from "../repo-allowed";

describe("repoAllowed", () => {
  it("returns true when repo is inside app directory (cwd)", () => {
    const cwd = path.resolve("/app/kwcode");
    const repo = path.resolve("/app/kwcode");
    expect(repoAllowed(repo, cwd)).toBe(true);
  });

  it("returns true when repo is a subdirectory of cwd", () => {
    const cwd = path.resolve("/app/kwcode");
    const repo = path.resolve("/app/kwcode/projects/my-project");
    expect(repoAllowed(repo, cwd)).toBe(true);
  });

  it("returns true when repo is sibling of cwd (same parent directory)", () => {
    const cwd = path.resolve("/Users/me/Documents/February/KW-February-KWCode");
    const repo = path.resolve("/Users/me/Documents/February/Other-Project");
    expect(repoAllowed(repo, cwd)).toBe(true);
  });

  it("returns false when repo is in a different parent tree", () => {
    const cwd = path.resolve("/app/kwcode");
    const repo = path.resolve("/tmp/other-repo");
    expect(repoAllowed(repo, cwd)).toBe(false);
  });

  it("returns false when repo is parent of cwd (repo not under cwd, not sibling)", () => {
    const cwd = path.resolve("/app/kwcode/sub");
    const repo = path.resolve("/app");
    expect(repoAllowed(repo, cwd)).toBe(false);
  });

  it("returns true when cwd and repo are the same path", () => {
    const cwd = path.resolve("/app/kwcode");
    const repo = path.resolve("/app/kwcode");
    expect(repoAllowed(repo, cwd)).toBe(true);
  });

  it("returns false when repo is in unrelated path", () => {
    const cwd = path.resolve("/Users/me/February/KWCode");
    const repo = path.resolve("/opt/var/other");
    expect(repoAllowed(repo, cwd)).toBe(false);
  });
});
