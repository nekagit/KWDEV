"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileText, FolderGit2, Palette, Plug, ShieldCheck, Star, TestTube2, Waypoints, Wrench } from "lucide-react";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listProjectFiles, type FileEntry } from "@/lib/api-projects";
import { PROJECT_DIR } from "@/lib/cursor-paths";
import { ProjectFilesTab } from "@/components/organisms/Tabs/ProjectFilesTab";
import { SetupEntityTableSection } from "@/components/organisms/Tabs/SetupEntityTableSection";
import type { Project } from "@/types/project";

const ADR_DIR = ".cursor/adr";

const PROJECT_INNER_TABS = ["project-files", "adr"] as const;
const SETUP_INNER_TABS = ["architecture", "testing", "security", "skills", "design", "rules", "mcp", "agents"] as const;

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUpdatedAt(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

interface ProjectProjectTabProps {
  project: Project;
  projectId: string;
  docsRefreshKey?: number;
  mode: "project" | "setup";
}

export function ProjectProjectTab({ project, projectId, docsRefreshKey, mode }: ProjectProjectTabProps) {
  const innerTabValues = useMemo(
    () => (mode === "project" ? PROJECT_INNER_TABS : SETUP_INNER_TABS),
    [mode]
  );
  const [innerTab, setInnerTab] = useState<string>(() => {
    if (typeof window === "undefined") return innerTabValues[0];
    const hash = window.location.hash.slice(1).toLowerCase();
    return innerTabValues.includes(hash as (typeof innerTabValues)[number]) ? hash : innerTabValues[0];
  });
  const [adrEntries, setAdrEntries] = useState<FileEntry[]>([]);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1).toLowerCase();
      if (innerTabValues.includes(hash as (typeof innerTabValues)[number])) {
        setInnerTab(hash);
      } else {
        setInnerTab(innerTabValues[0]);
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [innerTabValues]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.pathname}${window.location.search}${innerTab ? `#${innerTab}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [innerTab]);

  const loadAdr = useCallback(async () => {
    if (!project.repoPath || mode !== "project") return;
    cancelledRef.current = false;
    try {
      const list = await listProjectFiles(projectId, ADR_DIR, project.repoPath);
      if (cancelledRef.current) return;
      setAdrEntries((list ?? []).filter((entry) => !entry.isDirectory));
    } catch {
      if (!cancelledRef.current) setAdrEntries([]);
    }
  }, [mode, project.repoPath, projectId]);

  useEffect(() => {
    cancelledRef.current = false;
    void loadAdr();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadAdr, docsRefreshKey]);

  if (!project.repoPath) {
    return (
      <EmptyState
        icon={<FolderGit2 className="size-6 text-muted-foreground" />}
        title="No repo path"
        description={`Set a repository path for this project to load project info from ${PROJECT_DIR}.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={innerTab} onValueChange={setInnerTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 border border-border/40 rounded-lg p-1 mb-4">
          {mode === "project" ? (
            <>
              <TabsTrigger value="project-files" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <FolderGit2 className="size-3.5" />
                Project Files
              </TabsTrigger>
              <TabsTrigger value="adr" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <FileText className="size-3.5" />
                ADR
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="architecture" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Waypoints className="size-3.5" />
                Architecture
              </TabsTrigger>
              <TabsTrigger value="testing" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <TestTube2 className="size-3.5" />
                Testing
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <ShieldCheck className="size-3.5" />
                Security
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Star className="size-3.5" />
                Skills
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Palette className="size-3.5" />
                Design
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Wrench className="size-3.5" />
                Rules
              </TabsTrigger>
              <TabsTrigger value="mcp" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Plug className="size-3.5" />
                MCP
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Bot className="size-3.5" />
                Agents
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {mode === "project" && (
          <TabsContent value="project-files" className="mt-0">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
              <ProjectFilesTab project={project} projectId={projectId} />
            </div>
          </TabsContent>
        )}

        {mode === "project" && (
          <TabsContent value="adr" className="mt-0">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Architecture decision records in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{ADR_DIR}</code>.
                </p>
                {adrEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No files in this folder.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs w-20">Size</TableHead>
                        <TableHead className="text-xs w-24">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adrEntries.map((entry) => (
                        <TableRow key={entry.name}>
                          <TableCell className="font-mono text-xs">{entry.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatSize(entry.size)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatUpdatedAt(entry.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="architecture" className="mt-0">
            <SetupEntityTableSection
              projectId={projectId}
              projectPath={project.repoPath}
              entityType="rules"
              categoryFilter="architecture"
            />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="testing" className="mt-0">
            <SetupEntityTableSection
              projectId={projectId}
              projectPath={project.repoPath}
              entityType="rules"
              categoryFilter="testing"
            />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="security" className="mt-0">
            <SetupEntityTableSection
              projectId={projectId}
              projectPath={project.repoPath}
              entityType="rules"
              categoryFilter="security"
            />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="skills" className="mt-0">
            <SetupEntityTableSection projectId={projectId} projectPath={project.repoPath} entityType="skills" />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="design" className="mt-0">
            <SetupEntityTableSection
              projectId={projectId}
              projectPath={project.repoPath}
              entityType="rules"
              categoryFilter="design"
            />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="rules" className="mt-0">
            <SetupEntityTableSection
              projectId={projectId}
              projectPath={project.repoPath}
              entityType="rules"
            />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="mcp" className="mt-0">
            <SetupEntityTableSection projectId={projectId} projectPath={project.repoPath} entityType="mcp" />
          </TabsContent>
        )}

        {mode === "setup" && (
          <TabsContent value="agents" className="mt-0">
            <SetupEntityTableSection projectId={projectId} projectPath={project.repoPath} entityType="agents" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
