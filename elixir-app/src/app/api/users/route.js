// src/app/api/users/route.js
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

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
      SELECT Username, Fullname, Role, Is_Login
      FROM user
      ${where}
      ORDER BY Fullname ASC
      `,
      args
    );

    return NextResponse.json(rows || []);
  } catch (e) {
    console.error("GET /api/users error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    try {
      conn.release();
    } catch {}
  }
}

// สร้างผู้ใช้ใหม่: { username, password, fullName, role }
export async function POST(req) {
  // อนุญาตเฉพาะ ADMIN
  const session = await readSession(req).catch(() => null);
  if (!session?.role || String(session.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const fullName = String(body?.fullName || "").trim();
  const role = String(body?.role || "").trim();

  const ALLOWED_ROLES = new Set([
    "ADMIN",
    "HEAD",
    "HOUSEKEEPER",
    "PURCHASING DEPARTMENT",
  ]);

  if (!username || !password || !fullName || !role) {
    return NextResponse.json(
      { error: "กรอกข้อมูลให้ครบ (username, password, fullName, role)" },
      { status: 400 }
    );
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: `บทบาทไม่ถูกต้อง: ${role}` },
      { status: 400 }
    );
  }

  const conn = await createConnection();
  try {
    // ตรวจซ้ำ
    const [[dup]] = await conn.execute(
      `SELECT 1 FROM User WHERE Username = ? LIMIT 1`,
      [username]
    );
    if (dup) {
      return NextResponse.json(
        { error: "มีชื่อผู้ใช้งานนี้อยู่ในระบบแล้ว" },
        { status: 409 }
      );
    }

    // ✅ บันทึก password แบบ plaintext
    await conn.execute(
      `
      INSERT INTO User (Username, Password, Fullname, Role, Is_Login)
      VALUES (?, ?, ?, ?, 0)
      `,
      [username, password, fullName, role]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/users error:", e);
    if (e.code == "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "มีชื่อ-สกุลนี้อยู่ในระบบแล้ว" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  } finally {
    try {
      conn.release();
    } catch {}
  }
}
