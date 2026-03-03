import { NextResponse } from "next/server";
import { getDb, ServerProfileRow } from "@/lib/db";
import crypto from "crypto";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

export async function GET() {
    try {
        const db = getDb();
        const rows = db.prepare("SELECT * FROM server_profiles ORDER BY created_at DESC").all() as ServerProfileRow[];
        return NextResponse.json({ profiles: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { id, name, host, port, username, auth_type, auth_data } = await request.json();
        const db = getDb();
        const now = new Date().toISOString();

        if (id) {
            // Update
            const stmt = db.prepare(`
        UPDATE server_profiles 
        SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, auth_data = ?, updated_at = ?
        WHERE id = ?
      `);
            stmt.run(name, host, port, username, auth_type, auth_data, now, id);
            return NextResponse.json({ success: true, id });
        } else {
            // Create
            const newId = crypto.randomUUID();
            const stmt = db.prepare(`
        INSERT INTO server_profiles (id, name, host, port, username, auth_type, auth_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(newId, name, host, port, username, auth_type, auth_data, now, now);
            return NextResponse.json({ success: true, id: newId });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const db = getDb();
        db.prepare("DELETE FROM server_profiles WHERE id = ?").run(id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
