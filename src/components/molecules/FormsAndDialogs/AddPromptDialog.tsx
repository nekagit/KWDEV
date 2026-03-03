"use client";

/** Add Prompt Dialog component. */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { Form } from "@/components/molecules/Form/Form";
import { GenericInputWithLabel } from "@/components/molecules/Form/GenericInputWithLabel";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isTauri, invoke } from "@/lib/tauri";
import { useRunStore } from "@/store/run-store";

interface AddPromptDialogProps {
    open: "self" | "ai" | null;
    onOpenChange: (v: "self" | "ai" | null) => void;
}

/**
 * Dialog for adding a new prompt (self-written or AI-generated).
 * Shared between ProjectTicketsTab and ProjectRunTab.
 */
export function AddPromptDialog({ open, onOpenChange }: AddPromptDialogProps) {
    const addPrompt = useRunStore((s) => s.addPrompt);
    const refreshData = useRunStore((s) => s.refreshData);
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const isSelf = open === "self";
    const isAI = open === "ai";

    const handleSave = useCallback(async () => {
        const t = title.trim();
        const c = value.trim();
        if (!t || !c) return;
        setSaving(true);
        try {
            if (isTauri) {
                await invoke("add_prompt", { title: t, content: c });
                await refreshData();
                toast.success("Prompt saved. It will appear in the dropdown.");
            } else {
                addPrompt(t, c);
                toast.success("Prompt saved. It will appear in the dropdown.");
                try {
                    const res = await fetch("/api/data/prompts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: t, content: c }),
                    });
                    if (res.ok) await refreshData();
                } catch {
                    // Store already updated
                }
            }
            setTitle("");
            setValue("");
            onOpenChange(null);
        } finally {
            setSaving(false);
        }
    }, [title, value, addPrompt, refreshData, onOpenChange]);

    const handleGenerate = useCallback(async () => {
        setGenerating(true);
        try {
            setValue("Generated prompt placeholder. Wire to your AI API.");
            toast.info("Generate prompt: connect to your AI API.");
        } finally {
            setGenerating(false);
        }
    }, []);

    const dialogTitle = isAI ? "AI generation prompt" : "Self-written prompt";
    return (
        <SharedDialog
            isOpen={open != null}
            title={dialogTitle}
            onClose={() => onOpenChange(null)}
            actions={
                <ButtonGroup alignment="right">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(null)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!title.trim() || !value.trim() || saving}
                    >
                        {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Save
                    </Button>
                </ButtonGroup>
            }
        >
            <Form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (title.trim() && value.trim()) handleSave();
                }}
            >
                <GenericInputWithLabel
                    id="add-prompt-title"
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Prompt title (shown in dropdown)"
                />
                <GenericTextareaWithLabel
                    id="add-prompt-body"
                    label="Prompt"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={
                        isSelf ? "Enter your prompt…" : "Generate or paste prompt…"
                    }
                    rows={5}
                    className="min-h-[120px] font-mono text-sm"
                />
                {isAI && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={generating}
                    >
                        {generating ? (
                            <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        Generate
                    </Button>
                )}
            </Form>
        </SharedDialog>
    );
}
