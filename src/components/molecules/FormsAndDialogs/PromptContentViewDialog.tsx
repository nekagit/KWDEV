"use client";

/** Prompt Content View Dialog component. */
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Hash, FileJson } from "lucide-react";
import { downloadPromptRecord, copyPromptRecordToClipboard } from "@/lib/download-prompt-record";
import { downloadPromptRecordAsJson } from "@/lib/download-prompt-record-json";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export type PromptForView = {
  id: number;
  title: string;
  content: string;
};

interface PromptContentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: PromptForView | null;
}

export function PromptContentViewDialog({
  open,
  onOpenChange,
  prompt,
}: PromptContentViewDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyContent = useCallback(async () => {
    if (!prompt?.content) return;
    const ok = await copyTextToClipboard(prompt.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [prompt?.content]);

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{prompt.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto rounded-md border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap text-sm font-sans text-foreground">
            {prompt.content || "(No content)"}
          </pre>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => copyTextToClipboard(String(prompt.id))}
            title="Copy prompt ID"
            aria-label="Copy prompt ID"
          >
            <Hash className="h-4 w-4" />
            <span className="ml-2">Copy ID</span>
          </Button>
          <Button variant="outline" onClick={copyContent}>
            {copied ? (
              <Check className="h-4 w-4 text-sky-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-2">{copied ? "Copied" : "Copy prompt"}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => copyPromptRecordToClipboard(prompt.title, prompt.content)}
            title="Copy as Markdown (title + content)"
            aria-label="Copy prompt as Markdown to clipboard"
          >
            <Copy className="h-4 w-4" />
            <span className="ml-2">Copy as Markdown</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadPromptRecord(prompt.title, prompt.content)}
          >
            <Download className="h-4 w-4" />
            <span className="ml-2">Download</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadPromptRecordAsJson({ id: prompt.id, title: prompt.title, content: prompt.content })}
            title="Download as JSON"
            aria-label="Download as JSON"
          >
            <FileJson className="h-4 w-4" />
            <span className="ml-2">Download as JSON</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
