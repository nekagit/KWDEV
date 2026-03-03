/** Card component. */
import React from 'react';
import { cn } from '@/lib/utils';
import sharedClasses from '../../shared/shared-classes';

export type CardTint = 1 | 2 | 3 | 4 | 5;

interface CardProps {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  children: React.ReactNode; // Main content
  footerButtons?: React.ReactNode; // Right-aligned button group
  /** Slight background tint (1–5) to differentiate adjacent cards. */
  tint?: CardTint;
  [key: string]: any; // Allow arbitrary props
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, footerButtons, tint, className, ...rest }) => {
  return (
    <div
      data-shared-ui
      className={cn(sharedClasses.Card.root, tint != null && `bg-card-tint-${tint}`, className)}
      {...rest}
    >
      {(title || subtitle) && (
        <div className={sharedClasses.Card.header}>
          {typeof title === 'string' ? <h3 className={sharedClasses.Card.title}>{title}</h3> : title}
          {typeof subtitle === 'string' ? <p className={sharedClasses.Card.subtitle}>{subtitle}</p> : subtitle}
        </div>
      )}
      <div className={sharedClasses.Card.body}>
        {children}
      </div>
      {footerButtons && (
        <div className={sharedClasses.Card.footer}>
          <div className={sharedClasses.Card.footerInner}>
            {footerButtons}
          </div>
        </div>
      )}
    </div>
  );
};
