/**
 * Types for Cursor-style file tree (folders, files) used in versioning and project file views.
 */
export type CursorFileEntry = { name: string; path: string };

export type CursorTreeFolder = {
  type: "folder";
  name: string;
  path: string;
  children: CursorTreeNode[];
};

export type CursorTreeFile = {
  type: "file";
  name: string;
  path: string;
};

export type CursorTreeNode = CursorTreeFolder | CursorTreeFile;
