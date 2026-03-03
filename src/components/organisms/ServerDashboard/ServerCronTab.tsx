"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Clock, Plus, MessageSquare, Send, Terminal, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { getServerApiUrl } from "@/lib/server-api-url";
import { dispatchServerTerminalRanAndOpenFloating, scrollToServerTerminal } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";
import {
  parseCrontabOutput,
  type ParsedCronLine,
  type ParsedCronFile,
} from "@/lib/parse-crontab-output";

const AGENTS_BASE = "/var/www/ai/agents";
const SCHEDULE_PRESETS = [
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily (midnight)", value: "0 0 * * *" },
  { label: "Daily (2am)", value: "0 2 * * *" },
  { label: "Daily (3am)", value: "0 3 * * *" },
  { label: "Weekly (Sun 0:00)", value: "0 0 * * 0" },
  { label: "Every 15 min", value: "*/15 * * * *" },
];

interface AgentJob {
  id?: number | string;
  name: string;
  schedule: string;
  handler: string;
  enabled: boolean | number;
  last_run?: string;
}

/** Render a list of parsed cron lines (comments, variables, jobs). */
function CronLinesBlock({ lines, showUserColumn = false }: { lines: ParsedCronLine[]; showUserColumn?: boolean }) {
  const jobs = lines.filter((l) => l.type === "job");
  const vars = lines.filter((l) => l.type === "variable");
  const commentsAndEmpty = lines.filter((l) => l.type === "comment" || l.type === "empty");

  return (
    <div className="space-y-3">
      {vars.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vars.map((v, i) => (
            <Badge key={i} variant="secondary" className="font-mono text-[10px] py-0">
              {v.key}={v.value}
            </Badge>
          ))}
        </div>
      )}
      {commentsAndEmpty.map((l, i) => (
        <div key={i} className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words">
          {l.raw || " "}
        </div>
      ))}
      {jobs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-[10px] font-medium text-muted-foreground w-[140px]">Schedule</TableHead>
              {showUserColumn && (
                <TableHead className="text-[10px] font-medium text-muted-foreground w-[70px]">User</TableHead>
              )}
              <TableHead className="text-[10px] font-medium text-muted-foreground">Command</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j, i) => (
              <TableRow key={i} className="border-border/30 font-mono text-xs">
                <TableCell className="py-1.5 text-emerald-500/90 whitespace-nowrap">{j?.schedule ?? "—"}</TableCell>
                {showUserColumn && (
                  <TableCell className="py-1.5 text-muted-foreground">{j?.user ?? "—"}</TableCell>
                )}
                <TableCell className="py-1.5 text-foreground/90 break-all">{j?.command ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/** Single cron.d file in accordion. */
function CronDFileBlock({ file }: { file: ParsedCronFile }) {
  const hasJobs = file.lines.some((l) => l.type === "job");
  return (
    <AccordionItem value={file.path} className="border-border/40">
      <AccordionTrigger className="py-3 text-xs font-medium hover:no-underline">
        <span className="flex items-center gap-2 truncate">
          <FileText className="size-3.5 text-muted-foreground shrink-0" />
          {file.path}
          {hasJobs && (
            <Badge variant="outline" className="text-[10px] py-0 ml-1">
              {file.lines.filter((l) => l.type === "job").length} job(s)
            </Badge>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-0 pb-3">
        <div className="rounded-md bg-muted/30 border border-border/40 p-3">
          <CronLinesBlock lines={file.lines} showUserColumn={true} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

type JobType = "agent" | "command";

interface GeneratedSuggestion {
  schedule: string;
  type: JobType;
  prompt: string;
  command: string;
  description: string;
}

export function ServerCronTab({ sessionId }: { sessionId: string }) {
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [agentTier, setAgentTier] = useState<"basic" | "advanced" | "premium">("basic");
  const [agentJobs, setAgentJobs] = useState<AgentJob[]>([]);
  const [agentJobsLoading, setAgentJobsLoading] = useState(false);

  const [schedule, setSchedule] = useState("");
  const [jobType, setJobType] = useState<JobType>("agent");
  const [prompt, setPrompt] = useState("");
  const [command, setCommand] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [chatMessage, setChatMessage] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<GeneratedSuggestion | null>(null);
  const [generateInstruction, setGenerateInstruction] = useState<string | null>(null);
  const [showRawCrontab, setShowRawCrontab] = useState(false);

  const parsedCrontab = useMemo(
    () => (output != null && output.trim() ? parseCrontabOutput(output) : null),
    [output]
  );

  const botPath = `${AGENTS_BASE}/${agentTier}`;
  const fetchAgentJobs = useCallback(async () => {
    setAgentJobsLoading(true);
    try {
      const res = await fetch(
        getServerApiUrl(
          `/api/ai-bots/jobs?sessionId=${encodeURIComponent(sessionId)}&botPath=${encodeURIComponent(botPath)}`
        )
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.jobs)) {
        setAgentJobs(data.jobs);
      } else {
        setAgentJobs([]);
      }
    } catch {
      setAgentJobs([]);
    } finally {
      setAgentJobsLoading(false);
    }
  }, [sessionId, agentTier, botPath]);

  useEffect(() => {
    if (sessionId) fetchAgentJobs();
  }, [sessionId, agentTier, fetchAgentJobs]);

  const fetchCron = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getServerApiUrl(`/api/server/cron?sessionId=${encodeURIComponent(sessionId)}`));
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to fetch crontab");
      setOutput((data as { output?: string }).output ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load crontab");
      setOutput(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCron();
  }, [fetchCron]);

  const handleAddJob = useCallback(async () => {
    const sched = schedule.trim();
    if (!sched) {
      toast.error("Enter a cron schedule");
      return;
    }
    if (jobType === "agent" && !prompt.trim()) {
      toast.error("Enter a prompt for the Cursor CLI agent");
      return;
    }
    if (jobType === "command" && !command.trim()) {
      toast.error("Enter a command");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch(getServerApiUrl("/api/server/cron"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          schedule: sched,
          type: jobType,
          prompt: jobType === "agent" ? prompt.trim() : undefined,
          command: jobType === "command" ? command.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to add job");
      toast.success("Cron job added");
      setSchedule("");
      setPrompt("");
      setCommand("");
      setSuggestion(null);
      fetchCron();
      dispatchServerTerminalRanAndOpenFloating(sessionId);
      try {
        await fetch(getServerApiUrl("/api/server/terminal/inject"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, type: "command", command: "echo '[Cron] Job added to crontab. Run crontab -l to see it.'" }),
        });
      } catch (_) {}
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add cron job");
    } finally {
      setAddLoading(false);
    }
  }, [sessionId, schedule, jobType, prompt, command, fetchCron]);

  const handleApplySuggestion = useCallback(() => {
    if (!suggestion) return;
    setSchedule(suggestion.schedule);
    setJobType(suggestion.type);
    setPrompt(suggestion.prompt);
    setCommand(suggestion.command);
  }, [suggestion]);

  const handleGenerate = useCallback(async () => {
    const msg = chatMessage.trim();
    if (!msg) {
      toast.error("Describe the cron job you want");
      return;
    }
    setGenerateLoading(true);
    setSuggestion(null);
    setGenerateInstruction(null);
    try {
      const res = await fetch(getServerApiUrl("/api/server/cron/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Generate failed");
      if ((data as { instruction?: string }).instruction) {
        setGenerateInstruction((data as { instruction: string }).instruction);
        return;
      }
      const s = (data as { suggestion: GeneratedSuggestion }).suggestion;
      if (s) {
        setSuggestion(s);
        dispatchServerTerminalRanAndOpenFloating(sessionId);
        try {
          await fetch(getServerApiUrl("/api/server/terminal/inject"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, type: "command", command: "echo '[Cron] Suggestion ready. Use the form above to add it, or click the terminal button to open the terminal.'" }),
          });
        } catch (_) {}
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerateLoading(false);
    }
  }, [chatMessage, sessionId]);

  return (
    <div className="space-y-6">
      {/* Agent cron jobs (per-tier, from jobs.db) — primary view */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="size-4 text-indigo-400" />
            Agent cron jobs
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Jobs for the selected agent only (from <code className="text-[10px]">{botPath}/cron/jobs.db</code>). To manage these, use AI Bots → [tier] → Cron.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["basic", "advanced", "premium"] as const).map((tier) => (
              <Button
                key={tier}
                type="button"
                variant={agentTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setAgentTier(tier)}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={fetchAgentJobs} disabled={agentJobsLoading}>
              {agentJobsLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
          </div>
          {agentJobsLoading && agentJobs.length === 0 ? (
            <div className="rounded-md bg-muted/50 border border-border/50 p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : agentJobs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No jobs for this agent.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-[10px] font-medium text-muted-foreground w-[120px]">Schedule</TableHead>
                  <TableHead className="text-[10px] font-medium text-muted-foreground">Name</TableHead>
                  <TableHead className="text-[10px] font-medium text-muted-foreground">Handler</TableHead>
                  <TableHead className="text-[10px] font-medium text-muted-foreground w-[90px]">Last run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentJobs.map((job, i) => (
                  <TableRow key={job.id ?? i} className="border-border/30 font-mono text-xs">
                    <TableCell className="py-1.5 text-emerald-500/90 whitespace-nowrap">{job.schedule || "—"}</TableCell>
                    <TableCell className="py-1.5">{job.name || "—"}</TableCell>
                    <TableCell className="py-1.5 truncate max-w-[200px]" title={job.handler}>{job.handler || "—"}</TableCell>
                    <TableCell className="py-1.5 text-muted-foreground">{job.last_run || "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add by configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="size-4 text-emerald-400" />
            Add cron job
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Schedule (cron expression) and either a Cursor CLI agent prompt or a raw command.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Input
                placeholder="0 2 * * *"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="font-mono text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_PRESETS.map((p) => (
                  <Button
                    key={p.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setSchedule(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={jobType === "agent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setJobType("agent")}
                >
                  Cursor CLI agent
                </Button>
                <Button
                  type="button"
                  variant={jobType === "command" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setJobType("command")}
                >
                  Raw command
                </Button>
              </div>
            </div>
          </div>
          {jobType === "agent" && (
            <div className="space-y-2">
              <Label>Agent prompt</Label>
              <Textarea
                placeholder="e.g. Check disk space and append one line to /var/log/disk.log"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] font-mono text-sm resize-none"
              />
            </div>
          )}
          {jobType === "command" && (
            <div className="space-y-2">
              <Label>Command (single line)</Label>
              <Input
                placeholder="e.g. /usr/local/bin/backup.sh"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          )}
          <Button onClick={handleAddJob} disabled={addLoading}>
            {addLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add to crontab
          </Button>
        </CardContent>
      </Card>

      {/* Create from description (chat) */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="size-4 text-indigo-400" />
            Create from description
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Describe the cron job you want. Cursor CLI (agent or cursor-agent) on the server will suggest a schedule and prompt; you can then add it above. No API key required.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g. Every hour run the Cursor CLI agent with prompt: check disk space and log to /var/log/disk.log"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="min-h-[72px] resize-none"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleGenerate())}
            />
            <Button onClick={handleGenerate} disabled={generateLoading} size="icon" className="shrink-0 h-10 w-10">
              {generateLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
          {generateInstruction && (
            <p className="text-sm text-muted-foreground">{generateInstruction}</p>
          )}
          {suggestion && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">{suggestion.description || "Suggested job"}</p>
              <p className="text-xs font-mono text-muted-foreground">
                Schedule: {suggestion.schedule} | Type: {suggestion.type}
              </p>
              {suggestion.type === "agent" && suggestion.prompt && (
                <p className="text-xs text-muted-foreground">Prompt: {suggestion.prompt}</p>
              )}
              {suggestion.type === "command" && suggestion.command && (
                <p className="text-xs text-muted-foreground">Command: {suggestion.command}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleApplySuggestion}>
                  Use in form above
                </Button>
                <Button variant="ghost" size="sm" onClick={scrollToServerTerminal} className="gap-1.5">
                  <Terminal className="size-3.5" />
                  View terminal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All server cron (crontab, /etc/cron.d/) — secondary, collapsible */}
      <Accordion type="single" collapsible defaultValue="" className="w-full">
        <AccordionItem value="system-cron" className="border border-border/50 rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b border-border/50">
            <span className="text-sm font-medium flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              All server cron (crontab, /etc/crontab, /etc/cron.d/)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Card className="border-0 rounded-none shadow-none bg-transparent">
              <CardContent className="pt-3">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyTextToClipboard(output ?? "")}
                    className="gap-1.5"
                    title="Copy full crontab output"
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchCron} disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Refresh
                  </Button>
                  {parsedCrontab && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRawCrontab((v) => !v)}
                      className="gap-1.5 text-muted-foreground"
                    >
                      {showRawCrontab ? "Hide raw" : "View raw"}
                    </Button>
                  )}
                </div>
                {loading && output == null ? (
                  <div className="rounded-md bg-muted/50 border border-border/50 p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : showRawCrontab || !parsedCrontab ? (
                  <pre className="rounded-md bg-muted/50 border border-border/50 p-4 text-xs font-mono overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                    {output ?? "No output"}
                  </pre>
                ) : (
                  <div className="space-y-6 max-h-[520px] overflow-y-auto">
                    <div className="rounded-md border border-border/50 bg-muted/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-border/50 bg-muted/40 text-xs font-medium text-foreground">
                        {parsedCrontab.userSection.title}
                      </div>
                      <div className="p-3">
                        {parsedCrontab.userSection.lines.length === 0 ||
                        (parsedCrontab.userSection.lines.length === 1 &&
                          parsedCrontab.userSection.lines[0].raw.trim() === "(none)") ? (
                          <p className="text-xs text-muted-foreground">(none)</p>
                        ) : (
                          <CronLinesBlock lines={parsedCrontab.userSection.lines} showUserColumn={false} />
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border border-border/50 bg-muted/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-border/50 bg-muted/40 text-xs font-medium text-foreground">
                        {parsedCrontab.systemCrontabSection.title}
                      </div>
                      <div className="p-3">
                        <CronLinesBlock lines={parsedCrontab.systemCrontabSection.lines} showUserColumn={true} />
                      </div>
                    </div>
                    <div className="rounded-md border border-border/50 bg-muted/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-border/50 bg-muted/40 text-xs font-medium text-foreground">
                        {parsedCrontab.cronDSection.title}
                      </div>
                      <div className="p-2">
                        {parsedCrontab.cronDSection.files.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-3">No files</p>
                        ) : (
                          <Accordion type="multiple" className="w-full" defaultValue={[]}>
                            {parsedCrontab.cronDSection.files.map((file) => (
                              <CronDFileBlock key={file.path} file={file} />
                            ))}
                          </Accordion>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
