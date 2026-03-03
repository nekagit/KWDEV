/** Create Prompt Button component. */
import React from 'react';
import { Plus } from "lucide-react";
import { ButtonComponent } from "@/components/molecules/Buttons/ButtonComponent";

interface CreatePromptRecordButtonProps {
  onClick: () => void;
}

export const CreatePromptRecordButton: React.FC<CreatePromptRecordButtonProps> = ({
  onClick,
}) => {
  return (
    <ButtonComponent
      onClick={onClick}
      icon={Plus}
      text="Create prompt"
      variant="outline"
      size="sm"
    />
  );
};
