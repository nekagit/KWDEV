/**
 * Default SSH host for auto-connect (Dashboard, AI Bots) and quick-connect UI.
 * Set in .env as NEXT_PUBLIC_DEFAULT_SSH_HOST (must match a Host in ~/.ssh/config).
 * No hardcoded fallback — if unset, auto-connect and quick-connect are disabled.
 */
export function getDefaultSshHost(): string | null {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_DEFAULT_SSH_HOST?.trim() || null;
  }
  return (process.env.NEXT_PUBLIC_DEFAULT_SSH_HOST ?? "").trim() || null;
}
