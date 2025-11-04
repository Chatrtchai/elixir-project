// src/app/api/transactions/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET(req) {
  const session = await readSession(req);
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const conn = await createConnection();
  try {
    let sql = "";

    if (type === "transaction") {
      sql = `
        SELECT 
          CAST(t.T_No AS CHAR) AS id,
          t.T_DateTime         AS datetime,
          t.T_Note             AS note,
          u.Fullname           AS actor
        FROM transaction t
        JOIN user u ON u.Username = t.HK_Username
        ORDER BY datetime DESC
      `;
    } else if (type === "request_transaction") {
      sql = `
        SELECT 
          CAST(rt.RT_No AS CHAR) AS id,
          rt.RT_DateTime         AS datetime,
          rt.RT_Note             AS note,
          u.Fullname             AS actor
        FROM request_transaction rt
        JOIN user u ON u.Username = rt.Username
        ORDER BY datetime DESC
      `;
    } else {
      // รวมทั้งหมด
      sql = `
        SELECT id, datetime, note, actor FROM (
          SELECT 
            CAST(t.T_No AS CHAR) AS id,
            t.T_DateTime         AS datetime,
            t.T_Note             AS note,
            u.Fullname           AS actor
          FROM transaction t
          JOIN user u ON u.Username = t.HK_Username

          UNION ALL

          SELECT
            CAST(rt.RT_No AS CHAR) AS id,
            rt.RT_DateTime         AS datetime,
            rt.RT_Note             AS note,
            u.Fullname             AS actor
          FROM request_transaction rt
          JOIN user u ON u.Username = rt.Username
        ) AS all_logs
        ORDER BY datetime DESC
      `;
    }

    const [rows] = await conn.execute(sql);
    await conn.end();
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/transactions error:", e);
    await conn.end().catch(() => {});
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
