/** Form Field component. */
import React from 'react';
import { Label } from '@/components/ui/label';
import sharedClasses from '../../shared/shared-classes';

interface FormFieldProps {
  htmlFor: string;
  label: string;
  description?: string;
  errorMessage?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ htmlFor, label, description, errorMessage, children }) => {
  return (
    <div data-shared-ui className={sharedClasses.FormField.root}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {description && <p className={sharedClasses.FormField.description}>{description}</p>}
      {children}
      {errorMessage && <p className={sharedClasses.FormField.error}>{errorMessage}</p>}
    </div>
  );
};
