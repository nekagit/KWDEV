"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { getServerApiUrl } from "@/lib/server-api-url";
import { parseMultipleSkills, buildMultipleSkillsMarkdown, type SkillFormFields } from "@/lib/skill-markdown";
import { RefreshCw, Copy, Check, FilePlus2, Loader2, Expand, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_SKILL_FIELDS: SkillFormFields = {
  title: "Agent skills",
  description: "Describe this agent's capabilities and instructions here.",
  whenToUse: "",
  whatToDo: "What this agent can do\nHow it should behave\nAny constraints or preferences",
  important: "",
  extraSections: [],
};

function emptySkill(): SkillFormFields {
  return {
    title: "",
    description: "",
    whenToUse: "",
    whatToDo: "",
    important: "",
    extraSections: [],
  };
}

export function BotSkillsTab({
  sessionId,
  botPath,
  templateContent,
  templateContentAppend,
  onTemplateContentAppendConsumed,
}: {
  sessionId: string;
  botPath: string;
  templateContent?: string | null;
  templateContentAppend?: string | null;
  onTemplateContentAppendConsumed?: () => void;
}) {
  /** Path under botPath: basic → .../basic/skills/agent-playground/SKILL.md, advanced → .../advanced/..., premium → .../premium/... */
  const SKILL_FILE_PATH = "skills/agent-playground/SKILL.md";

  const [rawContent, setRawContent] = useState<string | null>(null);
  const [skillFileName, setSkillFileName] = useState<string>(SKILL_FILE_PATH);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const [skills, setSkills] = useState<SkillFormFields[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const skillsRef = useRef<SkillFormFields[]>([]);
  skillsRef.current = skills;

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const url = getServerApiUrl(
        `/api/ai-bots/files/read?sessionId=${encodeURIComponent(sessionId)}&botPath=${encodeURIComponent(botPath)}&file=${encodeURIComponent(SKILL_FILE_PATH)}`
      );
      const res = await fetch(url);
      const data = await res.json();
      const text = (
        typeof data?.content === "string"
          ? data.content
          : data?.content != null
            ? String(data.content)
            : ""
      ).trim();
      const resolvedFile = typeof data?.resolvedFile === "string" ? data.resolvedFile : SKILL_FILE_PATH;
      if (res.ok && text) {
        setRawContent(text);
        const parsed = parseMultipleSkills(text);
        setSkills(parsed.length > 0 ? parsed : [emptySkill()]);
        setSkillFileName(resolvedFile);
        setExpandedIndex(0);
      } else {
        setRawContent(null);
        setSkills([emptySkill()]);
        setSkillFileName(SKILL_FILE_PATH);
        setExpandedIndex(0);
      }
    } catch {
      setRawContent(null);
      setSkills([emptySkill()]);
      setSkillFileName(SKILL_FILE_PATH);
      setExpandedIndex(0);
      toast.error("Could not load skills file");
    } finally {
      setLoading(false);
    }
  }, [sessionId, botPath]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    if (templateContent && templateContent.trim()) {
      const parsed = parseMultipleSkills(templateContent);
      if (parsed.length > 0) {
        setSkills(parsed);
        setRawContent(templateContent);
        setExpandedIndex(0);
        toast.success("Template inserted! You can now edit and save.");
      }
    }
  }, [templateContent]);

  useEffect(() => {
    if (!templateContentAppend || !templateContentAppend.trim()) return;
    if (loading) return;
    const parsed = parseMultipleSkills(templateContentAppend);
    if (parsed.length === 0) {
      onTemplateContentAppendConsumed?.();
      return;
    }
    const prev = skillsRef.current;
    const next = [...prev, ...parsed];
    setSkills(next);
    setRawContent(buildMultipleSkillsMarkdown(next));
    setExpandedIndex(next.length - parsed.length);
    toast.success("Web scraping skill appended. You can now edit and save.");
    onTemplateContentAppendConsumed?.();
  }, [templateContentAppend, loading, onTemplateContentAppendConsumed]);

  const composedMd = buildMultipleSkillsMarkdown(skills);
  const hasExistingSkills = rawContent != null && rawContent.trim().length > 0;

  const handleSaveSkills = async () => {
    setSaving(true);
    try {
      const content = buildMultipleSkillsMarkdown(
        skills.length > 0 ? skills : [DEFAULT_SKILL_FIELDS]
      );
      const res = await fetch(getServerApiUrl("/api/ai-bots/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, botPath, file: skillFileName, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to save skills");
        return;
      }
      toast.success("Skills saved");
      setRawContent(content);
      await loadSkills();
    } catch (err) {
      toast.error((err as Error).message || "Failed to save skills");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(composedMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateSkill = (index: number, patch: Partial<SkillFormFields>) => {
    setSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addSkill = () => {
    setSkills((prev) => [...prev, emptySkill()]);
    setExpandedIndex(skills.length);
  };

  const deleteSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(index > 0 ? index - 1 : null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const addExtraSection = (skillIndex: number) => {
    updateSkill(skillIndex, {
      extraSections: [...skills[skillIndex].extraSections, { heading: "", content: "" }],
    });
  };

  const updateExtraSection = (skillIndex: number, sectionIndex: number, patch: { heading?: string; content?: string }) => {
    updateSkill(skillIndex, {
      extraSections: skills[skillIndex].extraSections.map((sec, i) =>
        i === sectionIndex ? { ...sec, ...patch } : sec
      ),
    });
  };

  const removeExtraSection = (skillIndex: number, sectionIndex: number) => {
    updateSkill(skillIndex, {
      extraSections: skills[skillIndex].extraSections.filter((_, i) => i !== sectionIndex),
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border/50 pb-3">
        <h3 className="text-sm font-semibold">Agent Skills & Instructions</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleSaveSkills} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : "Save"}
          </Button>
          {hasExistingSkills && (
            <Button size="sm" variant="outline" onClick={() => setSeeAllOpen(true)} className="gap-2">
              <Expand className="w-3 h-3" />
              See all
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="outline" onClick={loadSkills} className="gap-2">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>

      {!hasExistingSkills && !loading && (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              No skill file found at <code className="text-xs">skills/agent-playground/SKILL.md</code>. Add skills below and click <strong>Save</strong> to create it on the server.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accordion: multiple skills */}
      <div className="space-y-3">
        {skills.map((skill, skillIndex) => (
          <SkillAccordionItem
            key={skillIndex}
            skillIndex={skillIndex}
            skill={skill}
            isExpanded={expandedIndex === skillIndex}
            onToggle={() => setExpandedIndex(expandedIndex === skillIndex ? null : skillIndex)}
            onUpdate={(patch) => updateSkill(skillIndex, patch)}
            onDelete={() => deleteSkill(skillIndex)}
            onAddExtraSection={() => addExtraSection(skillIndex)}
            onUpdateExtraSection={(sectionIndex, patch) => updateExtraSection(skillIndex, sectionIndex, patch)}
            onRemoveExtraSection={(sectionIndex) => removeExtraSection(skillIndex, sectionIndex)}
            totalSkills={skills.length}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addSkill} className="gap-2">
        <Plus className="w-3.5 h-3.5" />
        Add skill
      </Button>

      <Dialog open={seeAllOpen} onOpenChange={setSeeAllOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Skills content (full .md)</DialogTitle>
            <DialogDescription>Composed skills.md file for this agent.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg bg-muted/50 p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">{composedMd || "(empty)"}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? " Copied" : " Copy"}
            </Button>
            <Button onClick={() => setSeeAllOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SkillAccordionItemProps {
  skillIndex: number;
  skill: SkillFormFields;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<SkillFormFields>) => void;
  onDelete: () => void;
  onAddExtraSection: () => void;
  onUpdateExtraSection: (index: number, patch: { heading?: string; content?: string }) => void;
  onRemoveExtraSection: (index: number) => void;
  totalSkills: number;
}

function SkillAccordionItem({
  skillIndex,
  skill,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddExtraSection,
  onUpdateExtraSection,
  onRemoveExtraSection,
  totalSkills,
}: SkillAccordionItemProps) {
  const skillTitle = skill.title || "(untitled)";
  const skillNum = skillIndex + 1;

  return (
    <Card className={`overflow-hidden border transition-colors ${isExpanded ? "bg-card-tint-1" : ""}`}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              Skill {skillNum}: {skillTitle}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete skill"
          disabled={totalSkills === 1}
          title={totalSkills === 1 ? "Cannot delete the last skill" : "Delete skill"}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isExpanded && (
        <CardContent className="pt-6 space-y-6 border-t border-border/50">
          <div className="space-y-2">
            <Label htmlFor={`skill-title-${skillIndex}`}>Title (H1)</Label>
            <Input
              id={`skill-title-${skillIndex}`}
              value={skill.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="e.g. Cursor Agent — Playground"
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`skill-description-${skillIndex}`}>Description</Label>
            <Textarea
              id={`skill-description-${skillIndex}`}
              value={skill.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Short intro: what this skill does."
              rows={3}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`skill-when-${skillIndex}`}>When to use</Label>
            <Textarea
              id={`skill-when-${skillIndex}`}
              value={skill.whenToUse}
              onChange={(e) => onUpdate({ whenToUse: e.target.value })}
              placeholder="One item per line (shown as bullets)"
              rows={4}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Each line becomes a bullet point in the .md</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`skill-what-${skillIndex}`}>What to do</Label>
            <Textarea
              id={`skill-what-${skillIndex}`}
              value={skill.whatToDo}
              onChange={(e) => onUpdate({ whatToDo: e.target.value })}
              placeholder="One step per line (shown as numbered list)"
              rows={5}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Each line becomes a numbered step (1. 2. 3. …)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`skill-important-${skillIndex}`}>Important</Label>
            <Textarea
              id={`skill-important-${skillIndex}`}
              value={skill.important}
              onChange={(e) => onUpdate({ important: e.target.value })}
              placeholder="One item per line (shown as bullets)"
              rows={3}
              className="resize-y font-mono text-sm"
            />
          </div>

          <div>
            {skill.extraSections.length > 0 && (
              <div className="space-y-3 mb-4">
                <Label>Additional sections</Label>
                {skill.extraSections.map((sec, sectionIndex) => (
                  <div key={sectionIndex} className="rounded-lg border border-border/50 p-3 space-y-2 bg-muted/20">
                    <div className="flex gap-2 items-center">
                      <Input
                        value={sec.heading}
                        onChange={(e) => onUpdateExtraSection(sectionIndex, { heading: e.target.value })}
                        placeholder="Section heading (e.g. Notes)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveExtraSection(sectionIndex)}
                        aria-label="Remove section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={sec.content}
                      onChange={(e) => onUpdateExtraSection(sectionIndex, { content: e.target.value })}
                      placeholder="Section content (markdown allowed)"
                      rows={2}
                      className="resize-y text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" size="sm" onClick={onAddExtraSection} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add section
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
