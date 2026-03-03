/** Project Input component. */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";

interface ProjectInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onBrowse?: () => void;
}

export const ProjectInput: React.FC<ProjectInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  className,
  onBrowse,
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <div className="flex space-x-2">
        <Input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={className}
        />
        {onBrowse && (
          <Button type="button" onClick={onBrowse} variant="outline">
            Browse
          </Button>
        )}
      </div>
    </div>
  );
};

