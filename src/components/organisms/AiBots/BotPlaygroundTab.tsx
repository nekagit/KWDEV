"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { Send, RotateCcw, Download, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "bot";
  content: string;
  tokens?: number;
  latency?: number;
  debug?: string;
}

export function BotPlaygroundTab({
  sessionId,
  botPath,
  initialMessage,
}: {
  sessionId: string;
  botPath: string;
  initialMessage?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage || "");
  const [sending, setSending] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [model, setModel] = useState("default");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
      toast.success("Playground template loaded!");
    }
  }, [initialMessage]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    // Add user message
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai-bots/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          message: input,
          overrides: { temperature, model },
        }),
      });

      const data = await res.json();
      const botMsg: Message = {
        role: "bot",
        content: data.response || "No response",
        tokens: data.tokens,
        latency: data.latency,
        debug: data.debug,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "bot",
        content: `Error: ${(err as Error).message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleExport = () => {
    const content = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playground-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyConversation = () => {
    const text = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 flex flex-col h-[600px]">
      {/* Controls */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium block mb-1">Temperature</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">{temperature.toFixed(1)}</p>
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium block mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
          >
            <option>default</option>
            <option>gpt-4</option>
            <option>gpt-3.5</option>
            <option>claude</option>
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <Button size="sm" variant="outline" onClick={() => setMessages([])}>
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 rounded-lg border border-border/50 bg-muted/20 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No messages yet. Start a conversation!</p>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary/20 text-primary-foreground"
                    : "bg-muted/50 text-foreground"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.tokens && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {msg.tokens} tokens • {msg.latency}ms
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={sending}
          className="text-sm"
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyConversation}
          className="w-10"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
