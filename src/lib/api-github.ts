/**
 * GitHub REST API client.
 * All calls include Authorization header. Token is never logged.
 */

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string | null;
  stargazers_count: number;
  private: boolean;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubTreeItem {
  name: string;
  type: "file" | "dir";
  path: string;
  url: string;
  size?: number;
}

export interface GitHubReadmeResponse {
  name: string;
  content: string; // base64 encoded
  encoding: string;
}

const GITHUB_API_BASE = "https://api.github.com";

async function githubFetch<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `GitHub API error: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch authenticated user info.
 */
export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return githubFetch<GitHubUser>(`${GITHUB_API_BASE}/user`, token);
}

/**
 * Fetch all repos for authenticated user (paginated, up to 300).
 * Fetches 3 pages of 100 repos each, sorted by update time.
 */
export async function listAllRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];

  for (let page = 1; page <= 3; page++) {
    const pageRepos = await githubFetch<GitHubRepo[]>(
      `${GITHUB_API_BASE}/user/repos?per_page=100&page=${page}&sort=updated&type=all`,
      token
    );

    repos.push(...pageRepos);

    // If we get fewer than 100, we've reached the end
    if (pageRepos.length < 100) break;
  }

  return repos;
}

/**
 * Fetch repo README content (base64 decoded).
 * Returns empty string if not found.
 */
export async function getRepoReadme(
  token: string,
  owner: string,
  repo: string
): Promise<string> {
  try {
    const response = await githubFetch<GitHubReadmeResponse>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      token
    );

    if (response.encoding === "base64") {
      // Use browser-compatible base64 decoding
      const binaryString = atob(response.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }

    return response.content;
  } catch {
    // 404 or other error — no README
    return "";
  }
}

/**
 * Fetch top-level file tree for a repo.
 * Returns simplified list of files/dirs.
 */
export async function getRepoTree(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubTreeItem[]> {
  try {
    const contents = await githubFetch<
      Array<{
        name: string;
        type: string;
        size?: number;
        path: string;
        url: string;
      }>
    >(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/`, token);

    return contents.map((item) => ({
      name: item.name,
      type: item.type === "dir" ? "dir" : "file",
      path: item.path,
      url: item.url,
      size: item.size,
    }));
  } catch {
    return [];
  }
}

export interface GitHubFileContent {
  sha: string;
}

/**
 * Get file metadata (and sha) for a path. Returns null if file does not exist (404).
 * Used to get sha before updating a file via Contents API.
 */
export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<GitHubFileContent | null> {
  const url = new URL(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
  );
  if (branch) url.searchParams.set("ref", branch);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message ||
        `GitHub API error: ${response.status}`
    );
  }

  const data = (await response.json()) as { sha: string };
  return { sha: data.sha };
}

/**
 * Create or update a file in a repo via Contents API.
 * If the file exists (getFileContent returns sha), sends PUT with sha to update; otherwise creates.
 */
export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string
): Promise<void> {
  const existing = await getFileContent(token, owner, repo, path, branch);

  const body: {
    message: string;
    content: string;
    branch?: string;
    sha?: string;
  } = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (branch) body.branch = branch;
  if (existing) body.sha = existing.sha;

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message ||
        `GitHub API error: ${response.status}`
    );
  }
}
