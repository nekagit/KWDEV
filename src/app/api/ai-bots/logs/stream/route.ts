import { NextResponse } from "next/server";
import { getSSHSession } from "@/lib/server-ssh";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/logs/stream?sessionId=...&logPath=...
 * Server-Sent Events stream of log file tail -f output.
 * Note: This is a simplified implementation. A full implementation would
 * need to handle SSH PTY properly.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const logPath = searchParams.get("logPath");

    if (!sessionId || !logPath) {
      return new NextResponse("sessionId and logPath are required", { status: 400 });
    }

    // Verify session exists
    const session = getSSHSession(sessionId);
    if (!session) {
      return new NextResponse("Invalid session", { status: 400 });
    }

    // Return SSE response
    const encoder = new TextEncoder();
    let cancelled = false;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Simulate streaming by sending initial batch, then periodically polling
          // A production implementation would maintain an SSH shell and stream output
          const stream = setInterval(async () => {
            if (cancelled) {
              clearInterval(stream);
              controller.close();
              return;
            }

            try {
              // This is a placeholder — real implementation would tail -f
              // For now, we'll just send a heartbeat
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
            } catch (err) {
              clearInterval(stream);
              controller.error(err);
            }
          }, 5000);

          // Send initial SSE comment
          controller.enqueue(encoder.encode(": stream started\n\n"));
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        cancelled = true;
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}
