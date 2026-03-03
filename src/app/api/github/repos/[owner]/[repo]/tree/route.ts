import { NextRequest, NextResponse } from "next/server";

const GITHUB_API_BASE = "https://api.github.com";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const token = process.env.GITHUB_PAT?.trim();
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT not set" }, { status: 401 });
  }
  const { owner, repo } = await params;
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`,
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
  const contents = (await res.json()) as Array<{ name: string; type: string; path: string; url: string; size?: number }>;
  const tree = contents.map((item) => ({
    name: item.name,
    type: item.type === "dir" ? "dir" as const : "file" as const,
    path: item.path,
    url: item.url,
    size: item.size,
  }));
  return NextResponse.json(tree);
}
