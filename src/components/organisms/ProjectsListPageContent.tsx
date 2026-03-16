"use client";

/** Projects List Page Content component. */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Project } from "@/types/project";
import { invoke, isTauri } from "@/lib/tauri";
import { listProjects, deleteProject } from "@/lib/api-projects";
import { Search, X, RotateCcw } from "lucide-react";
import { getRecentProjectIds } from "@/lib/recent-projects";
import {
  getProjectsListViewPreference,
  setProjectsListViewPreference,
  PROJECTS_LIST_VIEW_PREFERENCE_RESTORED_EVENT,
  DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE,
  type ProjectsListSortOrder,
} from "@/lib/projects-list-view-preference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { ProjectsHeader } from "@/components/molecules/LayoutAndNavigation/ProjectsHeader";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { NoProjectsFoundCard } from "@/components/molecules/CardsAndDisplay/NoProjectsFoundCard";
import { ProjectLoadingState } from "@/components/organisms/Utilities/ProjectLoadingState";
import { ProjectCard } from "@/components/molecules/CardsAndDisplay/ProjectCard";
import { ProjectDetailsPageContent } from "@/components/organisms/ProjectDetailsPageContent";
import { getOrganismClasses } from "./organism-classes";
import { useProjectsFocusFilterShortcut } from "@/lib/projects-focus-filter-shortcut";

const c = getOrganismClasses("ProjectsListPageContent.tsx");

export function ProjectsListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openProjectId = searchParams?.get("open") ?? null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return getProjectsListViewPreference().filterQuery;
  });
  const [sortOrder, setSortOrder] = useState<ProjectsListSortOrder>(() => {
    if (typeof window === "undefined") return "asc";
    return getProjectsListViewPreference().sortOrder;
  });
  const filterInputRef = useRef<HTMLInputElement>(null);
  useProjectsFocusFilterShortcut(filterInputRef);
  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Persist sort when user changes it
  useEffect(() => {
    setProjectsListViewPreference({ sortOrder });
  }, [sortOrder]);

  // Persist filter query with debounce when user types
  useEffect(() => {
    const t = setTimeout(
      () => setProjectsListViewPreference({ filterQuery: searchQuery }),
      300
    );
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Sync local state when preference is restored from Command palette
  useEffect(() => {
    const onRestored = () => {
      setSearchQuery(DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE.filterQuery);
      setSortOrder(DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE.sortOrder);
    };
    window.addEventListener(PROJECTS_LIST_VIEW_PREFERENCE_RESTORED_EVENT, onRestored);
    return () => window.removeEventListener(PROJECTS_LIST_VIEW_PREFERENCE_RESTORED_EVENT, onRestored);
  }, []);

  const filteredProjects = useMemo(
    () =>
      !trimmedQuery
        ? projects
        : projects.filter((p) => p.name.toLowerCase().includes(trimmedQuery)),
    [projects, trimmedQuery]
  );
  const displayList = useMemo(() => {
    const list = [...filteredProjects];
    if (sortOrder === "recent") {
      const recentIds = getRecentProjectIds();
      list.sort((a, b) => {
        const ai = recentIds.indexOf(a.id);
        const bi = recentIds.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } else {
      list.sort((a, b) =>
        sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    }
    return list;
  }, [filteredProjects, sortOrder]);

  const refetch = useCallback(() => {
    listProjects()
      .then((data: Project[]) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    try {
      await deleteProject(projectId);
      refetch();
    } catch (e: any) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleOpenProject = useCallback(
    (project: Project) => {
      if (isTauri) {
        invoke("frontend_debug_log", {
          location: "ProjectsListPageContent.tsx:onClick",
          message: "project link click",
          data: { projectId: project.id, hasId: !!project.id },
        }).catch(() => {});
        router.push(`/projects?open=${encodeURIComponent(project.id)}`);
      } else {
        router.push(`/projects/${project.id}`);
      }
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProjects()
      .then((data: Project[]) => {
        if (!cancelled) setProjects(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
        // #region agent log
        fetch("http://127.0.0.1:7739/ingest/b5a1e027-c6b4-4953-afcc-05492ba259e6", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8b7cf9" },
          body: JSON.stringify({
            sessionId: "8b7cf9",
            location: "ProjectsListPageContent.tsx:listProjects_catch",
            message: "list_projects failed",
            data: { hypothesisId: "H2", errorMessage: msg },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const goBackToList = useCallback(() => {
    router.replace("/projects");
  }, [router]);

  if (openProjectId) {
    return (
      <div className={c["0"]}>
        <ProjectDetailsPageContent
          overrideProjectId={openProjectId}
          onBack={goBackToList}
        />
      </div>
    );
  }

  return (
    <div className={c["0"]}>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Projects" },
        ]}
        className="mb-3"
      />
      <ProjectsHeader />

      {error && (
        <ErrorDisplay
          message={error || "An unknown error occurred."}
          onRetry={() => {
            setError(null);
            setLoading(true);
            refetch();
          }}
        />
      )}

      {/* Existing projects: simple list to open them */}
      {loading ? (
        <ProjectLoadingState />
      ) : projects.length === 0 ? (
        <NoProjectsFoundCard />
      ) : (
        <section className={c["1"]} data-testid="projects-list">
          <h2 className={c["2"]}>Your projects</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                ref={filterInputRef}
                type="text"
                placeholder="Filter by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
                aria-label="Filter projects by name"
              />
            </div>
            {trimmedQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-8 gap-1.5"
                aria-label="Clear filter"
              >
                <X className="size-3.5" aria-hidden />
                Clear
              </Button>
            )}
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as ProjectsListSortOrder)}
            >
              <SelectTrigger className="w-[10rem] h-8 text-xs" aria-label="Sort order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc" className="text-xs">A–Z</SelectItem>
                <SelectItem value="desc" className="text-xs">Z–A</SelectItem>
                <SelectItem value="recent" className="text-xs">Recently opened</SelectItem>
              </SelectContent>
            </Select>
            {(trimmedQuery || sortOrder !== "asc") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSortOrder("asc");
                }}
                className="h-8 gap-1.5 text-xs"
                aria-label="Reset filters"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Reset filters
              </Button>
            )}
            {trimmedQuery && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {filteredProjects.length} of {projects.length} projects
              </span>
            )}
          </div>
          {displayList.length > 0 ? (
            <ul
              className={c["grid"]}
              role="list"
              aria-label="Project cards"
            >
              {displayList.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    project={project}
                    onOpen={() => handleOpenProject(project)}
                    onDelete={(e) => handleDelete(project.id, e)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No projects match &quot;{searchQuery.trim()}&quot;.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
