/** Grid Container component. */
import React from 'react';
import sharedClasses from '../../shared/shared-classes';

interface GridContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GridContainer: React.FC<GridContainerProps> = ({
  children,
  className = sharedClasses.GridContainer.root,
}) => {
  return <div data-shared-ui className={className}>{children}</div>;
};
