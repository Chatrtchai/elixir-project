// src/app/api/requests/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";

// GET: คืนรายการคำขอ โดยแยก query ตามบทบาทผู้ใช้
export async function GET(req) {
  const session = await readSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const role = String(session.role || "").toUpperCase();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  const conn = await createConnection();
  try {
    let rows = [];

    // ✅ 1. HEAD เห็นเฉพาะของตนเอง
    if (role === "HEAD") {
      if (q) {
        const asNum = Number(q);
        if (Number.isInteger(asNum)) {
          const [result] = await conn.execute(
            `
            SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
            FROM REQUEST r
            LEFT JOIN USER h  ON r.H_Username  = h.Username
            LEFT JOIN USER hk ON r.HK_Username = hk.Username
            LEFT JOIN USER pd ON r.PD_Username = pd.Username
            WHERE r.H_Username = ? AND r.R_No = ?
            ORDER BY r.R_No DESC
            `,
            [session.sub, asNum]
          );
          rows = result;
        } else {
          const like = `%${q}%`;
          const [result] = await conn.execute(
            `
            SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
            FROM REQUEST r
            LEFT JOIN USER h  ON r.H_Username  = h.Username
            LEFT JOIN USER hk ON r.HK_Username = hk.Username
            LEFT JOIN USER pd ON r.PD_Username = pd.Username
            WHERE r.H_Username = ?
              AND (h.Fullname LIKE ? OR hk.Fullname LIKE ? OR pd.Fullname LIKE ? OR r.R_Status LIKE ?)
            ORDER BY r.R_No DESC
            `,
            [session.sub, like, like, like, like]
          );
          rows = result;
        }
      } else {
        const [result] = await conn.execute(
          `
          SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
          FROM REQUEST r
          LEFT JOIN USER h  ON r.H_Username  = h.Username
          LEFT JOIN USER hk ON r.HK_Username = hk.Username
          LEFT JOIN USER pd ON r.PD_Username = pd.Username
          WHERE r.H_Username = ?
          ORDER BY r.R_No DESC
          `,
          [session.sub]
        );
        rows = result;
      }
    }

    // ✅ 2. HOUSEKEEPER เห็นทั้งหมด
    else if (role === "HOUSEKEEPER") {
      const like = `%${q}%`;
      const [result] = await conn.execute(
        `
        SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
        FROM REQUEST r
        LEFT JOIN USER h  ON r.H_Username  = h.Username
        LEFT JOIN USER hk ON r.HK_Username = hk.Username
        LEFT JOIN USER pd ON r.PD_Username = pd.Username
        ${
          q
            ? "WHERE (h.Fullname LIKE ? OR hk.Fullname LIKE ? OR pd.Fullname LIKE ? OR r.R_Status LIKE ? OR r.R_No LIKE ?)"
            : ""
        }
        ORDER BY r.R_No DESC
        `,
        q ? [like, like, like, like, like] : []
      );
      rows = result;
    }

    // ✅ 3. PURCHASING DEPARTMENT เห็นเฉพาะของตนเอง
    else if (role === "PURCHASING DEPARTMENT") {
      if (q) {
        const asNum = Number(q);
        if (Number.isInteger(asNum)) {
          const [result] = await conn.execute(
            `
            SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
            FROM REQUEST r
            LEFT JOIN USER h  ON r.H_Username  = h.Username
            LEFT JOIN USER hk ON r.HK_Username = hk.Username
            LEFT JOIN USER pd ON r.PD_Username = pd.Username
            WHERE r.PD_Username = ? AND r.R_No = ?
            ORDER BY r.R_No DESC
            `,
            [session.sub, asNum]
          );
          rows = result;
        } else {
          const like = `%${q}%`;
          const [result] = await conn.execute(
            `
            SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
            FROM REQUEST r
            LEFT JOIN USER h  ON r.H_Username  = h.Username
            LEFT JOIN USER hk ON r.HK_Username = hk.Username
            LEFT JOIN USER pd ON r.PD_Username = pd.Username
            WHERE r.PD_Username = ?
              AND (h.Fullname LIKE ? OR hk.Fullname LIKE ? OR pd.Fullname LIKE ? OR r.R_Status LIKE ?)
            ORDER BY r.R_No DESC
            `,
            [session.sub, like, like, like, like]
          );
          rows = result;
        }
      } else {
        const [result] = await conn.execute(
          `
          SELECT r.*, h.Fullname AS HeadName, hk.Fullname AS HKName, pd.Fullname AS PDName
          FROM REQUEST r
          LEFT JOIN USER h  ON r.H_Username  = h.Username
          LEFT JOIN USER hk ON r.HK_Username = hk.Username
          LEFT JOIN USER pd ON r.PD_Username = pd.Username
          WHERE r.PD_Username = ?
          ORDER BY r.R_No DESC
          `,
          [session.sub]
        );
        rows = result;
      }
    }

    // ❌ 4. บทบาทอื่น เช่น ADMIN → ไม่มีสิทธิ์
    else {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

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

export async function POST(req) {
  const session = await readSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { headUsername, items } = await req.json();
    if (!headUsername || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const conn = await createConnection();
    await conn.beginTransaction();

    // 1️⃣ INSERT INTO REQUEST
    const [reqResult] = await conn.execute(
      `
      INSERT INTO REQUEST (R_Status, R_DateTime, R_LastModified, HK_Username, H_Username, PD_Username)
      VALUES ('Waiting', CONVERT_TZ(NOW(), '+00:00', '+07:00'), CONVERT_TZ(NOW(), '+00:00', '+07:00'), ?, ?, NULL)
      `,
      [session.sub, headUsername]
    );
    const requestNo = reqResult.insertId;

    // 2️⃣ INSERT INTO REQUEST_DETAIL (ทีละรายการ)
    for (const item of items) {
      await conn.execute(
        `
        INSERT INTO REQUEST_DETAIL (RD_Amount, R_No, I_Id)
        VALUES (?, ?, ?)
        `,
        [item.amount, requestNo, item.itemId]
      );
    }

    // 3️⃣ INSERT INTO REQUEST_TRANSACTION
    await conn.execute(
      `
      INSERT INTO REQUEST_TRANSACTION (RT_DateTime, RT_Note, R_No, Username)
      VALUES (CONVERT_TZ(NOW(), '+00:00', '+07:00'), 'สร้างคำขอจัดซื้อใหม่', ?, ?)
      `,
      [requestNo, session.sub]
    );

    await conn.commit();
    await conn.end();

    return NextResponse.json({ success: true, R_No: requestNo });
  } catch (err) {
    console.error("POST /api/requests error:", err);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกคำขอได้" },
      { status: 500 }
    );
  }
}
