"use client";

/** Mermaid Diagram component. */
import { useId, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  /** Mermaid diagram source (e.g. flowchart LR; Project --> A; Project --> B) */
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chart?.trim() || !containerRef.current) {
      setLoading(false);
      return;
    }
    setError(false);
    setLoading(true);
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
        const { svg, bindFunctions } = await mermaid.render(`mermaid-${id}`, chart.trim());
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (!chart?.trim()) {
    return (
      <div className={cn("rounded-lg border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground", className)}>
        No diagram to display.
      </div>
    );
  }
  if (loading) {
    return (
      <div className={cn("rounded-lg border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground", className)}>
        Rendering diagram…
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn("rounded-lg border border-border/40 bg-destructive/10 p-4 text-center text-xs text-destructive", className)}>
        Diagram could not be rendered.
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      className={cn("mermaid-container flex justify-center [&_svg]:max-w-full [&_svg]:h-auto", className)}
    />
  );
}
