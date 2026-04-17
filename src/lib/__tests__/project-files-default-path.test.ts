import { describe, expect, it } from "vitest";
import { getDefaultProjectFilesPath } from "@/lib/project-files-default-path";

describe("getDefaultProjectFilesPath", () => {
  it("defaults to repository root so all project files are visible first", () => {
    expect(getDefaultProjectFilesPath()).toBe("");
  });
});
