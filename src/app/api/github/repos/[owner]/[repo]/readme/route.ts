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
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (res.status === 404) {
    return NextResponse.json({ content: "" });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { message?: string }).message || `GitHub API: ${res.status}` },
      { status: res.status }
    );
  }
  const data = (await res.json()) as { content?: string; encoding?: string };
  let content = "";
  if (data.encoding === "base64" && data.content) {
    content = Buffer.from(data.content, "base64").toString("utf-8");
  } else if (data.content) {
    content = data.content;
  }
  return NextResponse.json({ content });
}
