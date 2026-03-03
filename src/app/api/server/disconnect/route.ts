import { NextResponse } from "next/server";
import { disconnectSSH } from "@/lib/server-ssh";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

export async function POST(request: Request) {
    try {
        const { sessionId } = await request.json();
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
        }

        disconnectSSH(sessionId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to disconnect" }, { status: 500 });
    }
}
