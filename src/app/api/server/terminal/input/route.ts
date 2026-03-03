import { NextResponse } from "next/server";
import { getInteractiveShell } from "@/lib/server-ssh";

/** Terminal input depends on request body (sessionId) and live shell; must be dynamic. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { sessionId, input, resize } = await request.json();
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const shell = await getInteractiveShell(sessionId);

        if (input !== undefined) {
            shell.write(input);
        }

        if (resize && typeof resize.rows === "number" && typeof resize.cols === "number") {
            shell.setWindow(resize.rows, resize.cols, 0, 0);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Terminal input failed" }, { status: 500 });
    }
}
