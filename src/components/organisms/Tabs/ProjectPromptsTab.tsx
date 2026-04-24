"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetupEntityTableSection } from "@/components/organisms/Tabs/SetupEntityTableSection";

type PromptCatalogEntry = {
  id: string;
  title: string;
  content: string;
  category?: string;
  sourcePath?: string;
  sourceType?: string;
};

export function ProjectPromptsTab({ projectId, projectPath }: { projectId: string; projectPath: string }) {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<PromptCatalogEntry[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptCatalogEntry | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/data/prompts/all-available");
        if (!response.ok) throw new Error("Failed to load prompt catalog");
        const payload = (await response.json()) as PromptCatalogEntry[];
        if (!cancelled) setCatalog(Array.isArray(payload) ? payload : []);
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return catalog;
    return catalog.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(normalized) ||
        entry.content.toLowerCase().includes(normalized) ||
        (entry.sourcePath ?? "").toLowerCase().includes(normalized) ||
        (entry.category ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [catalog, query]);

  const groupedCatalog = useMemo(() => {
    return filteredCatalog.reduce<Record<string, PromptCatalogEntry[]>>((acc, entry) => {
      const group = entry.category?.trim() || "Uncategorized";
      if (!acc[group]) acc[group] = [];
      acc[group].push(entry);
      return acc;
    }, {});
  }, [filteredCatalog]);

  const categoryTabs = useMemo(() => {
    const categories = Object.keys(groupedCatalog).sort((a, b) => a.localeCompare(b));
    return ["all", ...categories];
  }, [groupedCatalog]);

  useEffect(() => {
    if (!categoryTabs.includes(activeCategoryTab)) {
      setActiveCategoryTab("all");
    }
  }, [categoryTabs, activeCategoryTab]);

  return (
    <div className="space-y-4">
      <SetupEntityTableSection projectId={projectId} projectPath={projectPath} entityType="prompts" />

      <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Codebase prompt catalog</p>
          <p className="text-xs text-muted-foreground">
            Showing {filteredCatalog.length} of {catalog.length}
          </p>
        </div>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prompt title, content, source path..."
          className="h-8 text-xs"
        />

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading prompt catalog...
          </div>
        ) : filteredCatalog.length === 0 ? (
          <p className="text-xs text-muted-foreground">No prompts found for this filter.</p>
        ) : (
          <Tabs value={activeCategoryTab} onValueChange={setActiveCategoryTab} className="w-full">
            <TabsList className="flex w-full justify-start overflow-x-auto gap-1">
              {categoryTabs.map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {category === "all" ? "All Categories" : category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-3">
              <ScrollArea className="h-[320px]">
                <div className="space-y-4 pr-4">
                  {Object.entries(groupedCatalog).map(([category, entries]) => (
                    <section key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                        <span className="text-[10px] text-muted-foreground">{entries.length} prompt(s)</span>
                      </div>
                      {entries.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{entry.title}</p>
                            <span className="text-[10px] text-muted-foreground">{entry.sourceType ?? "unknown"}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{entry.sourcePath ?? "no source path"}</p>
                          <pre className="max-h-20 overflow-hidden whitespace-pre-wrap rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">
                            {entry.content}
                          </pre>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setSelectedPrompt(entry)}
                            >
                              View full prompt
                            </Button>
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {Object.entries(groupedCatalog).map(([category, entries]) => (
              <TabsContent key={category} value={category} className="mt-3">
                <ScrollArea className="h-[320px]">
                  <div className="space-y-2 pr-4">
                    {entries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{entry.title}</p>
                          <span className="text-[10px] text-muted-foreground">{entry.sourceType ?? "unknown"}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{entry.sourcePath ?? "no source path"}</p>
                        <pre className="max-h-20 overflow-hidden whitespace-pre-wrap rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">
                          {entry.content}
                        </pre>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setSelectedPrompt(entry)}
                          >
                            View full prompt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      <Dialog open={!!selectedPrompt} onOpenChange={(open) => !open && setSelectedPrompt(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.title ?? "Prompt"}</DialogTitle>
          </DialogHeader>
          {selectedPrompt ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {selectedPrompt.category ?? "Uncategorized"} • {selectedPrompt.sourceType ?? "unknown"} •{" "}
                {selectedPrompt.sourcePath ?? "no source path"}
              </p>
              <ScrollArea className="h-[60vh] rounded border border-border/40 bg-muted/20 p-3">
                <pre className="max-h-[60vh] whitespace-pre-wrap text-xs text-foreground">
                  {selectedPrompt.content}
                </pre>
              </ScrollArea>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
