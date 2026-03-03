"use client";

/** Error Boundary component. */
import React, { Component, type ReactNode } from "react";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI when an error is caught. If not provided, a default fallback is used. */
  fallback?: ReactNode;
  /** Optional title for the default fallback (e.g. "This section failed"). */
  fallbackTitle?: string;
  /** Called when user clicks "Try again" in the default fallback; resets the boundary so children re-render. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React error boundary: catches JavaScript errors in the child tree and renders fallback UI
 * so one thrown error does not blank the whole app. Uses a class component because React
 * error boundaries must be implemented with getDerivedStateFromError/componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback, fallbackTitle } = this.props;

    if (error) {
      if (fallback) return fallback;
      return (
        <div
          className="min-h-[120px] flex flex-col items-center justify-center p-6 rounded-lg border border-border bg-card text-card-foreground"
          role="alert"
          aria-live="assertive"
        >
          <ErrorDisplay
            title={fallbackTitle ?? "Something went wrong"}
            message={error.message}
            details={process.env.NODE_ENV === "development" ? error.stack : undefined}
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return children;
  }
}
