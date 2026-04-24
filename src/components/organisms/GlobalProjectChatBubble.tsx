"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProjectResolved } from "@/lib/api-projects";
import { getAgentProvider } from "@/lib/agent-provider";
import { useRunStore } from "@/store/run-store";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function buildExecutionPrompt(projectId: string, userMessage: string): string {
  return [
    `Project ID: ${projectId}`,
    "You are executing a direct user request in this project.",
    "Perform the requested actions directly in project files/data when possible.",
    "Do not only explain what to do; execute it.",
    "After execution, output a concise summary of what was changed.",
    "",
    `User request: ${userMessage}`,
  ].join("\n");
}

export function GlobalProjectChatBubble() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const projectId = useMemo(() => {
    const directMatch = pathname?.match(/^\/projects\/([^/]+)$/);
    if (directMatch && directMatch[1] !== "new") return directMatch[1];
    if (pathname === "/projects") {
      return searchParams?.get("open") ?? null;
    }
    return null;
  }, [pathname, searchParams]);

  const addMessage = useCallback((role: "user" | "assistant", text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text },
    ]);
  }, []);

  const handleSend = useCallback(async () => {
    const userMessage = input.trim();
    if (!userMessage || sending) return;
    if (!projectId) {
      addMessage("assistant", "Open a project first, then I can run actions for that project.");
      return;
    }
    setInput("");
    addMessage("user", userMessage);
    setSending(true);
    try {
      const project = await getProjectResolved(projectId);
      const projectPath = project.repoPath?.trim();
      if (!projectPath) {
        addMessage("assistant", "This project has no repo path. Set a repo path first, then try again.");
        return;
      }
      const provider = getAgentProvider(projectId);
      const prompt = buildExecutionPrompt(projectId, userMessage);
      await runTempTicket(projectPath, prompt, "Global Chat", {
        provider,
        agentMode: "agent",
      });
      addMessage("assistant", `Running with ${provider}. I started execution for this project request.`);
    } catch (e) {
      addMessage("assistant", e instanceof Error ? e.message : "Failed to start project action.");
    } finally {
      setSending(false);
    }
  }, [input, sending, projectId, addMessage, runTempTicket]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-[2147483647]">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 rounded-full"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open project chat"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
      {open && (
        <div className="fixed right-4 top-16 z-[2147483647] w-[360px] rounded-xl border border-border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Project Chat</p>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
              aria-label="Close project chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mb-3 h-56 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Ask me to execute project work (for example: create rules in the security tab).
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "rounded-md bg-primary/10 px-2 py-1.5 text-xs"
                        : "rounded-md bg-muted px-2 py-1.5 text-xs"
                    }
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a project action..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={sending}
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void handleSend()}
              disabled={sending || !input.trim()}
              aria-label="Send chat message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
