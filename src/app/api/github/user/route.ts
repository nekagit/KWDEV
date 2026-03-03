import { NextResponse } from "next/server";

const GITHUB_API_BASE = "https://api.github.com";

export async function GET() {
  const token = process.env.GITHUB_PAT?.trim();
  if (!token) {
    return NextResponse.json({ error: "GITHUB_PAT not set" }, { status: 401 });
  }
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { message?: string }).message || `GitHub API: ${res.status}` },
      { status: res.status }
    );
  }
  const user = await res.json();
  return NextResponse.json(user);
}
