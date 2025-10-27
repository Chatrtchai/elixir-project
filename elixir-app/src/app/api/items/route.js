// src/app/api/items/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";

// GET /api/items?q=น้ำยา
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const conn = await createConnection();
  try {
    let sql = `
      SELECT I_Id, I_Name, I_Quantity FROM ITEM
    `;
    const params = [];

    if (q) {
      sql += ` WHERE I_Name LIKE ? `;
      params.push(`%${q}%`);
    }

    sql += ` ORDER BY I_Name ASC LIMIT 500`;

    const [rows] = await conn.execute(sql, params);
    return NextResponse.json(rows); // ✅ คืน JSON เสมอ
  } catch (e) {
    console.error("GET /api/items", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
