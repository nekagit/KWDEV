"use client";

/** Analyze Button Split component. */
import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScanSearch, Loader2, BookOpen } from "lucide-react";
import { readProjectFileOrEmpty } from "@/lib/api-projects";
import { Button } from "@/components/ui/button";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const markdownClasses =
  "text-sm text-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 last:[&_p]:mb-0 [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:rounded [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:rounded-md";

export interface AnalyzeButtonSplitProps {
  promptPath: string;
  projectId: string;
  repoPath: string | undefined;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
  label?: string;
}

export function AnalyzeButtonSplit({
  promptPath,
  projectId,
  repoPath,
  onAnalyze,
  analyzing,
  label = "Analyze",
}: AnalyzeButtonSplitProps) {
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [promptContent, setPromptContent] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  const handleViewPrompt = useCallback(() => {
    setShowPromptDialog(true);
    setPromptContent(null);
    setPromptLoading(true);
    if (!repoPath) {
      setPromptLoading(false);
      return;
    }
    readProjectFileOrEmpty(projectId, promptPath, repoPath)
      .then((text) => setPromptContent(text && text.trim() ? text : null))
      .catch(() => setPromptContent(null))
      .finally(() => setPromptLoading(false));
  }, [projectId, promptPath, repoPath]);

  return (
    <>
      <div className="inline-flex rounded-md overflow-hidden border border-border bg-primary text-primary-foreground shadow-sm">
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 rounded-r-none border-0 border-r border-border/60 h-8"
          onClick={onAnalyze}
          disabled={analyzing}
          aria-label={`Execute ${label}`}
        >
          {analyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ScanSearch className="h-3.5 w-3.5" />
          )}
          {label}
        </Button>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 rounded-l-none border-0 h-8"
          onClick={handleViewPrompt}
          disabled={!repoPath}
          aria-label="View prompt"
        >
          <BookOpen className="h-3.5 w-3.5" />
          View prompt
        </Button>
      </div>

      <SharedDialog
        isOpen={showPromptDialog}
        title={promptPath}
        onClose={() => setShowPromptDialog(false)}
        panelClassName="max-w-4xl h-[85vh] flex flex-col"
        bodyClassName="flex-1 min-h-0 overflow-hidden flex flex-col p-0"
      >
        <ScrollArea className="flex-1 min-h-0 h-0">
          {promptLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : promptContent != null && promptContent.trim() !== "" ? (
            <div className={cn("markdown-body p-4 pr-6", markdownClasses)}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{promptContent}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No content.</p>
          )}
        </ScrollArea>
      </SharedDialog>
    </>
  );
}
