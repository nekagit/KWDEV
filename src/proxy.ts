import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware). Pass-through: let all requests continue to the app.
 * Add redirects, rewrites, or auth checks here if needed.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
