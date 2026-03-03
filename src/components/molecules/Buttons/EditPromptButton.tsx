/** Edit Prompt Button component. */
import React from 'react';
import { Pencil } from "lucide-react";
import { ButtonComponent } from "@/components/molecules/Buttons/ButtonComponent";

interface EditPromptButtonProps {
  onClick: () => void;
  disabled: boolean;
  title: string;
}

export const EditPromptButton: React.FC<EditPromptButtonProps> = ({
  onClick,
  disabled,
  title,
}) => {
  return (
    <ButtonComponent
      onClick={onClick}
      icon={Pencil}
      text="Edit prompt"
      variant="outline"
      size="sm"
      disabled={disabled}
      title={title}
    />
  );
};
