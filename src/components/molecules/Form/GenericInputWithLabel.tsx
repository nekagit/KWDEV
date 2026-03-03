/** Generic Input With Label component. */
import React from 'react';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/molecules/Form/FormField';

interface GenericInputWithLabelProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

export const GenericInputWithLabel: React.FC<GenericInputWithLabelProps> = ({
  id,
  label,
  ...props
}) => {
  return (
    <FormField htmlFor={id} label={label}>
      <Input id={id} {...props} />
    </FormField>
  );
};
