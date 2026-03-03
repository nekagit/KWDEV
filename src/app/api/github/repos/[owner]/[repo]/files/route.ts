import { NextRequest, NextResponse } from "next/server";

const GITHUB_API_BASE = "https://api.github.com";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const token = process.env.GITHUB_PAT?.trim();
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT not set" }, { status: 401 });
  }
  const { owner, repo } = await params;
  const body = await request.json();
  const { path: filePath, content, message, branch } = body as {
    path?: string;
    content?: string;
    message?: string;
    branch?: string;
  };
  if (!filePath || content === undefined || !message) {
    return NextResponse.json(
      { error: "path, content, and message are required" },
      { status: 400 }
    );
  }
  const branchRef = (branch || "main").trim() || "main";

  // Get existing file sha if present
  const contentUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(filePath)}${branchRef ? `?ref=${encodeURIComponent(branchRef)}` : ""}`;
  const getRes = await fetch(contentUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  let sha: string | undefined;
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string };
    sha = data.sha;
  }

  const putBody: { message: string; content: string; branch?: string; sha?: string } = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
  };
  if (branchRef) putBody.branch = branchRef;
  if (sha) putBody.sha = sha;

  const putRes = await fetch(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(filePath)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    }
  );
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { message?: string }).message || `GitHub API: ${putRes.status}` },
      { status: putRes.status }
    );
  }
  return NextResponse.json({ ok: true });
}
