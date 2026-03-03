/** POST /api/app-analyzer/fetch — proxy fetch for App Analyzer (browser mode). */
import { NextRequest, NextResponse } from "next/server";
import type { FetchUrlResult } from "@/types/app-analyzer";

const BODY_LIMIT = 500 * 1024; // 500 KB
const TIMEOUT_MS = 15_000;
const MAX_URL_LENGTH = 2048;
const ALLOWED_SCHEMES = ["http:", "https:"];

function isValidUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr.trim());
    return ALLOWED_SCHEMES.includes(u.protocol) && u.host.length > 0;
  } catch {
    return false;
  }
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }
  if (url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL too long" }, { status: 400 });
  }
  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "URL must be http or https" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "KWCode-AppAnalyzer/1.0",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    const arr = await res.arrayBuffer();
    const bytes = new Uint8Array(arr);
    const toUse = bytes.byteLength > BODY_LIMIT ? bytes.slice(0, BODY_LIMIT) : bytes;
    const bodyStr = new TextDecoder("utf-8", { fatal: false }).decode(toUse);

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const result: FetchUrlResult = {
      statusCode: res.status,
      headers,
      body: bodyStr,
    };
    return NextResponse.json(result);
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: message || "Fetch failed" }, { status: 502 });
  }
}
