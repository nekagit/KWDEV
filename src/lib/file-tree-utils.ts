/**
 * Builds a Cursor-style file tree from flat file lists; used by versioning and project file views.
 */
import { type CursorFileEntry, type CursorTreeFolder, type CursorTreeFile, type CursorTreeNode } from "@/types/file-tree";
import { normalizePath } from "@/lib/utils";

export function buildTree(
  cursorFiles: CursorFileEntry[],
  repoPath: string
): CursorTreeFolder | null {
  const normRepo = normalizePath(repoPath.trim().replace(/\/$/, ""));
  const base = normRepo + "/";
  let relativePaths = cursorFiles
    .map((f) => {
      const full = normalizePath(f.path);
      if (!full.startsWith(base)) return null;
      return full.slice(base.length);
    })
    .filter((p): p is string => p != null && p.length > 0);

  relativePaths = relativePaths.map((p) =>
    p.startsWith(".cursor/") ? p.slice(".cursor/".length) : p
  );

  if (relativePaths.length === 0) return null;

  const root: CursorTreeFolder = {
    type: "folder",
    name: ".cursor",
    path: ".cursor",
    children: [],
  };

  function ensureFolder(parent: CursorTreeFolder, segment: string): CursorTreeFolder {
    let child = parent.children.find(
      (c): c is CursorTreeFolder => c.type === "folder" && c.name === segment
    );
    if (!child) {
      const folderPath = parent.path + "/" + segment;
      child = { type: "folder", name: segment, path: folderPath, children: [] };
      parent.children.push(child);
    }
    return child;
  }

  for (const rel of relativePaths) {
    const segments = rel.split("/");
    if (segments.length === 1) {
      root.children.push({
        type: "file",
        name: segments[0],
        path: ".cursor/" + rel,
      });
    } else {
      let parent: CursorTreeFolder = root;
      for (let i = 0; i < segments.length - 1; i++) {
        parent = ensureFolder(parent, segments[i]);
      }
      parent.children.push({
        type: "file",
        name: segments[segments.length - 1],
        path: ".cursor/" + rel,
      });
    }
  }

  sortNode(root);
  return root;
}

export function sortNode(node: CursorTreeNode): void {
  if (node.type === "folder") {
    node.children.sort((a, b) => {
      const aIsFolder = a.type === "folder" ? 1 : 0;
      const bIsFolder = b.type === "folder" ? 1 : 0;
      if (aIsFolder !== bIsFolder) return aIsFolder - bIsFolder;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    node.children.forEach(sortNode);
  }
}

/**
 * Build a single root folder whose children are the top-level nodes of a tree
 * built from relative file paths (e.g. ["src/app/page.tsx", "src/lib/utils.ts"]).
 * Use root.children to render the tree; root itself is not rendered.
 */
export function buildTreeFromRelativePaths(paths: string[]): CursorTreeFolder {
  const root: CursorTreeFolder = {
    type: "folder",
    name: "",
    path: "",
    children: [],
  };

  function ensureFolder(parent: CursorTreeFolder, segment: string): CursorTreeFolder {
    let child = parent.children.find(
      (c): c is CursorTreeFolder => c.type === "folder" && c.name === segment
    );
    if (!child) {
      const folderPath = parent.path ? `${parent.path}/${segment}` : segment;
      child = { type: "folder", name: segment, path: folderPath, children: [] };
      parent.children.push(child);
    }
    return child;
  }

  for (const rel of paths) {
    const trimmed = rel.trim();
    if (!trimmed) continue;
    const segments = trimmed.split("/").filter(Boolean);
    if (segments.length === 1) {
      root.children.push({
        type: "file",
        name: segments[0],
        path: segments[0],
      });
    } else {
      let parent: CursorTreeFolder = root;
      for (let i = 0; i < segments.length - 1; i++) {
        parent = ensureFolder(parent, segments[i]);
      }
      const filePath = segments.join("/");
      parent.children.push({
        type: "file",
        name: segments[segments.length - 1],
        path: filePath,
      });
    }
  }

  sortNode(root);
  return root;
}
