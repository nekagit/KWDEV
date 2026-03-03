/** Button Group component. */
import React from 'react';
import sharedClasses from '../../shared/shared-classes';

interface ButtonGroupProps {
  children: React.ReactNode;
  alignment?: 'left' | 'center' | 'right'; // Default to 'right' for footer buttons
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, alignment = 'right', className }) => {
  const justifyClass = sharedClasses.ButtonGroup.alignment[alignment];

  return (
    <div data-shared-ui className={`${sharedClasses.ButtonGroup.root} ${justifyClass} ${className || ''}`}>
      {children}
    </div>
  );
};
