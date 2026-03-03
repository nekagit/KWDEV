/** Empty State component. */
import React from 'react';
import sharedClasses from '../../shared/shared-classes';

interface StateProps {
  message?: string;
  title?: string;
  description?: string;
  icon?: React.ElementType | React.ReactNode;
  action?: React.ReactNode; // e.g., a button to create new item
}

/** Treat as component (render <Icon />): function or forwardRef-like object. Treat as node: React elements (<Lightbulb />), strings, etc. */
function isIconComponent(value: unknown): value is React.ElementType {
  if (typeof value === "function") return true;
  // forwardRef / memo components are objects with a render function
  return (
    typeof value === "object" &&
    value !== null &&
    "render" in value &&
    typeof (value as { render: unknown }).render === "function"
  );
}

export const EmptyState: React.FC<StateProps> = ({ message, title, description, icon, action }) => {
  const displayMessage = message ?? title ?? "";
  const Icon = icon != null && isIconComponent(icon) ? (icon as React.ElementType) : null;
  const iconAsNode = icon != null && !isIconComponent(icon) ? (icon as React.ReactNode) : null;
  return (
    <div data-shared-ui className={sharedClasses.EmptyState.root}>
      {Icon != null && <Icon className={sharedClasses.EmptyState.icon} />}
      {iconAsNode != null && <div className={sharedClasses.EmptyState.iconWrapper}>{iconAsNode}</div>}
      {title && <p className={sharedClasses.EmptyState.title}>{title}</p>}
      {(description || displayMessage) && <p className={sharedClasses.EmptyState.description}>{description ?? displayMessage}</p>}
      {action && <div className={sharedClasses.EmptyState.action}>{action}</div>}
    </div>
  );
};

export const LoadingState: React.FC = () => {
  return (
    <div data-shared-ui className={sharedClasses.LoadingState.root}>
      <svg className={sharedClasses.LoadingState.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className={sharedClasses.LoadingState.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className={sharedClasses.LoadingState.spinnerPath} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className={sharedClasses.LoadingState.text}>Loading...</p>
    </div>
  );
};
