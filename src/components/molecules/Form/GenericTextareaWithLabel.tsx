/** Generic Textarea With Label component. */
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/molecules/Form/FormField';

interface GenericTextareaWithLabelProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
}

export const GenericTextareaWithLabel: React.FC<GenericTextareaWithLabelProps> = ({
  id,
  label,
  ...props
}) => {
  return (
    <FormField htmlFor={id} label={label}>
      <Textarea id={id} {...props} />
    </FormField>
  );
};
