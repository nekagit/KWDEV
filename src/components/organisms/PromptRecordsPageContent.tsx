"use client";

/** Prompt Records Page Content component. */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRunState } from "@/context/run-state";
import { isTauri, invoke } from "@/lib/tauri";
import { useRunStore, registerRunCompleteHandler } from "@/store/run-store";
import type { Project } from "@/types/project";
import { PrintButton } from "@/components/molecules/Buttons/PrintButton";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { PromptRecordActionButtons } from "@/components/molecules/ControlsAndButtons/PromptRecordActionButtons";
import { PromptRecordTable } from "@/components/molecules/ListsAndTables/PromptRecordTable";
import {
  CursorPromptFilesTable,
  type CursorPromptFileEntry,
} from "@/components/molecules/ListsAndTables/CursorPromptFilesTable";
import { PromptRecordFormDialog } from "@/components/molecules/FormsAndDialogs/PromptRecordFormDialog";
import { GeneratePromptRecordDialog } from "@/components/molecules/FormsAndDialogs/GeneratePromptRecordDialog";
import { PromptContentViewDialog } from "@/components/molecules/FormsAndDialogs/PromptContentViewDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, FileJson, FileText, Loader2, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { getOrganismClasses } from "./organism-classes";
import {
  copyAllPromptsAsJsonToClipboard,
  downloadAllPromptsAsJson,
} from "@/lib/download-all-prompts-json";
import {
  copyAllPromptsAsCsvToClipboard,
  downloadAllPromptsAsCsv,
} from "@/lib/download-all-prompts-csv";
import {
  copyAllPromptsAsMarkdownToClipboard,
  downloadAllPromptsAsMarkdown,
} from "@/lib/download-all-prompts-md";
import {
  copyAllCursorPromptsAsMarkdownToClipboard,
  downloadAllCursorPromptsAsMarkdown,
} from "@/lib/download-all-cursor-prompts-md";
import {
  copyAllCursorPromptsAsJsonToClipboard,
  downloadAllCursorPromptsAsJson,
} from "@/lib/download-all-cursor-prompts-json";
import {
  copyAllCursorPromptsAsCsvToClipboard,
  downloadAllCursorPromptsAsCsv,
} from "@/lib/download-all-cursor-prompts-csv";
import {
  getPromptsViewPreference,
  setPromptsViewPreference,
  type PromptsViewSort,
} from "@/lib/prompts-view-preference";
import { usePromptsFocusFilterShortcut } from "@/lib/prompts-focus-filter-shortcut";

const c = getOrganismClasses("PromptRecordsPageContent.tsx");

const CURSOR_PROMPTS_TAB = "cursor-prompts";
const GENERAL_TAB = "general";

type PromptRecordRecord = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};


export function PromptRecordsPageContent({ projectId }: { projectId?: string }) {
  const {
    error,
    selectedPromptRecordIds,
    setSelectedPromptRecordIds,
    refreshData,
    setError,
  } = useRunState();
  const addPrompt = useRunStore((s) => s.addPrompt);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formId, setFormId] = useState<number | undefined>(undefined);

  const [generateDescription, setGenerateDescription] = useState("");
  const [generateResult, setGenerateResult] = useState<{ title: string; content: string } | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [fullPromptRecords, setFullPromptRecords] = useState<PromptRecordRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(() =>
    projectId ? projectId : (typeof window !== "undefined" ? getPromptsViewPreference().mainTab : CURSOR_PROMPTS_TAB)
  );
  const [viewingPrompt, setViewingPrompt] = useState<PromptRecordRecord | null>(null);
  const [cursorPromptFiles, setCursorPromptFiles] = useState<CursorPromptFileEntry[]>([]);
  const [cursorPromptFilesLoading, setCursorPromptFilesLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState(() =>
    projectId ? "" : (typeof window !== "undefined" ? getPromptsViewPreference().filterQuery : "")
  );
  const [promptSort, setPromptSort] = useState<PromptsViewSort>(() =>
    typeof window !== "undefined" ? getPromptsViewPreference().sort : "newest"
  );
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  usePromptsFocusFilterShortcut(filterInputRef);
  const searchParams = useSearchParams();

  const fetchFullPromptRecords = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch("/api/data/prompts");
      if (cancelledRef.current) return;
      if (res.ok) {
        const list: PromptRecordRecord[] = await res.json();
        if (!cancelledRef.current) setFullPromptRecords(Array.isArray(list) ? list : []);
      }
    } catch {
      if (!cancelledRef.current) setFullPromptRecords([]);
    } finally {
      if (!cancelledRef.current) setTableLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/data/projects");
      if (cancelledRef.current) return;
      if (res.ok) {
        const list: Project[] = await res.json();
        if (!cancelledRef.current) setProjects(Array.isArray(list) ? list : []);
      }
    } catch {
      if (!cancelledRef.current) setProjects([]);
    }
  }, []);

  const fetchCursorPromptFiles = useCallback(async () => {
    setCursorPromptFilesLoading(true);
    try {
      const res = await fetch("/api/data/cursor-prompt-files");
      if (cancelledRef.current) return;
      if (res.ok) {
        const data: { files: CursorPromptFileEntry[] } = await res.json();
        if (!cancelledRef.current) setCursorPromptFiles(Array.isArray(data.files) ? data.files : []);
      } else {
        if (!cancelledRef.current) setCursorPromptFiles([]);
      }
    } catch {
      if (!cancelledRef.current) setCursorPromptFiles([]);
    } finally {
      if (!cancelledRef.current) setCursorPromptFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    fetchFullPromptRecords();
    fetchProjects();
    fetchCursorPromptFiles();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchFullPromptRecords, fetchProjects, fetchCursorPromptFiles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        fetchFullPromptRecords(),
        fetchProjects(),
        fetchCursorPromptFiles(),
        refreshData(),
      ]);
      toast.success("Prompts refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [fetchFullPromptRecords, fetchProjects, fetchCursorPromptFiles, refreshData, setError]);

  // Pre-select project tab when opening from project page (e.g. /prompts?projectId=...)
  useEffect(() => {
    const projectId = searchParams.get("projectId");
    if (projectId && projects.some((p) => p.id === projectId && (p.promptIds?.length ?? 0) > 0)) {
      setActiveTab(projectId);
    }
  }, [searchParams, projects]);

  // Persist sort when user changes it
  useEffect(() => {
    setPromptsViewPreference({ sort: promptSort });
  }, [promptSort]);

  // Persist filter query with debounce (300 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setPromptsViewPreference({ filterQuery });
    }, 300);
    return () => clearTimeout(t);
  }, [filterQuery]);

  const { generalPrompts, projectsWithPrompts } = useMemo(() => {
    const allPromptIdsInProjects = new Set(projects.flatMap((p) => p.promptIds ?? []));
    const general = fullPromptRecords.filter((p) => !allPromptIdsInProjects.has(p.id));
    const withPrompts = projects.filter((p) => (p.promptIds?.length ?? 0) > 0);
    return { generalPrompts: general, projectsWithPrompts: withPrompts };
  }, [fullPromptRecords, projects]);

  const trimmedFilterQuery = filterQuery.trim().toLowerCase();
  const filteredGeneralPrompts = useMemo(
    () =>
      !trimmedFilterQuery
        ? generalPrompts
        : generalPrompts.filter((p) =>
          (p.title ?? "").toLowerCase().includes(trimmedFilterQuery)
        ),
    [generalPrompts, trimmedFilterQuery]
  );

  const sortedGeneralPrompts = useMemo(() => {
    const list = [...filteredGeneralPrompts];
    const dateTs = (p: PromptRecordRecord) => {
      const raw = p.created_at ?? p.updated_at ?? "";
      if (!raw) return 0;
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : 0;
    };
    if (promptSort === "newest") {
      list.sort((a, b) => dateTs(b) - dateTs(a) || a.id - b.id);
    } else if (promptSort === "oldest") {
      list.sort((a, b) => dateTs(a) - dateTs(b) || a.id - b.id);
    } else if (promptSort === "title-asc") {
      list.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" }) || a.id - b.id);
    } else {
      list.sort((a, b) => (b.title ?? "").localeCompare(a.title ?? "", undefined, { sensitivity: "base" }) || a.id - b.id);
    }
    return list;
  }, [filteredGeneralPrompts, promptSort]);

  const openCreate = useCallback(() => {
    setFormId(undefined);
    setFormTitle("");
    setFormContent("");
    setCreateOpen(true);
  }, []);

  const openEdit = useCallback(async () => {
    if (selectedPromptRecordIds.length !== 1) return;
    const id = selectedPromptRecordIds[0];
    setEditOpen(true);
    setSaveLoading(true);
    try {
      const res = await fetch("/api/data/prompts");
      if (!res.ok) throw new Error(await res.text());
      const list: PromptRecordRecord[] = await res.json();
      const one = list.find((p) => Number(p.id) === id);
      if (one) {
        setFormId(one.id);
        setFormTitle(one.title);
        setFormContent(one.content ?? "");
      } else {
        setError("PromptRecord not found");
        setEditOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEditOpen(false);
    } finally {
      setSaveLoading(false);
    }
  }, [selectedPromptRecordIds, setError]);

  const handleSaveCreate = useCallback(async () => {
    if (!formTitle.trim()) return;
    setSaveLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle.trim(), content: formContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      await refreshData();
      fetchFullPromptRecords();
      setCreateOpen(false);
      setFormTitle("");
      setFormContent("");
      toast.success("PromptRecord added");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaveLoading(false);
    }
  }, [formTitle, formContent, refreshData, setError, fetchFullPromptRecords]);

  const handleSaveEdit = useCallback(async () => {
    if (formId === undefined || !formTitle.trim()) return;
    setSaveLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formId,
          title: formTitle.trim(),
          content: formContent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      await refreshData();
      fetchFullPromptRecords();
      setEditOpen(false);
      setFormId(undefined);
      setFormTitle("");
      setFormContent("");
      toast.success("PromptRecord updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaveLoading(false);
    }
  }, [formId, formTitle, formContent, refreshData, setError, fetchFullPromptRecords]);

  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const defaultProjectPath = useRunStore((s) => s.activeProjects[0] ?? s.allProjects[0] ?? "");

  const handleGenerate = useCallback(async () => {
    if (!generateDescription.trim()) return;
    setGenerateLoading(true);
    setGenerateResult(null);
    setError(null);
    try {
      if (isTauri && defaultProjectPath) {
        const res = await fetch("/api/generate-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: generateDescription.trim(), promptOnly: true }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.detail || res.statusText);
        }
        const data = (await res.json()) as { prompt?: string };
        const prompt = data.prompt;
        if (!prompt) throw new Error("No prompt returned");
        const requestId = `prompt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        registerRunCompleteHandler(`parse_prompt:${requestId}`, (stdout: string) => {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : stdout;
          try {
            const parsed = JSON.parse(jsonStr) as { title?: string; content?: string };
            setGenerateResult({
              title: String(parsed.title ?? "Generated prompt").slice(0, 500),
              content: String(parsed.content ?? "").slice(0, 50000),
            });
          } catch {
            setError("Could not parse agent output");
          }
          setGenerateLoading(false);
        });
        await runTempTicket(defaultProjectPath, prompt, "Generate prompt", {
          onComplete: "parse_prompt",
          payload: { requestId },
        });
        toast.success("Generate prompt running in Run tab.");
        return;
      }
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: generateDescription.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }
      const data = await res.json();
      setGenerateResult({ title: data.title ?? "", content: data.content ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerateLoading(false);
    }
  }, [generateDescription, setError, defaultProjectPath, runTempTicket]);

  const useGeneratedAndCreate = useCallback(() => {
    if (generateResult) {
      setFormTitle(generateResult.title);
      setFormContent(generateResult.content);
      setFormId(undefined);
      setGenerateOpen(false);
      setGenerateResult(null);
      setGenerateDescription("");
      setCreateOpen(true);
    }
  }, [generateResult]);

  const saveGeneratedAsNew = useCallback(async () => {
    if (!generateResult || !generateResult.title.trim()) return;
    setSaveLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generateResult.title.trim(),
          content: generateResult.content,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      await refreshData();
      fetchFullPromptRecords();
      setGenerateOpen(false);
      setGenerateResult(null);
      setGenerateDescription("");
      toast.success("PromptRecord added");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    finally {
      setSaveLoading(false);
    }
  }, [generateResult, refreshData, setError, fetchFullPromptRecords]);

  const canEdit = selectedPromptRecordIds.length === 1;

  const handleViewCursorPromptFile = useCallback(async (entry: CursorPromptFileEntry) => {
    try {
      const res = await fetch(
        `/api/data/cursor-doc?path=${encodeURIComponent(entry.path)}`
      );
      if (!res.ok) return;
      const data: { content?: string | null } = await res.json();
      setViewingPrompt({
        id: 0,
        title: entry.path,
        content: data.content ?? "",
      });
    } catch {
      setError("Failed to load file content");
    }
  }, [setError]);


  const handleDelete = useCallback(
    async (promptId: number) => {
      setError(null);
      try {
        const res = await fetch(`/api/data/prompts/${promptId}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        await refreshData();
        fetchFullPromptRecords();
        setSelectedPromptRecordIds((prev) => prev.filter((id) => id !== promptId));
        toast.success("PromptRecord removed");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        toast.error(msg);
      }
    },
    [refreshData, fetchFullPromptRecords, setSelectedPromptRecordIds, setError]
  );

  const handleRunPrompt = useCallback(
    async (prompt: PromptRecordRecord) => {
      const projectPath = defaultProjectPath?.trim();
      if (!projectPath) {
        toast.info("Select at least one project first.");
        return;
      }
      const content = prompt.content?.trim() ?? "";
      if (!content) {
        toast.error("Prompt has no content.");
        return;
      }
      const label = (prompt.title?.trim() || `Prompt #${prompt.id}`).slice(0, 80);
      const runId = await runTempTicket(projectPath, content, label);
      if (runId) {
        toast.success(runId === "queued" ? "Prompt queued. Check the Run tab." : "Prompt running. Check the Run tab.");
      } else {
        toast.error("Failed to start run.");
      }
    },
    [defaultProjectPath, runTempTicket]
  );

  const handleDuplicatePrompt = useCallback(
    async (prompt: PromptRecordRecord) => {
      const title = `${prompt.title ?? "Prompt"} (copy)`.trim();
      const content = prompt.content ?? "";
      try {
        if (isTauri) {
          await invoke("add_prompt", { title, content });
          await refreshData();
        } else {
          addPrompt(title, content);
          const res = await fetch("/api/data/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content }),
          });
          if (res.ok) await refreshData();
        }
        toast.success("Prompt duplicated.");
      } catch {
        toast.error("Failed to duplicate prompt.");
      }
    },
    [addPrompt, refreshData]
  );

  return (
    <div className={c["0"]}>
      {!projectId && (
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Prompts" },
          ]}
          className="mb-3"
        />
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className={projectId ? "border-0 shadow-none bg-transparent" : ""}>
        <CardHeader className={projectId ? "px-0 pt-0" : ""}>
          <div className={c["1"]}>
            <div>
              {!projectId && <CardTitle className={c["2"]}>Prompts</CardTitle>}
              <CardDescription className={c["3"]}>
                {projectId ? (
                  <>Manage prompts for this project. General and .cursor prompts are available in their respective tabs.</>
                ) : (
                  <>
                    <strong>General</strong> shows prompts you add here (not linked to a project). Each project tab shows prompts linked to that project.
                    Select in the table for run (script <code className={c["4"]}>-p ID ...</code>).
                    Edit or delete from the table. Configure timing on the{" "}
                    <Link href="/configuration" className={c["6"]}>
                      Configuration
                    </Link>{" "}
                    page.
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <PromptRecordActionButtons
                openCreate={openCreate}
                openEdit={openEdit}
                setGenerateOpen={setGenerateOpen}
                canEdit={canEdit}
              />
              {!projectId && (
                <PrintButton
                  title="Print prompts page (⌘P)"
                  variant="outline"
                  size="sm"
                />
              )}
              <Button
                variant="outline"
                disabled={refreshing}
                onClick={handleRefresh}
                aria-label="Refresh prompts"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={projectId ? "px-0 pb-0" : ""}>
          {tableLoading ? (
            <p className={c["7"]}>Loading prompts…</p>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v);
                if (v === CURSOR_PROMPTS_TAB || v === GENERAL_TAB) {
                  setPromptsViewPreference({ mainTab: v });
                }
              }}
              className="w-full"
            >
              <TabsList className="flex w-full flex-wrap gap-1 bg-muted/50">
                {projectId && (
                  <TabsTrigger value={projectId}>
                    {projects.find((p) => p.id === projectId)?.name || "Project"}
                  </TabsTrigger>
                )}
                <TabsTrigger value={CURSOR_PROMPTS_TAB}>.cursor prompts</TabsTrigger>
                <TabsTrigger value={GENERAL_TAB}>General</TabsTrigger>
                {!projectId && projectsWithPrompts.map((p) => (
                  <TabsTrigger key={p.id} value={p.id}>
                    {p.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={CURSOR_PROMPTS_TAB} className="mt-4 focus-visible:outline-none">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-sm text-muted-foreground mr-2">Export all .cursor prompts:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAllCursorPromptsAsJson()}
                    disabled={cursorPromptFiles.length === 0}
                    aria-label="Export all .cursor prompts as JSON"
                  >
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAllCursorPromptsAsMarkdown()}
                    disabled={cursorPromptFiles.length === 0}
                    aria-label="Export all .cursor prompts as Markdown"
                  >
                    Export MD
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyAllCursorPromptsAsMarkdownToClipboard()}
                    disabled={cursorPromptFiles.length === 0}
                    aria-label="Copy all .cursor prompts as Markdown"
                    title="Copy as Markdown (same format as Export MD)"
                  >
                    <FileText className="size-3.5 mr-1.5" aria-hidden />
                    Copy as Markdown
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyAllCursorPromptsAsJsonToClipboard()}
                    disabled={cursorPromptFiles.length === 0}
                    aria-label="Copy all .cursor prompts as JSON"
                    title="Copy as JSON (same data as Export JSON)"
                  >
                    <FileJson className="size-3.5 mr-1.5" aria-hidden />
                    Copy as JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyAllCursorPromptsAsCsvToClipboard()}
                    disabled={cursorPromptFiles.length === 0}
                    aria-label="Copy all .cursor prompts as CSV"
                    title="Copy as CSV (same data as Export CSV)"
                  >
                    <Copy className="size-3.5 mr-1.5" aria-hidden />
                    Copy as CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAllCursorPromptsAsCsv()}
                    disabled={cursorPromptFiles.length === 0}
                    aria-label="Export all .cursor prompts as CSV"
                  >
                    Export CSV
                  </Button>
                </div>
                <CursorPromptFilesTable
                  files={cursorPromptFiles}
                  loading={cursorPromptFilesLoading}
                  onRefresh={fetchCursorPromptFiles}
                  onView={handleViewCursorPromptFile}
                />
              </TabsContent>
              <TabsContent value={GENERAL_TAB} className="mt-4 focus-visible:outline-none">
                {generalPrompts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2 mr-2" role="group" aria-label="Export all general prompts">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => downloadAllPromptsAsJson(generalPrompts)}
                        aria-label="Export all general prompts as JSON"
                      >
                        Export JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => downloadAllPromptsAsMarkdown(generalPrompts)}
                        aria-label="Export all general prompts as Markdown"
                      >
                        Export MD
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => copyAllPromptsAsMarkdownToClipboard(generalPrompts)}
                        aria-label="Copy all general prompts as Markdown"
                        title="Copy as Markdown (same format as Export MD)"
                      >
                        <FileText className="size-3.5 mr-1.5" aria-hidden />
                        Copy as Markdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => void copyAllPromptsAsJsonToClipboard(generalPrompts)}
                        aria-label="Copy all general prompts as JSON"
                        title="Copy as JSON (same data as Export JSON)"
                      >
                        <FileJson className="size-3.5 mr-1.5" aria-hidden />
                        Copy as JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => void copyAllPromptsAsCsvToClipboard(generalPrompts)}
                        aria-label="Copy all general prompts as CSV"
                        title="Copy as CSV (same data as Export CSV)"
                      >
                        <Copy className="size-3.5 mr-1.5" aria-hidden />
                        Copy as CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => downloadAllPromptsAsCsv(generalPrompts)}
                        aria-label="Export all general prompts as CSV"
                      >
                        Export CSV
                      </Button>
                    </div>
                    <div className="relative flex-1 max-w-xs">
                      <Search
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
                        aria-hidden
                      />
                      <Input
                        ref={filterInputRef}
                        type="text"
                        placeholder="Filter by title…"
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                        aria-label="Filter prompts by title"
                      />
                    </div>
                    <Select value={promptSort} onValueChange={(v) => setPromptSort(v as PromptsViewSort)}>
                      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Sort prompts">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                        <SelectItem value="title-asc">Title A–Z</SelectItem>
                        <SelectItem value="title-desc">Title Z–A</SelectItem>
                      </SelectContent>
                    </Select>
                    {(trimmedFilterQuery || promptSort !== "newest") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterQuery("");
                          setPromptSort("newest");
                        }}
                        className="h-8 gap-1.5"
                        aria-label="Reset filters"
                      >
                        <RotateCcw className="size-3.5" aria-hidden />
                        Reset filters
                      </Button>
                    )}
                    {trimmedFilterQuery && (
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
                    )}
                    {trimmedFilterQuery && (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Showing {filteredGeneralPrompts.length} of {generalPrompts.length} prompts
                      </span>
                    )}
                  </div>
                )}
                {trimmedFilterQuery && filteredGeneralPrompts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No prompts match &quot;{filterQuery.trim()}&quot;.
                  </p>
                ) : (
                  <PromptRecordTable
                    fullPromptRecords={sortedGeneralPrompts}
                    selectedPromptRecordIds={selectedPromptRecordIds}
                    setSelectedPromptRecordIds={setSelectedPromptRecordIds}
                    handleDelete={handleDelete}
                    setEditOpen={setEditOpen}
                    setFormId={setFormId}
                    setFormTitle={setFormTitle}
                    setFormContent={setFormContent}
                    onViewPrompt={setViewingPrompt}
                    onRunPrompt={handleRunPrompt}
                    onDuplicatePrompt={handleDuplicatePrompt}
                  />
                )}
              </TabsContent>
              {projectsWithPrompts.map((p) => (
                <TabsContent key={p.id} value={p.id} className="mt-4 focus-visible:outline-none">
                  <PromptRecordTable
                    fullPromptRecords={fullPromptRecords.filter((r) => (p.promptIds ?? []).includes(r.id))}
                    selectedPromptRecordIds={selectedPromptRecordIds}
                    setSelectedPromptRecordIds={setSelectedPromptRecordIds}
                    handleDelete={handleDelete}
                    setEditOpen={setEditOpen}
                    setFormId={setFormId}
                    setFormTitle={setFormTitle}
                    setFormContent={setFormContent}
                    onViewPrompt={setViewingPrompt}
                    onRunPrompt={handleRunPrompt}
                    onDuplicatePrompt={handleDuplicatePrompt}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <PromptRecordFormDialog
        open={createOpen}
        setOpen={setCreateOpen}
        title="Create prompt"
        description="Add a new prompt. Title and content are required."
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formContent={formContent}
        setFormContent={setFormContent}
        handleSave={handleSaveCreate}
        saveLoading={saveLoading}
      />

      <PromptRecordFormDialog
        open={editOpen}
        setOpen={setEditOpen}
        title="Edit prompt"
        description="Update title and content. Changes are saved to the data file."
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formContent={formContent}
        setFormContent={setFormContent}
        handleSave={handleSaveEdit}
        saveLoading={saveLoading}
      />

      <GeneratePromptRecordDialog
        open={generateOpen}
        setOpen={setGenerateOpen}
        generateDescription={generateDescription}
        setGenerateDescription={setGenerateDescription}
        handleGenerate={handleGenerate}
        generateLoading={generateLoading}
        generateResult={generateResult}
        setGenerateResult={setGenerateResult}
        useGeneratedAndCreate={useGeneratedAndCreate}
        saveGeneratedAsNew={saveGeneratedAsNew}
        saveLoading={saveLoading}
      />

      <PromptContentViewDialog
        open={!!viewingPrompt}
        onOpenChange={(open) => !open && setViewingPrompt(null)}
        prompt={viewingPrompt}
      />
    </div>
  );
}
