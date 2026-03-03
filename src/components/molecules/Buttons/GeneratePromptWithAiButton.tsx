/** Generate Prompt With Ai Button component. */
import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface GeneratePromptWithAiButtonProps {
  onClick: () => void;
}

export const GeneratePromptWithAiButton: React.FC<GeneratePromptWithAiButtonProps> = ({
  onClick,
}) => {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Sparkles className="h-4 w-4" />
      Generate with AI
    </Button>
  );
};
