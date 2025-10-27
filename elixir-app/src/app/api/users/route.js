// src/app/api/users/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/users?role=Purchasing%20Department&q=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const q = searchParams.get("q");

  const conn = await createConnection();
  try {
    const wh = [];
    const args = [];

    if (role) {
      wh.push("Role = ?");
      args.push(role);
    }
    if (q) {
      wh.push("(Username LIKE ? OR Fullname LIKE ?)");
      args.push(`%${q}%`, `%${q}%`);
    }

    const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
    const [rows] = await conn.execute(
      `
      SELECT Username, Fullname
      FROM user
      ${where}
      ORDER BY Fullname ASC
      `,
      args
    );

    await conn.end();
    return NextResponse.json(rows || []);
  } catch (e) {
    console.error("GET /api/users error", e);
    try {
      await conn.end();
    } catch {}
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
