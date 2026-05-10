/**
 * Display helpers for Project Files table (extensions, permission strings).
 */
import { describe, it, expect } from "vitest";
import {
  parseFilenameExtension,
  formatUnixPermissionString,
  fileEntryKindLabel,
} from "../project-files-display";
import type { FileEntry } from "../api-projects";

describe("parseFilenameExtension", () => {
  it("returns lowercase extension after last dot", () => {
    expect(parseFilenameExtension("foo.ts")).toBe("ts");
    expect(parseFilenameExtension("Component.tsx")).toBe("tsx");
  });

  it("returns empty for dotfiles without further extension", () => {
    expect(parseFilenameExtension(".gitignore")).toBe("");
    expect(parseFilenameExtension(".env")).toBe("");
  });

  it("returns segment after dot for multi-dot names", () => {
    expect(parseFilenameExtension(".env.local")).toBe("local");
    expect(parseFilenameExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns empty when no extension", () => {
    expect(parseFilenameExtension("Makefile")).toBe("");
    expect(parseFilenameExtension("")).toBe("");
  });
});

describe("formatUnixPermissionString", () => {
  it("formats 0644 file as -rw-r--r--", () => {
    expect(
      formatUnixPermissionString(0o100644, {
        isDirectory: false,
        isSymbolicLink: false,
      })
    ).toBe("-rw-r--r--");
  });

  it("formats 0755 directory as drwxr-xr-x", () => {
    expect(
      formatUnixPermissionString(0o40755, {
        isDirectory: true,
        isSymbolicLink: false,
      })
    ).toBe("drwxr-xr-x");
  });

  it("uses l prefix for symlinks", () => {
    expect(
      formatUnixPermissionString(0o120777, {
        isDirectory: false,
        isSymbolicLink: true,
      })
    ).toMatch(/^l/);
  });
});

describe("fileEntryKindLabel", () => {
  it("labels folders", () => {
    const e: FileEntry = {
      name: "src",
      isDirectory: true,
      size: 0,
      updatedAt: "",
    };
    expect(fileEntryKindLabel(e)).toBe("Folder");
  });

  it("labels symlinks", () => {
    const e: FileEntry = {
      name: "node_modules",
      isDirectory: false,
      isSymbolicLink: true,
      size: 0,
      updatedAt: "",
    };
    expect(fileEntryKindLabel(e)).toBe("Symlink");
  });

  it("shows extension uppercased for files", () => {
    const e: FileEntry = {
      name: "app.tsx",
      isDirectory: false,
      size: 10,
      updatedAt: "",
    };
    expect(fileEntryKindLabel(e)).toBe("TSX");
  });

  it("shows File when no extension", () => {
    const e: FileEntry = {
      name: "Dockerfile",
      isDirectory: false,
      size: 10,
      updatedAt: "",
    };
    expect(fileEntryKindLabel(e)).toBe("File");
  });
});
