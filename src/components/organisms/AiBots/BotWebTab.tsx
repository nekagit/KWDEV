"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Globe, Plus, Shield, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { WEB_SCRAPING_SKILL_MARKDOWN } from "@/data/web-scraping-skill";

const REPOS = [
  {
    name: "undetected-browser",
    url: "https://github.com/AlloryDante/undetected-browser",
    description: "Puppeteer wrapper with ghost-cursor, humanize; smart clicks, fingerprint checks.",
  },
  {
    name: "ghost-cursor",
    url: "https://github.com/Xetera/ghost-cursor",
    description: "Human-like mouse paths, overshoot, random coords within elements.",
  },
  {
    name: "puppeteer-extra-plugin-stealth",
    url: "https://www.npmjs.com/package/puppeteer-extra-plugin-stealth",
    description: "Evasion for Puppeteer.",
  },
  {
    name: "undetectable-fingerprint-browser",
    url: "https://github.com/itbrowser-net/undetectable-fingerprint-browser",
    description: "Fingerprint spoofing, WebRTC/proxy; integrates with Puppeteer/Playwright.",
  },
  {
    name: "playwright_stealth",
    url: "https://github.com/Mattwmaster58/playwright_stealth",
    description: "Playwright evasion (Python).",
  },
] as const;

export function BotWebTab({
  sessionId,
  botPath,
  onInsertSkill,
}: {
  sessionId: string;
  botPath: string;
  onInsertSkill: (content: string) => void;
}) {
  const [taskInput, setTaskInput] = useState("");
  const [taskRunning, setTaskRunning] = useState(false);
  const [taskResponse, setTaskResponse] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleAddSkill = () => {
    onInsertSkill(WEB_SCRAPING_SKILL_MARKDOWN);
  };

  const handleRunTask = async () => {
    const task = taskInput.trim();
    if (!task || taskRunning) return;
    setTaskRunning(true);
    setTaskResponse(null);
    setTaskError(null);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/playground"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          message: task,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTaskError(data?.error || `Request failed (${res.status})`);
        toast.error(data?.error || "Task failed");
        return;
      }
      setTaskResponse(data.response ?? "No response from bot");
      if (data.debug) setTaskResponse((prev) => (prev ? `${prev}\n\n[Debug: ${data.debug}]` : `[Debug: ${data.debug}]`));
      toast.success("Task sent; see response below.");
    } catch (err) {
      const msg = (err as Error).message;
      setTaskError(msg);
      toast.error(msg);
    } finally {
      setTaskRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-4 h-4 text-muted-foreground" />
            Run a browser automation task
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Give the bot a task; it will use zeroclaw&apos;s browser automation (or its tools) to perform it. The app first tries the bot&apos;s /chat endpoint (BOT_PORT); if that isn&apos;t available, it runs the task via the agent CLI on the server (cursor/agent). Response appears below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="web-task-input" className="text-sm font-medium">
              Task
            </Label>
            <Textarea
              id="web-task-input"
              placeholder="e.g. Open example.com and return the page title"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              className="min-h-[100px] resize-y font-mono text-sm"
              disabled={taskRunning}
            />
          </div>
          <Button onClick={handleRunTask} disabled={!taskInput.trim() || taskRunning} className="gap-2">
            {taskRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {taskRunning ? "Running…" : "Run task"}
          </Button>
          {taskError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {taskError}
            </div>
          )}
          {taskResponse !== null && !taskError && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Bot response</p>
              <pre className="text-sm whitespace-pre-wrap break-words font-sans">{taskResponse}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Web scraping and browser automation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add browser automation and web-scraping for this zeroclaw agent. Prefer zeroclaw's built-in browser automation (allowlisted domains, TOML config, <code className="text-xs bg-muted px-1 rounded">zeroclaw tools list</code>). For stricter anti-detection or human-like flows (e.g. Instagram login), use Puppeteer/Playwright with the linked open-source stealth and humanize tools.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Zeroclaw built-in browser automation</h3>
            <p className="text-sm text-muted-foreground mb-2">
              ZeroClaw includes built-in browser automation as part of its tool set. Use it first when the agent runs under zeroclaw: configure allowlisted domains and options in zeroclaw's TOML/config; list available tools with <code className="text-xs bg-muted px-1 rounded">zeroclaw tools list</code>. It works with the agent's shell, file I/O, and memory tools and respects sandbox and allowlist controls.
            </p>
            <a
              href="https://github.com/zeroclaw-labs/zeroclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              zeroclaw-labs/zeroclaw
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Other tools (when you need more control)</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong className="text-foreground">Selenium</strong> – cross-browser automation</li>
              <li><strong className="text-foreground">Puppeteer</strong> – Chrome/Chromium automation (Node)</li>
              <li><strong className="text-foreground">Playwright</strong> – multi-browser automation (Node or Python)</li>
              <li><strong className="text-foreground">Stealth / undetected wrappers</strong> – evasion for headless browsers</li>
              <li><strong className="text-foreground">ghost-cursor</strong> – human-like mouse movement</li>
              <li><strong className="text-foreground">humanize</strong> – realistic typing and clicks</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Open-source repos
            </h3>
            <ul className="space-y-2">
              {REPOS.map((repo) => (
                <li key={repo.name} className="text-sm">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    {repo.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-muted-foreground"> – {repo.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Anti-bot and human-like behavior
            </h3>
            <p className="text-sm text-muted-foreground">
              Use stealth or undetected browser wrappers; add random delays between actions and occasional scrolls or small movements. Before or during login, perform harmless human-like actions (e.g. scroll, click an empty area) then focus the form. Use ghost-cursor (or equivalent) for all clicks and humanize for typing. These patterns help with login flows (e.g. Instagram) where bot detection is used.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <Button onClick={handleAddSkill} className="gap-2">
              <Plus className="w-4 h-4" />
              Add web scraping skill
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Appends the skill to the Skills tab so you can edit and save.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
