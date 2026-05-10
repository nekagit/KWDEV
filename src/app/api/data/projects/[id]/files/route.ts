/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { repoAllowed } from "@/lib/repo-allowed";
import { getProjectById } from "@/lib/data/projects";
import { formatUnixPermissionString } from "@/lib/project-files-display";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const project = getProjectById(id);
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        const repoPath = project.repoPath?.trim();
        if (!repoPath) {
            return NextResponse.json(
                { error: "Project has no repo path; cannot list files" },
                { status: 400 }
            );
        }
        const { searchParams } = new URL(request.url);
        const relativePath = searchParams.get("path") || "";

        // Validate path
        const normalized = path.normalize(relativePath.trim());
        if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }

        const cwd = process.cwd();
        const resolvedRepo = path.resolve(repoPath);

        if (!repoAllowed(resolvedRepo, cwd)) {
            return NextResponse.json(
                { error: "Project repo is outside app directory; file access not allowed" },
                { status: 403 }
            );
        }

        const resolved = path.resolve(resolvedRepo, normalized);
        if (!resolved.startsWith(resolvedRepo)) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }

        if (!fs.existsSync(resolved)) {
            return NextResponse.json({ error: "Path not found" }, { status: 404 });
        }

        const stats = fs.statSync(resolved);
        if (!stats.isDirectory()) {
            return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
        }

        const entries = fs.readdirSync(resolved, { withFileTypes: true });

        const files = entries.map((entry) => {
            const entryPath = path.join(resolved, entry.name);
            const st = fs.statSync(entryPath);
            const isSymlink = entry.isSymbolicLink();
            const isDirectory = st.isDirectory();
            const permissions =
                process.platform === "win32"
                    ? "—"
                    : formatUnixPermissionString(st.mode, {
                          isDirectory,
                          isSymbolicLink: isSymlink,
                      });
            return {
                name: entry.name,
                isDirectory,
                isSymbolicLink: isSymlink,
                size: isDirectory ? 0 : st.size,
                updatedAt: st.mtime.toISOString(),
                createdAt: st.birthtime.toISOString(),
                permissions,
            };
        });

        return NextResponse.json({ files });
    } catch (e) {
        console.error("Project file list error:", e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Failed to list files" },
            { status: 500 }
        );
    }
}
