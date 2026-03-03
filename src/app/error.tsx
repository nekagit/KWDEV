"use client";

/** error component. */
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  const displayMessage =
    error.message?.trim() === "Internal Server Error"
      ? "Server error loading data"
      : error.message;
  const isInternalServerError =
    error.message === "Internal Server Error" ||
    error.message === "Server error loading data" ||
    error.digest?.startsWith("NEXT_");

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center"
      style={{
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
      }}
    >
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-4 max-w-md font-mono text-sm">
        {displayMessage}
      </p>
      {isInternalServerError && (
        <p className="text-muted-foreground mb-4 max-w-md text-sm">
          Check the terminal where <code className="bg-muted px-1 rounded">npm run dev</code> is running for the actual error. If the app uses the local DB, ensure the <code className="bg-muted px-1 rounded">data</code> directory exists and <code className="bg-muted px-1 rounded">data/app.db</code> can be created or opened.
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
