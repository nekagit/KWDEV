"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Zap, FileText, Brain, Database, ChevronRight, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  name: string;
  path: string;
  hasSkill: boolean;
  hasMemory: boolean;
  hasJobs: boolean;
}

export function AgentSelectorBar({
  sessionId,
  currentBotPath,
  onSelectAgent,
}: {
  sessionId: string;
  currentBotPath: string;
  onSelectAgent: (agent: Agent) => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ai-bots/agents?sessionId=${sessionId}&basePath=/var/www/ai`
      );
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadAgents();
    }
  }, [sessionId]);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }

    // Validate name: alphanumeric, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(newAgentName)) {
      toast.error("Agent name must contain only alphanumeric characters, hyphens, and underscores");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(
        `/api/ai-bots/agents/create?sessionId=${sessionId}&agentName=${encodeURIComponent(newAgentName)}&templatePath=/var/www/ai/zero&basePath=/var/www/ai`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create agent");
        return;
      }

      toast.success(`Agent '${newAgentName}' created successfully`);
      setNewAgentName("");
      setShowCreateForm(false);
      loadAgents();
    } catch (err) {
      toast.error("Failed to create agent");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-32 flex-shrink-0" />
          ))}
        </div>
      </Card>
    );
  }

  if (agents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Available Agents ({agents.length})
          </h3>
          {!showCreateForm && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreateForm(true)}
              className="h-auto p-1"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {agents.map((agent) => {
            const isActive = currentBotPath === agent.path;
            return (
              <button
                key={agent.name}
                onClick={() => onSelectAgent(agent)}
                className={cn(
                  "flex-shrink-0 px-4 py-3 rounded-lg border transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 border-border/50 hover:bg-muted hover:border-border text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left min-w-0">
                    <div className="font-medium text-sm truncate">
                      {agent.name}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {agent.hasSkill && (
                        <span title="Has skill.md">
                          <FileText className="w-3 h-3 opacity-60" />
                        </span>
                      )}
                      {agent.hasMemory && (
                        <span title="Has memory">
                          <Brain className="w-3 h-3 opacity-60" />
                        </span>
                      )}
                      {agent.hasJobs && (
                        <span title="Has jobs.db">
                          <Database className="w-3 h-3 opacity-60" />
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Create Agent Form */}
      {showCreateForm && (
        <Card className="bg-blue-500/5 border-blue-200/20 p-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="agent-name" className="text-sm font-medium">
                New Agent Name
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Copy of the 'zero' template (alphanumeric, hyphens, underscores)
              </p>
              <Input
                id="agent-name"
                placeholder="e.g., agent-2, research-bot, agent_prod"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreateAgent()}
                disabled={creating}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateAgent}
                disabled={creating || !newAgentName.trim()}
                className="flex-1"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {creating ? "Creating..." : "Create Agent"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewAgentName("");
                }}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
