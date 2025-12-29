"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error info:", errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset?: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({
  error,
  onReset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 rounded-lg border border-destructive/50 bg-destructive/5">
      <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-destructive mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
        {description}
      </p>
      {error && process.env.NODE_ENV === "development" && (
        <details className="mb-4 w-full max-w-md">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 p-2 text-xs bg-muted rounded overflow-auto max-h-32">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

// Inline error display for smaller components
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-destructive hover:text-destructive"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
}
