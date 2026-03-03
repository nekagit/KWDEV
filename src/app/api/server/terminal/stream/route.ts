import { NextRequest } from "next/server";
import { getInteractiveShell, getSSHSession } from "@/lib/server-ssh";

/** Stream depends on request (sessionId) and live SSH shell; must be dynamic. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!sessionId || sessionId.trim() === "") {
        return new Response("sessionId required", { status: 400 });
    }

    try {
        const session = getSSHSession(sessionId);
        const stream = await getInteractiveShell(sessionId);

        let isClosed = false;
        const readable = new ReadableStream({
            start(controller) {
                // Flush buffered output first so reconnecting clients see output from while they were away
                if (session.outputBuffer && session.outputBuffer.length > 0) {
                    const joined = session.outputBuffer.join("");
                    session.outputBuffer = [];
                    session.outputBufferBytes = 0;
                    controller.enqueue(`data: ${JSON.stringify(joined)}\n\n`);
                }

                stream.on("data", (data: Buffer) => {
                    if (!isClosed) {
                        controller.enqueue(`data: ${JSON.stringify(data.toString("utf-8"))}\n\n`);
                    }
                });

                stream.on("close", () => {
                    if (!isClosed) {
                        try { controller.close(); } catch { }
                        isClosed = true;
                    }
                });

                // heartbeat to keep SSE open
                const interval = setInterval(() => {
                    if (!isClosed) {
                        controller.enqueue(`: heartbeat\n\n`);
                    } else {
                        clearInterval(interval);
                    }
                }, 15000);
            },
            cancel() {
                isClosed = true;
            }
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive"
            }
        });
    } catch (err: any) {
        return new Response(err.message || "Internal error", { status: 500 });
    }
}
