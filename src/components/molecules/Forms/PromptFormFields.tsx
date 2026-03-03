/** Prompt Form Fields component. */
import React from 'react';
import { GenericInputWithLabel } from "@/components/molecules/Form/GenericInputWithLabel";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";

interface PromptFormFieldsProps {
  formTitle: string;
  setFormTitle: (title: string) => void;
  formContent: string;
  setFormContent: (content: string) => void;
}

export const PromptFormFields: React.FC<PromptFormFieldsProps> = ({
  formTitle,
  setFormTitle,
  formContent,
  setFormContent,
}) => {
  return (
    <div className="grid gap-4 py-2">
      <GenericInputWithLabel
        id="prompt-title"
        label="Title"
        value={formTitle}
        onChange={(e) => setFormTitle(e.target.value)}
        placeholder="e.g. Run 3000"
      />
      <GenericTextareaWithLabel
        id="prompt-content"
        label="Content"
        value={formContent}
        onChange={(e) => setFormContent(e.target.value)}
        placeholder="Instructions for the AI..."
        rows={12}
        className="min-h-[200px]"
      />
    </div>
  );
};
