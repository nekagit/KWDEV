/**
 * GitHub token storage helpers.
 * Stores PAT in localStorage under key "kwcode-github-pat".
 * Token is never logged or exposed in console.
 */

const GITHUB_TOKEN_KEY = "kwcode-github-pat";

export function getGithubToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GITHUB_TOKEN_KEY);
}

export function setGithubToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GITHUB_TOKEN_KEY, token);
}

export function clearGithubToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GITHUB_TOKEN_KEY);
}

export function hasGithubToken(): boolean {
  return getGithubToken() !== null;
}
