"use client";

/** Project Architecture Tab component. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Copy, Download, FileJson, FileText, RotateCcw, Search, X } from "lucide-react";
import type { Project } from "@/types/project";
import type { ArchitectureRecord } from "@/types/architecture";
import { ProjectCategoryHeader } from "@/components/molecules/LayoutAndNavigation/ProjectCategoryHeader";
import {
  downloadProjectArchitecturesAsMarkdown,
  copyProjectArchitecturesAsMarkdownToClipboard,
} from "@/lib/download-project-architectures-md";
import {
  downloadProjectArchitecturesAsJson,
  copyProjectArchitecturesAsJsonToClipboard,
} from "@/lib/download-project-architectures-json";
import { ProjectArchitectureListItem } from "@/components/molecules/ListItems/ProjectArchitectureListItem";
import { GridContainer } from "@/components/molecules/Layout/GridContainer";
import { getClasses } from "@/components/molecules/tailwind-molecules";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProjectArchitecturePreferences,
  setProjectArchitecturePreferences,
  DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES,
  PROJECT_DESIGN_ARCH_FILTER_QUERY_MAX_LEN,
  type ArchitectureSortOrder,
} from "@/lib/project-design-architecture-preferences";
import { useProjectArchitectureFocusFilterShortcut } from "@/lib/project-architecture-focus-filter-shortcut";

const classes = getClasses("TabAndContentSections/ProjectArchitectureTab.tsx");
const FILTER_DEBOUNCE_MS = 300;

/** Resolved architecture shape (when project is loaded with resolve=1). */
interface ResolvedArchitectureItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

/** Normalized item for display and filtering (id, name, description). */
interface ArchitectureDisplayItem {
  id: string;
  name: string;
  description?: string;
}

interface ProjectArchitectureTabProps {
  project: Project & { architectures?: unknown[] };
  projectId: string;
  /** When false, used inside Setup card with section title above; omit header to avoid duplicate. */
  showHeader?: boolean;
}

function getArchitecturesToShow(project: Project & { architectures?: unknown[] }): ArchitectureDisplayItem[] {
  const resolvedList = Array.isArray(project.architectures) ? (project.architectures as ResolvedArchitectureItem[]) : [];
  const ids = project.architectureIds ?? [];
  if (resolvedList.length > 0) {
    return resolvedList.map((arch) => ({
      id: arch.id,
      name: arch.name ?? arch.id,
      description: arch.description,
    }));
  }
  return ids.map((id) => ({ id, name: id, description: undefined }));
}

export function ProjectArchitectureTab({
  project,
  projectId,
  showHeader = true,
}: ProjectArchitectureTabProps) {
  const architectures = useMemo(() => getArchitecturesToShow(project), [project]);
  const [filterQuery, setFilterQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<ArchitectureSortOrder>("name-asc");

  // Restore preferences when projectId is set or changes
  useEffect(() => {
    if (!projectId) return;
    const prefs = getProjectArchitecturePreferences(projectId);
    setFilterQuery(prefs.filterQuery);
    setSortOrder(prefs.sortOrder);
  }, [projectId]);

  const filterInputRef = useRef<HTMLInputElement>(null);
  useProjectArchitectureFocusFilterShortcut(filterInputRef);

  // Debounced persist of filter query
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!projectId) return;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setProjectArchitecturePreferences(projectId, {
        filterQuery: filterQuery.trim().slice(0, PROJECT_DESIGN_ARCH_FILTER_QUERY_MAX_LEN),
      });
      filterDebounceRef.current = null;
    }, FILTER_DEBOUNCE_MS);
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, [projectId, filterQuery]);

  const trimmedFilterQuery = filterQuery.trim().toLowerCase();
  const filteredArchitectures = useMemo(
    () =>
      !trimmedFilterQuery
        ? architectures
        : architectures.filter((arch) => {
            const name = (arch.name ?? "").toLowerCase();
            const desc = (arch.description ?? "").toLowerCase();
            const id = (arch.id ?? "").toLowerCase();
            return name.includes(trimmedFilterQuery) || desc.includes(trimmedFilterQuery) || id.includes(trimmedFilterQuery);
          }),
    [architectures, trimmedFilterQuery]
  );

  const sortedArchitectures = useMemo(() => {
    const list = [...filteredArchitectures];
    list.sort((a, b) => {
      const cmp = (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: "base" });
      if (cmp !== 0) return sortOrder === "name-asc" ? cmp : -cmp;
      return (a.id ?? "").localeCompare(b.id ?? "", undefined, { sensitivity: "base" });
    });
    return list;
  }, [filteredArchitectures, sortOrder]);

  /** Full architecture records for export (same order as sortedArchitectures). Only set when project.architectures is resolved. */
  const fullArchitecturesForExport = useMemo((): ArchitectureRecord[] => {
    const raw = project.architectures;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const fullList = raw as ArchitectureRecord[];
    return sortedArchitectures
      .map((display) => fullList.find((a) => a.id === display.id))
      .filter((a): a is ArchitectureRecord => a != null && typeof (a as ArchitectureRecord).category === "string");
  }, [project.architectures, sortedArchitectures]);

  const showEmpty = architectures.length === 0;
  const showFilterRow = architectures.length > 0;
  const showExportButtons = fullArchitecturesForExport.length > 0;
  const showEmptyFilterState = trimmedFilterQuery.length > 0 && filteredArchitectures.length === 0;

  return (
    <div className={classes[0]}>
      {showHeader && (
        <ProjectCategoryHeader
          title="Architectures"
          icon={<Building2 className={classes[1]} />}
          project={project}
        />
      )}

      {showFilterRow && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              ref={filterInputRef}
              type="text"
              placeholder="Filter architectures by name…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              aria-label="Filter architectures by name"
            />
          </div>
          <Select
            value={sortOrder}
            onValueChange={(v) => {
              const next = v as ArchitectureSortOrder;
              setSortOrder(next);
              setProjectArchitecturePreferences(projectId, { sortOrder: next });
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-sm" aria-label="Sort architectures by name">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc" className="text-sm">Name A–Z</SelectItem>
              <SelectItem value="name-desc" className="text-sm">Name Z–A</SelectItem>
            </SelectContent>
          </Select>
          {trimmedFilterQuery ? (
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
          ) : null}
          {trimmedFilterQuery || sortOrder !== "name-asc" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterQuery("");
                setSortOrder("name-asc");
                setProjectArchitecturePreferences(projectId, DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES);
              }}
              className="h-8 gap-1.5"
              aria-label="Reset filters"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset filters
            </Button>
          ) : null}
          {trimmedFilterQuery ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Showing {filteredArchitectures.length} of {architectures.length} architectures
            </span>
          ) : null}
          {showExportButtons ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadProjectArchitecturesAsJson(fullArchitecturesForExport)}
                className="h-8 gap-1.5"
                aria-label="Download architectures as JSON"
                title="Download as JSON (list export)"
              >
                <FileJson className="size-3.5" aria-hidden />
                Download as JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyProjectArchitecturesAsJsonToClipboard(fullArchitecturesForExport)}
                className="h-8 gap-1.5"
                aria-label="Copy architectures as JSON to clipboard"
                title="Copy as JSON (same data as Download as JSON)"
              >
                <Copy className="size-3.5" aria-hidden />
                Copy as JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadProjectArchitecturesAsMarkdown(fullArchitecturesForExport)}
                className="h-8 gap-1.5"
                aria-label="Download architectures as Markdown"
                title="Download as Markdown (same format as single architecture export)"
              >
                <Download className="size-3.5" aria-hidden />
                Download as Markdown
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyProjectArchitecturesAsMarkdownToClipboard(fullArchitecturesForExport)}
                className="h-8 gap-1.5"
                aria-label="Copy architectures as Markdown to clipboard"
                title="Copy as Markdown (same format as Download as Markdown)"
              >
                <FileText className="size-3.5" aria-hidden />
                Copy as Markdown
              </Button>
            </>
          ) : null}
        </div>
      )}

      {showEmpty ? (
        <div className="min-h-[140px] rounded-xl border border-border/40 bg-white dark:bg-card" />
      ) : showEmptyFilterState ? (
        <div className="min-h-[140px] rounded-xl border border-border/40 bg-white dark:bg-card flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            No architectures match &quot;{filterQuery.trim()}&quot;.
          </p>
        </div>
      ) : (
        <GridContainer>
          {sortedArchitectures.map((arch) => (
            <ProjectArchitectureListItem
              key={arch.id}
              architecture={{ id: arch.id, name: arch.name, description: arch.description }}
              projectId={projectId}
            />
          ))}
        </GridContainer>
      )}
    </div>
  );
}
