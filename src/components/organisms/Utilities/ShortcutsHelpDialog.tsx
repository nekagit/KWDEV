"use client";

/** Shortcuts Help Dialog component. */
import { useState, useMemo, useRef } from "react";
import { useShortcutsHelpFocusFilterShortcut } from "@/lib/shortcuts-help-focus-filter-shortcut";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KEYBOARD_SHORTCUT_GROUPS, type ShortcutGroup } from "@/data/keyboard-shortcuts";
import {
  formatKeyboardShortcutsAsPlainText,
  downloadKeyboardShortcutsAsMarkdown,
  copyKeyboardShortcutsAsMarkdownToClipboard,
  downloadKeyboardShortcutsAsJson,
  copyKeyboardShortcutsAsJsonToClipboard,
  downloadKeyboardShortcutsAsCsv,
  copyKeyboardShortcutsAsCsvToClipboard,
} from "@/lib/export-keyboard-shortcuts";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { Keyboard, Copy, Download, FileJson, FileSpreadsheet, Search, X } from "lucide-react";

function filterShortcutGroups(groups: ShortcutGroup[], query: string): ShortcutGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        (entry) =>
          entry.keys.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q)
      ),
    }))
    .filter((group) => group.shortcuts.length > 0);
}

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const totalShortcutCount = KEYBOARD_SHORTCUT_GROUPS.reduce(
  (acc, group) => acc + group.shortcuts.length,
  0
);

export function ShortcutsHelpDialog({ open, onOpenChange }: ShortcutsHelpDialogProps) {
  const filterInputRef = useRef<HTMLInputElement>(null);
  useShortcutsHelpFocusFilterShortcut(filterInputRef, open);
  const [filterQuery, setFilterQuery] = useState("");
  const filteredGroups = useMemo(
    () => filterShortcutGroups(KEYBOARD_SHORTCUT_GROUPS, filterQuery),
    [filterQuery]
  );
  const filteredShortcutCount = useMemo(
    () => filteredGroups.reduce((acc, group) => acc + group.shortcuts.length, 0),
    [filteredGroups]
  );
  const trimmedQuery = filterQuery.trim();
  const hasFilter = trimmedQuery.length > 0;
  const noMatches = hasFilter && filteredGroups.length === 0;
  const showCount = hasFilter && !noMatches;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        aria-describedby="shortcuts-help-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden />
            Keyboard shortcuts ({totalShortcutCount})
          </DialogTitle>
        </DialogHeader>
        <div id="shortcuts-help-description" className="sr-only">
          List of keyboard shortcuts available in the app.
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              ref={filterInputRef}
              type="text"
              placeholder="Filter by action or keys…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              aria-label="Filter shortcuts by action or keys"
            />
          </div>
          {hasFilter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilterQuery("")}
              className="h-8 gap-1.5"
              aria-label="Clear filter"
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          )}
          {showCount && (
            <span className="text-xs text-muted-foreground self-center">
              Showing {filteredShortcutCount} of {totalShortcutCount} shortcuts
            </span>
          )}
        </div>
        <div className="overflow-auto flex-1 min-h-0 -mx-1 px-1">
          {noMatches ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No shortcuts match &quot;{trimmedQuery}&quot;.
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.title} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {group.title}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Keys</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.shortcuts.map((entry, i) => (
                      <TableRow key={`${group.title}-${i}`}>
                        <TableCell className="font-mono text-sm">
                          {entry.keys}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="flex-shrink-0 gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              copyTextToClipboard(formatKeyboardShortcutsAsPlainText())
            }
            className="gap-2"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy list
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyKeyboardShortcutsAsMarkdownToClipboard()}
            className="gap-2"
            title="Copy as Markdown (same format as Download)"
            aria-label="Copy keyboard shortcuts as Markdown"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy as Markdown
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadKeyboardShortcutsAsMarkdown()}
            className="gap-2"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download as Markdown
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyKeyboardShortcutsAsJsonToClipboard()}
            className="gap-2"
            title="Copy as JSON (same data as Download as JSON)"
            aria-label="Copy keyboard shortcuts as JSON"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy as JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadKeyboardShortcutsAsJson()}
            className="gap-2"
            title="Download keyboard shortcuts as JSON"
            aria-label="Download keyboard shortcuts as JSON"
          >
            <FileJson className="h-4 w-4" aria-hidden />
            Download as JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyKeyboardShortcutsAsCsvToClipboard()}
            className="gap-2"
            title="Copy as CSV (same format as Download as CSV)"
            aria-label="Copy keyboard shortcuts as CSV"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy as CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadKeyboardShortcutsAsCsv()}
            className="gap-2"
            title="Download keyboard shortcuts as CSV"
            aria-label="Download keyboard shortcuts as CSV"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Download as CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
