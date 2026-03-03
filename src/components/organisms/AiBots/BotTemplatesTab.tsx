"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code2 } from "lucide-react";
import { toast } from "sonner";
import { WEB_SCRAPING_SKILL_MARKDOWN } from "@/data/web-scraping-skill";

interface Template {
  id: string;
  name: string;
  category: "skill" | "cron" | "playground";
  description: string;
  content: string;
}

const TELEGRAM_TEMPLATES: Template[] = [
  {
    id: "telegram-welcome-skill",
    name: "Welcome Message Handler",
    category: "skill",
    description: "Handle /start command and welcome new users",
    content: `# Telegram Bot Skills

## Welcome Handler
Send a personalized welcome message when users start the bot.

### When to use
- User sends /start command
- New user first interaction
- Bot is restarted and needs to greet users

### What to do
1. Detect /start command from message
2. Extract user ID and username
3. Send welcome message with keyboard buttons
4. Store user info in database
5. Log the interaction

### Important
- Always validate Telegram user ID before processing
- Store user state for multi-step conversations
- Use reply keyboards for better UX
- Handle errors gracefully with error messages`,
  },
  {
    id: "telegram-message-skill",
    name: "Message Handler",
    category: "skill",
    description: "Process incoming messages and respond intelligently",
    content: `# Telegram Bot Skills

## Message Handler
Process and respond to user messages with context awareness.

### When to use
- User sends any text message
- Need to process natural language input
- Require context-aware responses

### What to do
1. Parse incoming message text
2. Extract intent and keywords
3. Check user permissions and state
4. Generate context-aware response
5. Send reply to user
6. Log message in analytics

### Important
- Implement rate limiting to prevent spam
- Validate message length and content
- Use message IDs for threading
- Handle special characters in text
- Support markdown formatting in responses`,
  },
  {
    id: "telegram-callback-skill",
    name: "Button Callback Handler",
    category: "skill",
    description: "Handle inline button and callback queries",
    content: `# Telegram Bot Skills

## Callback Query Handler
Process button clicks and inline query responses.

### When to use
- User clicks an inline button
- Need to handle callback data
- Update bot state based on user action

### What to do
1. Receive callback_query update
2. Extract button data and user action
3. Validate user permissions
4. Execute corresponding action
5. Send answer notification with toast
6. Edit or send confirmation message

### Important
- Always answer callback queries (even with empty text)
- Use edit_message for updating existing messages
- Keep callback data under 64 bytes
- Implement timeout handling for callbacks
- Log all user actions for audit`,
  },
  {
    id: "telegram-hourly-job",
    name: "Hourly Channel Update",
    category: "cron",
    description: "Post hourly updates to Telegram channel",
    content: `Hourly channel update: 0 * * * * (runs every hour at minute 0)
Handler: /var/www/ai/agents/basic/handlers/telegram-hourly-post.sh
Script that:
1. Fetches current data/metrics from database
2. Formats message with markdown
3. Sends to Telegram channel via bot API
4. Logs post status and timestamp`,
  },
  {
    id: "telegram-daily-job",
    name: "Daily Digest",
    category: "cron",
    description: "Send daily summary/digest to users",
    content: `Daily digest: 0 8 * * * (runs every day at 8:00 AM UTC)
Handler: /var/www/ai/agents/basic/handlers/telegram-daily-digest.sh
Script that:
1. Collect data from last 24 hours
2. Generate summary with statistics
3. Send personalized digest to each subscribed user
4. Track delivery and engagement`,
  },
  {
    id: "telegram-weekly-job",
    name: "Weekly Report",
    category: "cron",
    description: "Generate and send weekly performance report",
    content: `Weekly report: 0 9 * * 1 (runs every Monday at 9:00 AM UTC)
Handler: /var/www/ai/agents/basic/handlers/telegram-weekly-report.sh
Script that:
1. Aggregate data from the past week
2. Create visual charts/summaries
3. Send formatted report with inline buttons
4. Allow users to drill-down into details`,
  },
  {
    id: "telegram-cleanup-job",
    name: "Database Cleanup",
    category: "cron",
    description: "Clean up old messages and logs periodically",
    content: `Database cleanup: 0 2 * * * (runs daily at 2:00 AM UTC)
Handler: /var/www/ai/agents/basic/handlers/telegram-cleanup.sh
Script that:
1. Delete messages older than 30 days
2. Archive old logs to cold storage
3. Vacuum database to reclaim space
4. Send admin notification of cleanup results`,
  },
  {
    id: "telegram-test-welcome",
    name: "Test Welcome Flow",
    category: "playground",
    description: "Test the /start command and welcome message",
    content: `/start`,
  },
  {
    id: "telegram-test-help",
    name: "Test Help Command",
    category: "playground",
    description: "Test the /help command for available features",
    content: `/help`,
  },
  {
    id: "telegram-test-message",
    name: "Test Message Handling",
    category: "playground",
    description: "Test natural language message processing",
    content: `Hello! I need help with scheduling a message for tomorrow at 2 PM.`,
  },
  {
    id: "telegram-test-callback",
    name: "Test Callback Button",
    category: "playground",
    description: "Test inline button callback handling",
    content: `Click on a button to test the callback handler`,
  },
  {
    id: "telegram-test-status",
    name: "Test Status Check",
    category: "playground",
    description: "Check bot status and recent activity",
    content: `/status`,
  },
  {
    id: "telegram-test-list",
    name: "Test List Command",
    category: "playground",
    description: "List all available features and commands",
    content: `/list`,
  },
  {
    id: "web-scraping-skill",
    name: "Web scraping and browser automation",
    category: "skill",
    description: "Selenium, Puppeteer, Playwright with anti-detection and human-like behavior (e.g. Instagram login)",
    content: WEB_SCRAPING_SKILL_MARKDOWN,
  },
];

export function BotTemplatesTab({
  sessionId,
  botPath,
  onInsertSkill,
  onInsertJob,
  onInsertPlayground,
}: {
  sessionId: string;
  botPath: string;
  onInsertSkill: (content: string) => void;
  onInsertJob: (name: string, schedule: string, handler: string) => void;
  onInsertPlayground: (message: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "skill" | "cron" | "playground">("all");

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleInsert = (template: Template) => {
    if (template.category === "skill") {
      onInsertSkill(template.content);
      toast.success("Skill template inserted. Switch to Skills tab to edit.");
    } else if (template.category === "cron") {
      // Parse cron job template
      const lines = template.content.split("\n");
      const scheduleLine = lines[0]; // "Hourly channel update: 0 * * * *"
      const handlerLine = lines[1]; // "Handler: /path/to/handler.sh"

      const schedule = scheduleLine.split(": ")[1].trim();
      const handler = handlerLine.split(": ")[1].trim();
      const name = template.name;

      onInsertJob(name, schedule, handler);
      toast.success("Job template inserted. Switch to Cron tab to confirm.");
    } else if (template.category === "playground") {
      onInsertPlayground(template.content);
      toast.success("Playground template inserted. Switch to Playground tab to test.");
    }
  };

  const filtered = TELEGRAM_TEMPLATES.filter(
    (t) => filter === "all" || t.category === filter
  );

  const skillCount = TELEGRAM_TEMPLATES.filter((t) => t.category === "skill").length;
  const cronCount = TELEGRAM_TEMPLATES.filter((t) => t.category === "cron").length;
  const playgroundCount = TELEGRAM_TEMPLATES.filter((t) => t.category === "playground").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Telegram Template Library</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Pre-built templates for Telegram bot skills (user interactions) and scheduled jobs. Copy or insert directly into their respective tabs.
        </p>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            All Templates ({skillCount + cronCount + playgroundCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "skill" ? "default" : "outline"}
            onClick={() => setFilter("skill")}
            className="text-xs"
          >
            Skills ({skillCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "cron" ? "default" : "outline"}
            onClick={() => setFilter("cron")}
            className="text-xs"
          >
            Cron Jobs ({cronCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "playground" ? "default" : "outline"}
            onClick={() => setFilter("playground")}
            className="text-xs"
          >
            Playground ({playgroundCount})
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((template) => (
          <Card key={template.id} className="flex flex-col bg-card-tint-1 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
                <Badge
                  variant={
                    template.category === "skill"
                      ? "default"
                      : template.category === "cron"
                        ? "secondary"
                        : "outline"
                  }
                  className="shrink-0 text-xs"
                >
                  {template.category === "skill"
                    ? "Skill"
                    : template.category === "cron"
                      ? "Cron"
                      : "Playground"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col space-y-3">
              {/* Preview */}
              <div className="rounded-lg bg-muted/50 p-3 overflow-hidden">
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words line-clamp-4">
                  {template.content}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1"
                  onClick={() => handleCopy(template.id, template.content)}
                >
                  {copied === template.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs gap-1"
                  onClick={() => handleInsert(template)}
                >
                  <Code2 className="w-3 h-3" />
                  Insert
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No templates found for selected filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
