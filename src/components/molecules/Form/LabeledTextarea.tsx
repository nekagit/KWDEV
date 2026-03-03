/** Labeled Textarea component. */
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/molecules/Form/FormField";
import { cn } from "@/lib/utils";
import sharedClasses from '../../shared/shared-classes';

interface LabeledTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  description?: string;
  errorMessage?: string;
}

export const LabeledTextarea: React.FC<LabeledTextareaProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  className,
  description,
  errorMessage,
}) => {
  return (
    <FormField
      label={label}
      htmlFor={id}
      description={description}
      errorMessage={errorMessage}
    >
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={cn(sharedClasses.LabeledTextarea.textarea, className)}
      />
    </FormField>
  );
};
