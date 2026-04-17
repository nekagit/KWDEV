import { describe, expect, it } from "vitest";
import { generateCommitMessageFromGitContext } from "@/lib/project-git-commit-message";

describe("generateCommitMessageFromGitContext", () => {
  it("uses recent changelog style and top area summary", () => {
    const result = generateCommitMessageFromGitContext(
      [
        " M src/components/organisms/Tabs/ProjectGitTab.tsx",
        " M src/components/templates/AppShell.tsx",
        "?? src/lib/project-git-commit-message.ts",
      ],
      [
        "feat(versioning): add export for changed files",
        "fix(worker): stop loop on exit",
      ],
    );

    expect(result).toBe("feat(versioning): update 3 files across components, lib");
  });

  it("falls back to generic update message when there are no changed files", () => {
    const result = generateCommitMessageFromGitContext([], []);
    expect(result).toBe("Update");
  });
});
