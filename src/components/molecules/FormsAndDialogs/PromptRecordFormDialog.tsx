"use client";

/** Prompt Record Form Dialog component. */
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { PromptFormFields } from "@/components/molecules/Forms/PromptFormFields";
import { Loader2 } from "lucide-react";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("FormsAndDialogs/PromptRecordFormDialog.tsx");

interface PromptRecordFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description: string;
  formTitle: string;
  setFormTitle: (title: string) => void;
  formContent: string;
  setFormContent: (content: string) => void;
  handleSave: () => Promise<void>;
  saveLoading: boolean;
}

export function PromptRecordFormDialog({
  open,
  setOpen,
  title,
  description,
  formTitle,
  setFormTitle,
  formContent,
  setFormContent,
  handleSave,
  saveLoading,
}: PromptRecordFormDialogProps) {
  return (
    <Dialog
      title={title}
      onClose={() => setOpen(false)}
      isOpen={open}
      actions={
        <ButtonGroup alignment="right">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formTitle.trim() || saveLoading}>
            {saveLoading ? <Loader2 className={classes[0]} /> : null}
            Save
          </Button>
        </ButtonGroup>
      }
    >
      <PromptFormFields
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formContent={formContent}
        setFormContent={setFormContent}
      />
    </Dialog>
  );
}
