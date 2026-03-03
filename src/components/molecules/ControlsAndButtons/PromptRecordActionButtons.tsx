"use client";

/** Prompt Record Action Buttons component. */
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { CreatePromptRecordButton } from "@/components/molecules/Buttons/CreatePromptButton";
import { EditPromptButton } from "@/components/molecules/Buttons/EditPromptButton";
import { GeneratePromptWithAiButton } from "@/components/molecules/Buttons/GeneratePromptWithAiButton";

interface PromptRecordActionButtonsProps {
  openCreate: () => void;
  openEdit: () => void;
  setGenerateOpen: (open: boolean) => void;
  canEdit: boolean;
}

export function PromptRecordActionButtons({
  openCreate,
  openEdit,
  setGenerateOpen,
  canEdit,
}: PromptRecordActionButtonsProps) {
  return (
    <ButtonGroup alignment="left">
      <CreatePromptRecordButton onClick={openCreate} />
      <EditPromptButton
        onClick={openEdit}
        disabled={!canEdit}
        title={canEdit ? "Edit selected prompt" : "Select exactly one prompt to edit"}
      />
      <GeneratePromptWithAiButton onClick={() => setGenerateOpen(true)} />
    </ButtonGroup>
  );
}
