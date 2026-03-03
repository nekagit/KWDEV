/**
 * GitHub API calls via server proxy when GITHUB_PAT is set in .env.
 * Token never sent to client.
 */

import type { GitHubUser, GitHubRepo, GitHubTreeItem } from "@/lib/api-github";

export async function getAuthenticatedUserFromEnv(): Promise<GitHubUser> {
  const res = await fetch("/api/github/user");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to get user");
  }
  return res.json();
}

export async function listAllReposFromEnv(): Promise<GitHubRepo[]> {
  const res = await fetch("/api/github/repos");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to list repos");
  }
  return res.json();
}

export async function getRepoReadmeFromEnv(owner: string, repo: string): Promise<string> {
  const res = await fetch(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to get readme");
  }
  const data = (await res.json()) as { content?: string };
  return data.content ?? "";
}

export async function getRepoTreeFromEnv(owner: string, repo: string): Promise<GitHubTreeItem[]> {
  const res = await fetch(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to get tree");
  }
  return res.json();
}

export async function createOrUpdateFileFromEnv(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string
): Promise<void> {
  const res = await fetch(
    `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/files`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content, message, branch: branch || "main" }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to create/update file");
  }
}
