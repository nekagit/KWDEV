"use client";

/** Project Card component. */
import type { Project } from "@/types/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, FolderOpen, Terminal, Code2, Code } from "lucide-react";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { openProjectFolderInFileManager } from "@/lib/open-project-folder";
import { openProjectInSystemTerminal } from "@/lib/open-project-in-terminal";
import { openProjectInEditor } from "@/lib/open-project-in-editor";
import { toast } from "sonner";

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const ideaCount = project.ideaIds?.length ?? 0;
  const promptCount = project.promptIds?.length ?? 0;
  const meta =
    ideaCount > 0 || promptCount > 0
      ? [
          ideaCount ? `${ideaCount} idea${ideaCount !== 1 ? "s" : ""}` : "",
          promptCount ? `${promptCount} prompt${promptCount !== 1 ? "s" : ""}` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <Card
      role="article"
      className="group flex h-full flex-col cursor-pointer shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 border-border/50"
      onClick={onOpen}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-1">
        <CardTitle className="text-base font-semibold leading-tight tracking-tight truncate min-w-0 group-hover:text-primary transition-colors duration-200">
          {project.name}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 h-7 w-7 p-0 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Delete project"
          aria-label="Delete project"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(e);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 p-4 pt-1 min-w-0 flex-1">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}
        {project.repoPath && (
          <div className="flex items-center gap-1 min-w-0 mt-0.5">
            <p
              className="text-xs text-muted-foreground/70 truncate min-w-0 flex-1 font-mono"
              title={project.repoPath}
            >
              {project.repoPath}
            </p>
            <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                aria-label="Open project folder in file manager"
                title="Open folder"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void openProjectFolderInFileManager(project.repoPath);
                }}
              >
                <FolderOpen className="h-3 w-3" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                aria-label="Open project in system terminal"
                title="Open in terminal"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void openProjectInSystemTerminal(project.repoPath);
                }}
              >
                <Terminal className="h-3 w-3" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                aria-label="Copy project path to clipboard"
                title="Copy path"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const path = project.repoPath?.trim();
                  if (path) {
                    await copyTextToClipboard(path);
                  } else {
                    toast.info("No project path set");
                  }
                }}
              >
                <Copy className="h-3 w-3" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                aria-label="Open project in Cursor"
                title="Open in Cursor"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void openProjectInEditor(project.repoPath, "cursor");
                }}
              >
                <Code2 className="h-3 w-3" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                aria-label="Open project in VS Code"
                title="Open in VS Code"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void openProjectInEditor(project.repoPath, "vscode");
                }}
              >
                <Code className="h-3 w-3" aria-hidden />
              </Button>
            </div>
          </div>
        )}
        {meta && (
          <p className="text-xs text-muted-foreground/60 tabular-nums">{meta}</p>
        )}
      </CardContent>
    </Card>
  );
}
