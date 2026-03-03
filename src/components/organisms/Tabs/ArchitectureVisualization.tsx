"use client";

/** Architecture Visualization component. */
import { useMemo } from "react";
import { MermaidDiagram } from "./MermaidDiagram";

/** Resolved architecture item from API (id, name, optional description and category) */
export interface ResolvedArchitecture {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface ArchitectureVisualizationProps {
  /** Resolved architectures (from project.architectures when resolve=1) */
  architectures: ResolvedArchitecture[];
  className?: string;
}

/** Sanitize a label for Mermaid node id (alphanumeric and underscore only) */
function mermaidId(name: string, index: number): string {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_") || "Node";
  return `${safe}_${index}`;
}

export function ArchitectureVisualization({ architectures, className = "" }: ArchitectureVisualizationProps) {
  const { byCategory, mermaidCode } = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const nodes: string[] = [];
    const edges: string[] = [];

    architectures.forEach((a, i) => {
      const cat = a.category?.trim() || "Other";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      const nodeId = mermaidId(a.name, i);
      nodes.push(`${nodeId}["${a.name.replace(/"/g, "'")}"]`);
      edges.push(`Project --> ${nodeId}`);
    });

    const mermaid =
      nodes.length === 0
        ? ""
        : `flowchart LR\n  Project["Project"]\n  ${nodes.join("\n  ")}\n  ${edges.join("\n  ")}`;

    return { byCategory, mermaidCode: mermaid };
  }, [architectures]);

  const categories = useMemo(
    () => Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    [byCategory]
  );
  const total = architectures.length;
  const hasAny = total > 0;

  return (
    <div className={className}>
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Architecture visualizations</h4>

      {!hasAny ? (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          No linked architectures. Add architectures to see category distribution and diagram.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Category chart: CSS horizontal bars */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Architecture categories in this project</p>
            <div className="space-y-1.5">
              {categories.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs truncate" title={cat}>
                    {cat}
                  </span>
                  <div className="flex-1 h-5 min-w-0 rounded bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded bg-blue-500/70 dark:bg-blue-500/50"
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mermaid diagram: Project → each architecture */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Architecture stack</p>
            <MermaidDiagram chart={mermaidCode} className="min-h-[80px]" />
          </div>
        </div>
      )}
    </div>
  );
}
