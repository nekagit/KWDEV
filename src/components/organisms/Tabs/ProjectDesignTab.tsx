"use client";

/** Project Design Tab component. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, FileJson, FileText, Palette, RotateCcw, Search, X } from "lucide-react";
import type { Project } from "@/types/project";
import type { DesignRecord } from "@/types/design";
import { ProjectCategoryHeader } from "@/components/molecules/LayoutAndNavigation/ProjectCategoryHeader";
import { ProjectDesignListItem } from "@/components/molecules/ListItems/ProjectDesignListItem";
import { GridContainer } from "@/components/molecules/Layout/GridContainer";
import { getClasses } from "@/components/molecules/tailwind-molecules";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  downloadProjectDesignsAsMarkdown,
  copyProjectDesignsAsMarkdownToClipboard,
} from "@/lib/download-project-designs-md";
import {
  downloadProjectDesignsAsJson,
  copyProjectDesignsAsJsonToClipboard,
} from "@/lib/download-project-designs-json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProjectDesignPreferences,
  setProjectDesignPreferences,
  DEFAULT_PROJECT_DESIGN_PREFERENCES,
  PROJECT_DESIGN_ARCH_FILTER_QUERY_MAX_LEN,
  type DesignSortOrder,
} from "@/lib/project-design-architecture-preferences";
import { useProjectDesignFocusFilterShortcut } from "@/lib/project-design-focus-filter-shortcut";

const classes = getClasses("TabAndContentSections/ProjectDesignTab.tsx");
const FILTER_DEBOUNCE_MS = 300;

/** Project with resolved designs (from getProjectResolved). */
type ProjectWithDesigns = Project & { designs?: (DesignRecord & Record<string, unknown>)[] };

interface ProjectDesignTabProps {
  project: Project;
  projectId: string;
  /** When false, used inside Setup card with section title above; omit header to avoid duplicate. */
  showHeader?: boolean;
}

function getDesignsToShow(project: Project): DesignRecord[] {
  const withDesigns = project as ProjectWithDesigns;
  const designIds = project.designIds ?? [];
  if (designIds.length === 0) return [];

  const resolved = withDesigns.designs;
  if (Array.isArray(resolved) && resolved.length > 0) {
    return designIds
      .map((id) => resolved.find((d) => d && (d as { id?: string }).id === id))
      .filter(Boolean)
      .map((d) => d as DesignRecord);
  }

  return designIds.map((id) => ({ id, name: id } as DesignRecord));
}

export function ProjectDesignTab({
  project,
  projectId,
  showHeader = true,
}: ProjectDesignTabProps) {
  const designs = getDesignsToShow(project);
  const [filterQuery, setFilterQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<DesignSortOrder>("name-asc");

  // Restore preferences when projectId is set or changes
  useEffect(() => {
    if (!projectId) return;
    const prefs = getProjectDesignPreferences(projectId);
    setFilterQuery(prefs.filterQuery);
    setSortOrder(prefs.sortOrder);
  }, [projectId]);

  const filterInputRef = useRef<HTMLInputElement>(null);
  useProjectDesignFocusFilterShortcut(filterInputRef);

  // Debounced persist of filter query
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!projectId) return;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setProjectDesignPreferences(projectId, {
        filterQuery: filterQuery.trim().slice(0, PROJECT_DESIGN_ARCH_FILTER_QUERY_MAX_LEN),
      });
      filterDebounceRef.current = null;
    }, FILTER_DEBOUNCE_MS);
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, [projectId, filterQuery]);

  const trimmedFilterQuery = filterQuery.trim().toLowerCase();
  const filteredDesigns = useMemo(
    () =>
      !trimmedFilterQuery
        ? designs
        : designs.filter((design) => {
            const name = (design.name ?? "").toLowerCase();
            const desc = (design.description ?? "").toLowerCase();
            return name.includes(trimmedFilterQuery) || desc.includes(trimmedFilterQuery);
          }),
    [designs, trimmedFilterQuery]
  );

  const sortedDesigns = useMemo(() => {
    const list = [...filteredDesigns];
    list.sort((a, b) => {
      const cmp = (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { sensitivity: "base" });
      if (cmp !== 0) return sortOrder === "name-asc" ? cmp : -cmp;
      return (a.id ?? "").localeCompare(b.id ?? "", undefined, { sensitivity: "base" });
    });
    return list;
  }, [filteredDesigns, sortOrder]);

  const showFilterRow = designs.length > 0;
  const showEmptyFilterState = trimmedFilterQuery.length > 0 && filteredDesigns.length === 0;

  return (
    <div className={classes[0]}>
      {showHeader && (
        <ProjectCategoryHeader
          title="Design"
          icon={<Palette className={classes[1]} />}
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
              placeholder="Filter designs by name…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              aria-label="Filter designs by name"
            />
          </div>
          <Select
            value={sortOrder}
            onValueChange={(v) => {
              const next = v as DesignSortOrder;
              setSortOrder(next);
              setProjectDesignPreferences(projectId, { sortOrder: next });
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-sm" aria-label="Sort designs by name">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc" className="text-sm">Name A–Z</SelectItem>
              <SelectItem value="name-desc" className="text-sm">Name Z–A</SelectItem>
            </SelectContent>
          </Select>
          {(trimmedFilterQuery || sortOrder !== "name-asc") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterQuery("");
                setSortOrder("name-asc");
                setProjectDesignPreferences(projectId, DEFAULT_PROJECT_DESIGN_PREFERENCES);
              }}
              className="h-8 gap-1.5"
              aria-label="Reset filters"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset filters
            </Button>
          )}
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
          {trimmedFilterQuery ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Showing {filteredDesigns.length} of {designs.length} designs
            </span>
          ) : null}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => downloadProjectDesignsAsJson(sortedDesigns)}
              title="Download visible designs as JSON"
              aria-label="Download visible designs as JSON"
            >
              <FileJson className="size-3.5" aria-hidden />
              Download as JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => copyProjectDesignsAsJsonToClipboard(sortedDesigns)}
              title="Copy as JSON (same data as Download as JSON)"
              aria-label="Copy designs as JSON to clipboard"
            >
              <Copy className="size-3.5" aria-hidden />
              Copy as JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => copyProjectDesignsAsMarkdownToClipboard(sortedDesigns)}
              title="Copy visible designs as Markdown to clipboard"
              aria-label="Copy visible designs as Markdown to clipboard"
            >
              <FileText className="size-3.5" aria-hidden />
              Copy as Markdown
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => downloadProjectDesignsAsMarkdown(sortedDesigns)}
              title="Download visible designs as Markdown"
              aria-label="Download visible designs as Markdown"
            >
              <Download className="size-3.5" aria-hidden />
              Download as Markdown
            </Button>
          </div>
        </div>
      )}

      {designs.length === 0 ? (
        <div className="min-h-[140px] rounded-xl border border-border/40 bg-white dark:bg-card" />
      ) : showEmptyFilterState ? (
        <div className="min-h-[140px] rounded-xl border border-border/40 bg-white dark:bg-card flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            No designs match &quot;{filterQuery.trim()}&quot;.
          </p>
        </div>
      ) : (
        <GridContainer>
          {sortedDesigns.map((design) => (
            <ProjectDesignListItem
              key={design.id}
              design={design}
              projectId={projectId}
            />
          ))}
        </GridContainer>
      )}
    </div>
  );
}
