"use client";

/** Simple Dashboard component. */
import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isTauri } from "@/lib/tauri";
import { listProjects } from "@/lib/api-projects";
import { getRecentProjectIds } from "@/lib/recent-projects";
import { useDashboardFocusFilterShortcut } from "@/lib/dashboard-focus-filter-shortcut";
import type { Project } from "@/types/project";
import {
  FolderOpen,
  Ticket,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  Folders,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardQuickConnect } from "@/components/organisms/Dashboards/DashboardQuickConnect";
import { DashboardServerAndBots } from "@/components/organisms/Dashboards/DashboardServerAndBots";

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const tickets = project.ticketIds?.length ?? 0;
  const prompts = project.promptIds?.length ?? 0;
  const ideas = (project.ideaIds?.length ?? 0) + (project.designIds?.length ?? 0);
  const total = tickets + prompts + ideas;

  const goToProject = () => {
    if (isTauri) {
      router.push(`/projects?open=${encodeURIComponent(project.id)}`);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      className="block group cursor-pointer"
      onClick={goToProject}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToProject();
        }
      }}
    >
      <Card className="h-full shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-primary/20 transition-all duration-300 bg-card-tint-5 border-border/50">
        <CardHeader className="p-4 pb-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate text-foreground group-hover:text-primary">
                {project.name}
              </p>
              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {project.description}
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {tickets > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Ticket className="h-3 w-3" /> {tickets}
              </span>
            )}
            {prompts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                <MessageSquare className="h-3 w-3" /> {prompts}
              </span>
            )}
            {ideas > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-3 w-3" /> {ideas}
              </span>
            )}
            {total === 0 && (
              <span className="text-xs text-muted-foreground">No entities yet</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export interface SimpleDashboardProps {
  setActiveProjects?: (paths: string[] | ((prev: string[]) => string[])) => void;
}

export function SimpleDashboard({ setActiveProjects }: SimpleDashboardProps = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const filterInputRef = useRef<HTMLInputElement>(null);
  useDashboardFocusFilterShortcut(filterInputRef);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProjects()
      .then((p) => {
        if (!cancelled) setProjects(Array.isArray(p) ? p : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectsForDisplay = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    let list = projects;
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    const recentIds = getRecentProjectIds();
    list = [...list];
    list.sort((a, b) => {
      const ai = recentIds.indexOf(a.id);
      const bi = recentIds.indexOf(b.id);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return list.slice(0, 12);
  }, [projects, filterQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 text-sm text-destructive">
          Failed to load dashboard: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick connect: host from NEXT_PUBLIC_DEFAULT_SSH_HOST; in Tauri auto-connects on load */}
      <DashboardQuickConnect />
      {/* Server stats and AI bots (shown when connected) */}
      <DashboardServerAndBots />

      {/* Project list */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">Projects</h3>
          <div className="flex flex-wrap items-center gap-2">
            {projects.length > 0 && setActiveProjects && projectsForDisplay.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const paths = projectsForDisplay.map((p) => p.repoPath ?? p.id);
                    setActiveProjects(paths);
                    toast.success(
                      `${paths.length} project${paths.length === 1 ? "" : "s"} selected for run. Save in Projects to persist.`
                    );
                  }}
                  aria-label="Select all displayed projects for run"
                >
                  <CheckSquare className="h-4 w-4 mr-1.5" aria-hidden />
                  Select all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveProjects([]);
                    toast.success("No projects selected for run.");
                  }}
                  aria-label="Deselect all projects for run"
                >
                  <Square className="h-4 w-4 mr-1.5" aria-hidden />
                  Deselect all
                </Button>
              </>
            )}
            {projects.length > 0 && (
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <Input
                  ref={filterInputRef}
                  type="text"
                  placeholder="Filter by name…"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pl-8 h-9"
                  aria-label="Filter projects by name"
                />
              </div>
            )}
            <Link href="/projects" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
        </div>
        {projects.length === 0 ? (
          <Card className="bg-card-tint-1 border-dashed border-border/60 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <Folders className="h-7 w-7 text-primary/70" />
              </div>
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">Create your first project to get started</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/30 hover:-translate-y-0.5"
                >
                  <FolderOpen className="h-4 w-4" />
                  Create a project
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : projectsForDisplay.length === 0 ? (
          <Card className="bg-card-tint-2 border-dashed border-border/60 shadow-none">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No projects match &quot;{filterQuery.trim()}&quot;
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectsForDisplay.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
