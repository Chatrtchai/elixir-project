// src\app\api\requests\route.js

import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";

// GET: คืน JSON เสมอ
export async function GET() {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT 
        r.R_No,
        r.R_Status,
        r.R_DateTime,
        r.HK_Username,
        r.H_Username,
        r.PD_Username,
        h.Fullname  AS HeadName,
        hk.Fullname AS HKName,
        pd.Fullname AS PDName
      FROM REQUEST r
      LEFT JOIN USER h  ON r.H_Username  = h.Username
      LEFT JOIN USER hk ON r.HK_Username = hk.Username
      LEFT JOIN USER pd ON r.PD_Username = pd.Username
      ORDER BY r.R_No DESC
    `);
    return NextResponse.json(rows ?? []);
  } catch (err) {
    console.error("GET /api/requests error:", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 }
    );
  } finally {
    await conn.end();
  }
}

// POST: สร้างคำขอใหม่ โดยบันทึกผู้สร้างคำขอจาก session.sub → HK_Username
export async function POST(req) {
  const conn = await createConnection();

  // 1) อ่าน session: auth.js คืน { sub, name, role }
  const session = await readSession(req).catch(() => null);
  const hk_username = session?.sub ?? null; // ← ใช้ sub เป็น username

  // 2) อ่าน body + ตรวจความถูกต้อง
  let body;
  try {
    body = await req.json();
  } catch {
    await conn.end();
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const headUsername = body?.headUsername ?? null; // อนุญาต null ถ้า schema รับได้
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!hk_username) {
    await conn.end();
    return NextResponse.json(
      { error: "Unauthorized: no session" },
      { status: 401 }
    );
  }
  if (items.length === 0) {
    await conn.end();
    return NextResponse.json({ error: "Items is required" }, { status: 400 });
  }
  for (const it of items) {
    if (
      typeof it?.itemId !== "number" ||
      typeof it?.amount !== "number" ||
      !Number.isFinite(it.itemId) ||
      !Number.isFinite(it.amount) ||
      it.amount <= 0
    ) {
      await conn.end();
      return NextResponse.json(
        { error: "Invalid items payload" },
        { status: 400 }
      );
    }
  }

  // 3) ทำงานใน transaction
  try {
    await conn.beginTransaction();

    // 3.1 INSERT คำขอหลัก
    const [result] = await conn.execute(
      `
      INSERT INTO REQUEST
        (R_Status,   R_DateTime,  HK_Username,  H_Username,  R_LastModified)
      VALUES
        (?,          NOW(),       ?,            ?,           NOW())
      `,
      ["Waiting", hk_username, headUsername]
    );
    const requestId = result.insertId;

    // 3.2 INSERT รายการย่อย
    for (const it of items) {
      await conn.execute(
        `INSERT INTO REQUEST_DETAIL (RD_Amount, I_Id, R_No) VALUES (?, ?, ?)`,
        [it.amount, it.itemId, requestId]
      );
    }

    // 3.3 INSERT ประวัติ (ผู้ลงรายการ = ผู้สร้างคำขอ → hk_username)
    await conn.execute(
      `INSERT INTO REQUEST_TRANSACTION (RT_DateTime, RT_Note, R_No, Username) VALUES (NOW(), ?, ?, ?)`,
      ["สร้างคำขอใหม่", requestId, hk_username]
    );

    await conn.commit();
    return NextResponse.json({ ok: true, requestId });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("POST /api/requests error:", err);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
