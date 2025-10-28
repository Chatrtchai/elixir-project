// src/app/api/transactions/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

// ดึงทั้ง TRANSACTION (ฝั่งคลัง) + REQUEST_TRANSACTION (ฝั่งคำขอซื้อ)
export async function GET(req) {
  const session = await readSession(req);
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT id, datetime, note FROM (
        SELECT 
          CAST(T_No AS CHAR)         AS id,
          T_DateTime                 AS datetime,
          T_Note                     AS note
        FROM transaction
        WHERE HK_Username = ?

        UNION ALL

        SELECT
          CONCAT('REQ-', RT_No)      AS id,
          RT_DateTime                AS datetime,
          RT_Note                    AS note
        FROM request_transaction
        WHERE Username = ?
      ) AS all_logs
      ORDER BY datetime DESC
      `,
      [session.sub, session.sub]
    );

    await conn.end();
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/transactions error:", e);
    await conn.end().catch(() => {});
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
