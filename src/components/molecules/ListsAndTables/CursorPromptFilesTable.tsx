"use client";

/** Cursor Prompt Files Table component. */
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";
import { getClasses } from "@/components/molecules/tailwind-molecules";

const classes = getClasses("ListsAndTables/CursorPromptFilesTable");

export type CursorPromptFileEntry = {
  relativePath: string;
  path: string;
  name: string;
  size: number;
  updatedAt: string;
};

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

interface CursorPromptFilesTableProps {
  files: CursorPromptFileEntry[];
  loading: boolean;
  onRefresh: () => void;
  onView: (entry: CursorPromptFileEntry) => void;
}

export function CursorPromptFilesTable({
  files,
  loading,
  onRefresh,
  onView,
}: CursorPromptFilesTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          All <code className="rounded bg-muted px-1 py-0.5 text-xs">*.prompt.md</code> files under{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.cursor</code>. Kept in sync with the repo.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          <span className="ml-2">Refresh</span>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Path</TableHead>
            <TableHead className="hidden sm:table-cell">Name</TableHead>
            <TableHead className="hidden md:table-cell w-20">Size</TableHead>
            <TableHead className="hidden lg:table-cell w-24">Updated</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                Loading…
              </TableCell>
            </TableRow>
          ) : files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className={classes[0] ?? "text-muted-foreground text-center py-8"}>
                No <code className="rounded bg-muted px-1 py-0.5 text-xs">.prompt.md</code> files found in .cursor.
              </TableCell>
            </TableRow>
          ) : (
            files.map((entry) => (
              <TableRow key={entry.relativePath}>
                <TableCell className="font-mono text-xs truncate max-w-[200px]" title={entry.path}>
                  {entry.path}
                </TableCell>
                <TableCell className="hidden sm:table-cell font-mono text-xs">
                  {entry.name}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {formatSize(entry.size)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {formatUpdatedAt(entry.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => onView(entry)}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="ml-1.5 sr-only sm:not-sr-only">View</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
