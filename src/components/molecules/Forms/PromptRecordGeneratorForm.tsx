/** Prompt Record Generator Form component. */
import React from 'react';
import { Button } from "@/components/ui/button";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";

interface PromptGeneratorFormProps {
  generateDescription: string;
  setGenerateDescription: (description: string) => void;
  handleGenerate: () => Promise<void>;
  generateLoading: boolean;
}

export const PromptGeneratorForm: React.FC<PromptGeneratorFormProps> = ({
  generateDescription,
  setGenerateDescription,
  handleGenerate,
  generateLoading,
}) => {
  return (
    <>
      <GenericTextareaWithLabel
        id="generate-desc"
        label="Description"
        value={generateDescription}
        onChange={(e) => setGenerateDescription(e.target.value)}
        placeholder="e.g. A prompt that refactors React components to use TypeScript and strict typing"
        rows={4}
      />
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={!generateDescription.trim() || generateLoading}
        >
          {generateLoading ? "Generating..." : "Generate"}
        </Button>
      </div>
    </>
  );
};
