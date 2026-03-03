import { NextResponse } from "next/server";

/**
 * Returns whether GITHUB_PAT is set in .env (server-side only).
 * Frontend uses this to decide whether to use env token or localStorage PAT.
 */
export async function GET() {
  const hasEnvToken = Boolean(process.env.GITHUB_PAT?.trim());
  return NextResponse.json({ hasEnvToken });
}
