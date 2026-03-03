import { NextResponse } from "next/server";

const GITHUB_API_BASE = "https://api.github.com";

export async function GET() {
  const token = process.env.GITHUB_PAT?.trim();
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT not set" }, { status: 401 });
  }
  const allRepos: unknown[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `${GITHUB_API_BASE}/user/repos?per_page=100&page=${page}&sort=updated&type=all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { message?: string }).message || `GitHub API: ${res.status}` },
        { status: res.status }
      );
    }
    const pageRepos = (await res.json()) as unknown[];
    allRepos.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }
  return NextResponse.json(allRepos);
}
