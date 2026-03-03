/** Table row for a prompt in the prompts table. */
import React, { useCallback, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Copy, Check, Eye, Hash, Play, CopyPlus } from "lucide-react";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "sonner";

type PromptRecord = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

interface PromptTableRowProps {
  prompt: PromptRecord;
  selectedPromptIds: number[];
  setSelectedPromptIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleDelete: (id: number) => void;
  setEditOpen: (open: boolean) => void;
  setFormId: (id: number | undefined) => void;
  setFormTitle: (title: string) => void;
  setFormContent: (content: string) => void;
  onViewPrompt?: (prompt: PromptRecord) => void;
  onRunPrompt?: (prompt: PromptRecord) => void;
  onDuplicatePrompt?: (prompt: PromptRecord) => void;
}

export const PromptTableRow: React.FC<PromptTableRowProps> = ({
  prompt: p,
  selectedPromptIds,
  setSelectedPromptIds,
  handleDelete,
  setEditOpen,
  setFormId,
  setFormTitle,
  setFormContent,
  onViewPrompt,
  onRunPrompt,
  onDuplicatePrompt,
}) => {
  const [copied, setCopied] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleCopyId = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (p.id == null || p.id === undefined) {
        toast.error("No prompt ID to copy");
        return;
      }
      copyTextToClipboard(String(p.id));
    },
    [p.id]
  );

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = p.content ?? "";
      const ok = await copyTextToClipboard(text, { silent: true });
      if (ok) {
        setCopied(true);
        toast.success("Prompt copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Failed to copy");
      }
    },
    [p.content]
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (onViewPrompt && !(e.target as HTMLElement).closest("button, [role='checkbox']")) {
        onViewPrompt(p);
      }
    },
    [onViewPrompt, p]
  );

  return (
    <TableRow
      key={p.id}
      className={onViewPrompt ? "cursor-pointer hover:bg-muted/50" : undefined}
      onClick={handleRowClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selectedPromptIds.includes(p.id)}
          onCheckedChange={(checked) => {
            setSelectedPromptIds(
              checked ? [...selectedPromptIds, p.id] : selectedPromptIds.filter((id) => id !== p.id)
            );
          }}
        />
      </TableCell>
      <TableCell className="font-mono text-xs">{p.id}</TableCell>
      <TableCell className="font-medium max-w-[180px] truncate" title={p.title}>
        {p.title}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {p.category ?? "—"}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground max-w-[120px] truncate">
        {Array.isArray(p.tags) && p.tags.length > 0 ? p.tags.join(", ") : "—"}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">
        {p.created_at ?? "—"}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">
        {p.updated_at ?? "—"}
      </TableCell>
      <TableCell className="max-w-[200px] text-muted-foreground text-xs truncate" title={p.content ?? ""}>
        {(p.content ?? "").replace(/\s+/g, " ").slice(0, 60)}
        {(p.content ?? "").length > 60 ? "…" : ""}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <ButtonGroup alignment="right">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Copy prompt ID"
            aria-label="Copy prompt ID"
            onClick={handleCopyId}
          >
            <Hash className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Copy prompt"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-sky-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          {onRunPrompt && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-sky-600 hover:text-sky-700 hover:bg-sky-500/10"
              title="Run this prompt (first active project)"
              aria-label="Run this prompt"
              onClick={(e) => {
                e.stopPropagation();
                onRunPrompt(p);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {onDuplicatePrompt && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Duplicate prompt (create a copy as new record)"
              aria-label="Duplicate prompt"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicatePrompt(p);
              }}
            >
              <CopyPlus className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="View content"
            onClick={() => onViewPrompt?.(p)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Edit prompt"
            onClick={() => {
              setSelectedPromptIds([p.id]);
              setEditOpen(true);
              setFormId(p.id);
              setFormTitle(p.title);
              setFormContent(p.content ?? "");
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Delete prompt"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </ButtonGroup>
      </TableCell>
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete prompt?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This prompt will be removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDelete(p.id);
                setDeleteConfirmOpen(false);
              }}
            >
              Delete prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
};
