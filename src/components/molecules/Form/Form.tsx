/** Form component. */
import React from 'react';
import sharedClasses from '../../shared/shared-classes';

interface FormProps {
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent) => void;
  className?: string;
}

export const Form: React.FC<FormProps> = ({ children, onSubmit, className }) => {
  return (
    <form data-shared-ui onSubmit={onSubmit} className={`${sharedClasses.Form.root} ${className || ''}`}>
      {children}
    </form>
  );
};
