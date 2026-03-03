"use client";

import { useEffect } from "react";

/**
 * Catches errors in the root layout. Replaces the entire root layout when triggered.
 * Must define its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", padding: "2rem", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.875rem" }}>
            {error.message}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              background: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
