"use client";

/** Project Git Tab component. */
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, GitBranch, FolderGit2, GitPullRequest, GitCommit, Upload, Copy, FileText } from "lucide-react";
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";
import type { Project } from "@/types/project";
import type { GitInfo } from "@/types/git";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { Dialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getClasses } from "@/components/molecules/tailwind-molecules";
import { cn } from "@/lib/utils";
import { copyChangedFilesListToClipboard, downloadChangedFilesAsMarkdown } from "@/lib/export-versioning-changed-files";
import { safeNameForFile } from "@/lib/download-helpers";
import { DEFAULT_COMMIT_MESSAGE, generateCommitMessageFromGitContext } from "@/lib/project-git-commit-message";
const classes = getClasses("TabAndContentSections/ProjectGitTab.tsx");

interface ProjectGitTabProps {
  project: Project;
  projectId: string;
}

/** Parse status_short (git status -sb): first line is branch summary, rest are changed files. */
function parseStatusShort(statusShort: string): { branchLine: string; changedFiles: string[] } {
  const lines = statusShort.trim().split("\n").filter(Boolean);
  const branchLine = lines[0] ?? "";
  const changedFiles = lines.slice(1);
  return { branchLine, changedFiles };
}

/** Git status short: first char = index (staged), second = work tree. Returns label and Tailwind text + bg classes. */
function getStatusStyle(status: string): { label: string; className: string } {
  const s = (status || "  ").slice(0, 2);
  const hasM = s.includes("M");
  const hasD = s.includes("D");
  const hasA = s.includes("A");
  const hasU = s.includes("U");
  const hasR = s.includes("R");
  const hasC = s.includes("C");
  const untracked = s === "??" || s === " ?" || s === "? ";
  if (untracked)
    return { label: s, className: "bg-muted text-muted-foreground font-medium" };
  if (hasD) return { label: s, className: "bg-destructive/15 text-destructive font-medium" };
  if (hasU) return { label: s, className: "bg-destructive/15 text-destructive font-medium" };
  if (hasA) return { label: s, className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium" };
  if (hasM) return { label: s, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium" };
  if (hasR) return { label: s, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium" };
  if (hasC) return { label: s, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium" };
  return { label: s, className: "bg-muted text-muted-foreground font-medium" };
}

type GitAction = "pull" | "push" | "commit" | null;

export function ProjectGitTab({ project, projectId }: ProjectGitTabProps) {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<GitAction>(null);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  const repoPath = project.repoPath?.trim() ?? "";

  const cancelledRef = useRef(false);

  const fetchGitInfo = useCallback(async (getIsCancelled?: () => boolean) => {
    if (!project.repoPath?.trim()) {
      if (!getIsCancelled?.()) setGitInfo(null);
      if (!getIsCancelled?.()) setError(null);
      return;
    }
    if (!isTauri) {
      if (!getIsCancelled?.()) setGitInfo(null);
      if (!getIsCancelled?.()) setError("Git info is only available in the desktop app.");
      return;
    }
    if (!getIsCancelled?.()) setLoading(true);
    if (!getIsCancelled?.()) setError(null);
    try {
      const info = await invoke<GitInfo>("get_git_info", {
        projectPath: project.repoPath.trim(),
      });
      if (getIsCancelled?.()) return;
      setGitInfo(info);
    } catch (e) {
      if (!getIsCancelled?.()) {
        setError(e instanceof Error ? e.message : String(e));
        setGitInfo(null);
      }
    } finally {
      if (!getIsCancelled?.()) setLoading(false);
    }
  }, [project.repoPath]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchGitInfo(() => cancelledRef.current);
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchGitInfo]);

  const handlePull = useCallback(async () => {
    if (!repoPath) return;
    setActionLoading("pull");
    try {
      await invoke<string>("git_pull", { projectPath: repoPath });
      toast.success("Pulled successfully.");
      await fetchGitInfo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }, [repoPath, fetchGitInfo]);

  const handlePush = useCallback(async () => {
    if (!repoPath) return;
    setActionLoading("push");
    try {
      await invoke<string>("git_push", { projectPath: repoPath });
      toast.success("Pushed successfully.");
      await fetchGitInfo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }, [repoPath, fetchGitInfo]);

  const openCommitDialog = useCallback(() => {
    if (!repoPath) return;
    const changedFiles = gitInfo ? parseStatusShort(gitInfo.status_short).changedFiles : [];
    const suggestedMessage = generateCommitMessageFromGitContext(changedFiles, gitInfo?.last_commits ?? []);
    setCommitMessage(suggestedMessage || DEFAULT_COMMIT_MESSAGE);
    setCommitDialogOpen(true);
  }, [repoPath, gitInfo]);

  const handleCommitSubmit = useCallback(async () => {
    if (!repoPath) return;
    const message = commitMessage.trim();
    if (!message) {
      toast.error("Enter a commit message.");
      return;
    }
    setActionLoading("commit");
    setCommitDialogOpen(false);
    try {
      await invoke<string>("git_commit", { projectPath: repoPath, message });
      toast.success("Committed successfully.");
      await fetchGitInfo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  }, [repoPath, commitMessage, fetchGitInfo]);

  if (!repoPath) {
    return (
      <div className={classes[0]}>
        <div className={classes[1]}>
          <FolderGit2 className={classes[2]} />
          Git
        </div>
        <Card className={classes[3]}>
          <p className={classes[4]}>
            No repository path set. Set a repo path in{" "}
            <Link href={`/projects/${projectId}/edit`} className={classes[5]}>
              Edit project
            </Link>{" "}
            to see git status, branches, and commits here.
          </p>
        </Card>
      </div>
    );
  }

  if (!isTauri) {
    return (
      <div className={classes[0]}>
        <div className={classes[1]}>
          <FolderGit2 className={classes[2]} />
          Git
        </div>
        <Card className={classes[3]}>
          <p className={classes[4]}>
            Git info (status, branches, remotes, commits) is only available when running the desktop app (Tauri).
          </p>
        </Card>
      </div>
    );
  }

  if (loading && !gitInfo) {
    return (
      <div className={classes[11]}>
        <Loader2 className={classes[12]} />
      </div>
    );
  }

  if (error && !gitInfo) {
    return (
      <div className={classes[0]}>
        <div className={classes[14]}>
          <div className={classes[1]}>
            <FolderGit2 className={classes[2]} />
            Git
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchGitInfo()} disabled={loading}>
            <RefreshCw className={classes[17]} />
            Refresh
          </Button>
        </div>
        <Card className={classes[18]}>
          <p className={classes[19]}>{error}</p>
        </Card>
      </div>
    );
  }

  const { branchLine, changedFiles } = gitInfo
    ? parseStatusShort(gitInfo.status_short)
    : { branchLine: "", changedFiles: [] };

  const busy = loading || actionLoading !== null;

  return (
    <div className={cn(classes[0], "space-y-4")}>
      <Dialog
        title="Commit"
        isOpen={commitDialogOpen}
        onClose={() => setCommitDialogOpen(false)}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setCommitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleCommitSubmit()}
              disabled={!commitMessage.trim() || actionLoading === "commit"}
            >
              {actionLoading === "commit" ? (
                <Loader2 className={classes[21]} />
              ) : null}
              Commit
            </Button>
          </>
        }
      >
        <div className={classes[22]}>
          <Label htmlFor="commit-message">Commit message</Label>
          <Input
            id="commit-message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="e.g. fix: update feature"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (commitMessage.trim()) handleCommitSubmit();
              }
            }}
          />
        </div>
      </Dialog>
      <div className={cn(classes[23], "rounded-xl border border-border/50 bg-card/50 p-3 md:p-4")}>
        <ButtonGroup alignment="right">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={busy}
            title="Pull"
          >
            {actionLoading === "pull" ? (
              <Loader2 className={classes[24]} />
            ) : (
              <GitPullRequest className={classes[25]} />
            )}
            <span className={classes[26]}>Pull</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openCommitDialog}
            disabled={busy}
            title="Commit"
          >
            {actionLoading === "commit" ? (
              <Loader2 className={classes[24]} />
            ) : (
              <GitCommit className={classes[25]} />
            )}
            <span className={classes[26]}>Commit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={busy}
            title="Push"
          >
            {actionLoading === "push" ? (
              <Loader2 className={classes[24]} />
            ) : (
              <Upload className={classes[25]} />
            )}
            <span className={classes[26]}>Push</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchGitInfo()} disabled={busy}>
            {loading ? (
              <Loader2 className={classes[33]} />
            ) : (
              <RefreshCw className={classes[17]} />
            )}
            Refresh
          </Button>
        </ButtonGroup>
      </div>

      <div className={cn(classes[35], "space-y-4")}>
        {/* Focus: repo path + current branch */}
        <div className={cn(classes[36], "gap-4 items-stretch")}>
          <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
            <h3 className={classes[38]}>Repository path</h3>
            <div className={classes[39]}>
              <p className={classes[40]}>{project.repoPath}</p>
            </div>
          </Card>
          {gitInfo?.current_branch && (
            <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
              <h3 className={classes[42]}>
                <GitBranch className={classes[43]} />
                Current branch
              </h3>
              <div className={classes[39]}>
                <p className={classes[45]}>{gitInfo.current_branch}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Changed files — primary focus: bigger, colorful overview */}
        <div className="rounded-xl border-2 border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-sm overflow-hidden">
          <Card className={cn(classes[37], "border-0 shadow-none bg-transparent p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-foreground">Changed files</h3>
              {changedFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-medium text-muted-foreground">
                    {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""} changed
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground/90" title="Modified · Added · Deleted · Untracked">
                    <span className="rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">M</span>
                    <span className="rounded px-1.5 py-0.5 bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium">A</span>
                    <span className="rounded px-1.5 py-0.5 bg-destructive/15 text-destructive font-medium">D</span>
                    <span className="rounded px-1.5 py-0.5 bg-muted text-muted-foreground font-medium">??</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void copyChangedFilesListToClipboard(changedFiles)}
                      title="Copy changed files list (plain text)"
                      aria-label="Copy changed files list to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Copy list</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadChangedFilesAsMarkdown(changedFiles, safeNameForFile(project.name ?? "", "project"))}
                      title="Download changed files as Markdown"
                      aria-label="Download changed files as Markdown"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Download as Markdown</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {changedFiles.length > 0 ? (
              <ScrollArea className={cn(classes[48], "min-h-[280px] h-[42vh] max-h-[520px] rounded-md border border-border/60 bg-muted/20")}>
                <ul className={classes[49]}>
                  {changedFiles.map((line, i) => {
                    const status = line.slice(0, 2);
                    const path = line.slice(2).trim() || line;
                    const { label, className: statusClassName } = getStatusStyle(status);
                    return (
                      <li key={i} className={cn(classes[50], "items-start")}>
                        <span
                          className={cn("shrink-0 w-8 rounded px-1.5 py-0.5 text-center tabular-nums font-medium", statusClassName)}
                          title={status === "??" ? "Untracked" : status.includes("M") ? "Modified" : status.includes("D") ? "Deleted" : status.includes("A") ? "Added" : status.includes("R") ? "Renamed" : status.includes("U") ? "Unmerged" : "Changed"}
                        >
                          {label}
                        </span>
                        <span className={cn(classes[51], "text-left break-all")}>{path}</span>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <div className={cn(classes[52], "min-h-[120px] flex items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/10")}>
                No changed files
              </div>
            )}
          </Card>
        </div>

        {/* Additional information — collapsible */}
        <Accordion type="single" collapsible className={classes[53]}>
          <AccordionItem value="additional-info" className={classes[54]}>
            <AccordionTrigger className={cn(classes[55], "text-left")}>
              Additional information
            </AccordionTrigger>
            <AccordionContent className={classes[56]}>
              <div className={cn(classes[57], "gap-4")}>
                {/* Status */}
                {branchLine && (
                  <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
                    <h3 className={classes[38]}>Status</h3>
                    <div className={classes[39]}>
                      <p className={classes[61]}>{branchLine}</p>
                    </div>
                  </Card>
                )}

                {/* HEAD ref */}
                {gitInfo?.head_ref && (
                  <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
                    <h3 className={classes[38]}>HEAD</h3>
                    <div className={classes[39]}>
                      <p className={classes[40]}>{gitInfo.head_ref}</p>
                    </div>
                  </Card>
                )}

                {/* Branches */}
                {gitInfo?.branches && gitInfo.branches.length > 0 && (
                  <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
                    <h3 className={classes[38]}>Branches</h3>
                    <ScrollArea className={classes[68]}>
                      <ul className={classes[49]}>
                        {gitInfo.branches.map((b, i) => (
                          <li
                            key={i}
                            className={classes[70]}
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </Card>
                )}

                {/* Remotes */}
                {gitInfo?.remotes?.trim() && (
                  <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
                    <h3 className={classes[38]}>Remotes</h3>
                    <div className={classes[39]}>
                      <pre className={classes[74]}>{gitInfo.remotes}</pre>
                    </div>
                  </Card>
                )}

                {/* Last 30 commits */}
                {gitInfo?.last_commits && gitInfo.last_commits.length > 0 && (
                  <Card className={cn(classes[75], "p-4 md:p-5 text-left")}>
                    <h3 className={classes[38]}>Last 30 commits</h3>
                    <ScrollArea className={classes[77]}>
                      <ul className={classes[49]}>
                        {gitInfo.last_commits.map((c, i) => (
                          <li
                            key={i}
                            className={classes[79]}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </Card>
                )}

                {/* Config preview */}
                {gitInfo?.config_preview?.trim() && (
                  <Card className={cn(classes[37], "p-4 md:p-5 text-left")}>
                    <h3 className={classes[38]}>.git/config (preview)</h3>
                    <ScrollArea className={classes[82]}>
                      <pre className={classes[83]}>
                        {gitInfo.config_preview}
                      </pre>
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
