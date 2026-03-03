/**
 * Unit tests for file-tree-utils (buildTree, sortNode).
 */
import { describe, it, expect } from "vitest";
import { buildTree, sortNode } from "../file-tree-utils";
import type { CursorTreeFolder, CursorTreeNode } from "@/types/file-tree";

describe("buildTree", () => {
  const repo = "/repo";

  it("returns null for empty files array", () => {
    expect(buildTree([], repo)).toBeNull();
  });

  it("returns null when no file path is under repo path", () => {
    expect(
      buildTree(
        [{ name: "other", path: "/other/.cursor/foo.md" }],
        repo
      )
    ).toBeNull();
  });

  it("builds root with single file under .cursor", () => {
    const tree = buildTree(
      [{ name: "foo.md", path: "/repo/.cursor/foo.md" }],
      repo
    );
    expect(tree).not.toBeNull();
    expect(tree!.type).toBe("folder");
    expect(tree!.name).toBe(".cursor");
    expect(tree!.path).toBe(".cursor");
    expect(tree!.children).toHaveLength(1);
    expect(tree!.children[0]).toEqual({
      type: "file",
      name: "foo.md",
      path: ".cursor/foo.md",
    });
  });

  it("strips .cursor/ from relative paths and builds flat files", () => {
    const tree = buildTree(
      [
        { name: "a.md", path: "/repo/.cursor/a.md" },
        { name: "b.md", path: "/repo/.cursor/b.md" },
      ],
      repo
    );
    expect(tree).not.toBeNull();
    expect(tree!.children).toHaveLength(2);
    const names = tree!.children.map((c) => c.name).sort();
    expect(names).toEqual(["a.md", "b.md"]);
  });

  it("builds nested folders for path with slashes", () => {
    const tree = buildTree(
      [{ name: "readme.md", path: "/repo/.cursor/adr/readme.md" }],
      repo
    );
    expect(tree).not.toBeNull();
    expect(tree!.children).toHaveLength(1);
    const adr = tree!.children[0];
    expect(adr.type).toBe("folder");
    expect(adr.name).toBe("adr");
    expect((adr as { path: string }).path).toBe(".cursor/adr");
    const folderChildren = (adr as { children: CursorTreeNode[] }).children;
    expect(folderChildren).toHaveLength(1);
    expect(folderChildren[0]).toEqual({
      type: "file",
      name: "readme.md",
      path: ".cursor/adr/readme.md",
    });
  });

  it("normalizes repo path (trim and trailing slash)", () => {
    const tree = buildTree(
      [{ name: "x.md", path: "/repo/.cursor/x.md" }],
      "  /repo/  "
    );
    expect(tree).not.toBeNull();
    expect(tree!.children.some((c) => c.name === "x.md")).toBe(true);
  });

  it("normalizes Windows-style backslash paths (repo and file paths)", () => {
    const tree = buildTree(
      [{ name: "foo.md", path: "C:\\repo\\.cursor\\foo.md" }],
      "C:\\repo"
    );
    expect(tree).not.toBeNull();
    expect(tree!.children).toHaveLength(1);
    expect(tree!.children[0]).toEqual({
      type: "file",
      name: "foo.md",
      path: ".cursor/foo.md",
    });
  });

  it("sorts children (folders vs files and by name)", () => {
    const tree = buildTree(
      [
        { name: "z.md", path: "/repo/.cursor/z.md" },
        { name: "a.md", path: "/repo/.cursor/a.md" },
        { name: "sub", path: "/repo/.cursor/sub/file.md" },
      ],
      repo
    );
    expect(tree).not.toBeNull();
    // sortNode: files first (0), then folders (1) by current impl; then name
    const names = tree!.children.map((c) => c.name);
    expect(names).toContain("a.md");
    expect(names).toContain("z.md");
    expect(names).toContain("sub");
  });
});

describe("sortNode", () => {
  it("sorts folder children (files vs folders, then by name)", () => {
    const node: CursorTreeFolder = {
      type: "folder",
      name: "root",
      path: ".cursor",
      children: [
        { type: "file", name: "b.md", path: ".cursor/b.md" },
        { type: "folder", name: "sub", path: ".cursor/sub", children: [] },
        { type: "file", name: "a.md", path: ".cursor/a.md" },
      ],
    };
    sortNode(node);
    const names = node.children.map((c) => c.name);
    // Implementation: files (0) before folders (1), then localeCompare
    expect(names).toContain("a.md");
    expect(names).toContain("b.md");
    expect(names).toContain("sub");
    const fileNames = node.children.filter((c) => c.type === "file").map((c) => c.name);
    expect(fileNames).toEqual(["a.md", "b.md"]);
  });

  it("recursively sorts nested folder children", () => {
    const node: CursorTreeFolder = {
      type: "folder",
      name: "root",
      path: ".cursor",
      children: [
        {
          type: "folder",
          name: "nested",
          path: ".cursor/nested",
          children: [
            { type: "file", name: "b.md", path: ".cursor/nested/b.md" },
            { type: "file", name: "a.md", path: ".cursor/nested/a.md" },
          ],
        },
      ],
    };
    sortNode(node);
    const nested = node.children[0] as CursorTreeFolder;
    const innerNames = nested.children.map((c) => c.name);
    expect(innerNames).toEqual(["a.md", "b.md"]);
  });
});
