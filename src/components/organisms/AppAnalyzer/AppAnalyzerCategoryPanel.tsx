"use client";

/** AppAnalyzerPanel: Unified URL/project analyzer with comprehensive audits. */
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditResults } from "./AuditResults";
import { fetchUrlForAudit } from "@/lib/app-analyzer-fetch";
import { runAudits } from "@/lib/app-analyzer-audit";
import { listProjects, getProjectResolved } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import type { AuditResult } from "@/types/app-analyzer";
import { useRunStore } from "@/store/run-store";
import { toast } from "sonner";
import { Play, Wrench, Loader2 } from "lucide-react";

function hasBadAuditResults(results: AuditResult[]): boolean {
  return results.some((r) =>
    r.checks.some((c) => c.status === "fail" || c.status === "warn")
  );
}

function buildFixAuditedPrompt(url: string, results: AuditResult[]): string {
  const lines: string[] = [
    "# Fix issues from App Analyzer audit",
    "",
    `The following URL was audited: ${url}. Apply changes in this project so the app/site produced by this repo addresses the issues below.`,
    "",
    "## Issues to fix or improve",
    "",
  ];
  for (const result of results) {
    const badChecks = result.checks.filter(
      (c) => c.status === "fail" || c.status === "warn"
    );
    if (badChecks.length === 0) continue;
    lines.push(`### ${result.auditType}`);
    for (const check of badChecks) {
      lines.push(`- **${check.name}** (${check.status}): ${check.message}`);
      if (check.detail) lines.push(`  - ${check.detail}`);
    }
    lines.push("");
  }
  lines.push(
    "Apply the necessary changes in this project (e.g. meta tags, Impressum page, or configuration) to fix or improve these points."
  );
  return lines.join("\n");
}

export function AppAnalyzerPanel() {
  const [inputMode, setInputMode] = useState<"url" | "project">("url");
  const [url, setUrl] = useState("");
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AuditResult[] | null>(null);
  /** URL actually used for the last audit (typed URL or derived from linked project runPort). */
  const [lastAuditUrl, setLastAuditUrl] = useState<string | null>(null);

  const runTempTicket = useRunStore((s) => s.runTempTicket);

  useEffect(() => {
    listProjects()
      .then((list) => setProjects(list ?? []))
      .catch(() => setProjects([]));
  }, []);

  const runAudit = useCallback(async () => {
    let auditUrl: string | null = null;

    if (inputMode === "url") {
      auditUrl = url.trim();
    } else if (inputMode === "project" && linkedProjectId) {
      const project =
        projects.find((p) => p.id === linkedProjectId) ??
        (await getProjectResolved(linkedProjectId).catch(() => null));
      if (project?.runPort != null && Number.isInteger(project.runPort)) {
        auditUrl = `http://127.0.0.1:${project.runPort}`;
      }
    }

    if (!auditUrl) {
      setError(
        inputMode === "url"
          ? "Enter a valid URL (e.g. https://example.com)"
          : "Select a project with a run port set (project details)."
      );
      return;
    }

    setError(null);
    setResults(null);
    setLastAuditUrl(auditUrl);
    setLoading(true);
    try {
      const fetchResult = await fetchUrlForAudit(auditUrl);
      const auditResults = runAudits(fetchResult);
      setResults(auditResults);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [url, inputMode, linkedProjectId, projects]);

  const handleFixAudited = useCallback(async () => {
    const auditUrlUsed = lastAuditUrl ?? url.trim();
    if (!results || !linkedProjectId || !auditUrlUsed) return;
    setFixLoading(true);
    try {
      const project =
        projects.find((p) => p.id === linkedProjectId) ??
        (await getProjectResolved(linkedProjectId));
      const repoPath = project?.repoPath?.trim();
      if (!repoPath) {
        toast.error("Linked project has no repo path. Set it in project details.");
        return;
      }
      const promptText = buildFixAuditedPrompt(auditUrlUsed, results);
      await runTempTicket(repoPath, promptText, "Fix Audited", {});
      toast.success("Fix Audited queued. Check the Worker tab.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to queue Fix Audited");
    } finally {
      setFixLoading(false);
    }
  }, [results, linkedProjectId, lastAuditUrl, url, projects, runTempTicket]);

  const hasBadResults =
    results != null && results.length > 0 && hasBadAuditResults(results);
  const showFixAudited =
    results != null && hasBadResults && linkedProjectId != null;

  return (
    <div className="space-y-4">
      {/* Input Mode Toggle */}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "url" | "project")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="project">Linked Project</TabsTrigger>
        </TabsList>

        {/* URL Input Mode */}
        <TabsContent value="url" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="app-analyzer-url">Website or Application URL</Label>
            <Input
              id="app-analyzer-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="max-w-2xl"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Enter any publicly accessible URL to analyze</p>
          </div>
        </TabsContent>

        {/* Project Input Mode */}
        <TabsContent value="project" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="app-analyzer-project">Select Project</Label>
            <Select
              value={linkedProjectId ?? "none"}
              onValueChange={(v) => setLinkedProjectId(v === "none" ? null : v)}
              disabled={loading}
            >
              <SelectTrigger id="app-analyzer-project" className="max-w-2xl">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project selected</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Project must have a run port configured to analyze the running application
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Optional: Link Project for Fix Audited */}
      {inputMode === "url" && (
        <div className="space-y-2">
          <Label htmlFor="app-analyzer-project-fix">Link project (for Fix Audited)</Label>
          <Select
            value={linkedProjectId ?? "none"}
            onValueChange={(v) => setLinkedProjectId(v === "none" ? null : v)}
            disabled={loading}
          >
            <SelectTrigger id="app-analyzer-project-fix" className="max-w-2xl">
              <SelectValue placeholder="No project linked" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project linked</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Optional: Link a project to fix issues found in the audit</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={runAudit} disabled={loading}>
          <Play className="h-4 w-4 mr-2" aria-hidden />
          {loading ? "Analyzing..." : "Analyze"}
        </Button>
        {showFixAudited && (
          <Button
            variant="secondary"
            onClick={handleFixAudited}
            disabled={fixLoading}
          >
            {fixLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <Wrench className="h-4 w-4 mr-2" aria-hidden />
            )}
            Fix Issues
          </Button>
        )}
      </div>

      {/* Results */}
      <AuditResults results={results} loading={loading} error={error} />
    </div>
  );
}
