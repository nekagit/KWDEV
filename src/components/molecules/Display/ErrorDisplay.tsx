/** Error Display component. */
import React from 'react';
import sharedClasses from '../../shared/shared-classes';

interface ErrorDisplayProps {
  message: string;
  title?: string;
  details?: string;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, title, details, icon, onRetry }) => {
  return (
    <div data-shared-ui className={sharedClasses.ErrorDisplay.root} role="alert">
      {(title || icon) && (
        <div className={sharedClasses.ErrorDisplay.header}>
          {icon}
          {title && <strong className={sharedClasses.ErrorDisplay.title}>{title}</strong>}
        </div>
      )}
      {!title && <strong className={sharedClasses.ErrorDisplay.title}>Error:</strong>}
      <span className={sharedClasses.ErrorDisplay.message}>{message}</span>
      {details && <pre className={sharedClasses.ErrorDisplay.details}>{details}</pre>}
      {onRetry && (
        <button
          onClick={onRetry}
          className={sharedClasses.ErrorDisplay.retryButton}
        >
          Retry
        </button>
      )}
    </div>
  );
};
