// src/app/api/items/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

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

// POST /api/items
export async function POST(req) {
  const session = await readSession(req).catch(() => null);
  if (!session || session.role !== "HOUSEKEEPER") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { I_Name, I_Quantity } = await req.json();
  if (!I_Name || I_Quantity === undefined)
    return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });

  const conn = await createConnection();
  try {
    // 1️⃣ หา ID ล่าสุด +1
    const [[last]] = await conn.query("SELECT MAX(I_Id) AS lastId FROM ITEM");
    const newId = Number(last?.lastId || 0) + 1;

    // 2️⃣ เพิ่มลงตาราง ITEM
    const [itemRes] = await conn.execute(
      "INSERT INTO ITEM (I_Id, I_Name, I_Quantity) VALUES (?, ?, ?)",
      [newId, I_Name, I_Quantity]
    );

    // 3️⃣ สร้าง Transaction ใหม่
    const [txRes] = await conn.execute(
      "INSERT INTO TRANSACTION (T_DateTime, T_Note, HK_Username) VALUES (NOW(), ?, ?)",
      ["เพิ่ม" + I_Name + "จำนวน" + I_Quantity + "ชิ้น เข้าคลัง", session.sub]
    );
    const T_No = txRes.insertId;

    // 4️⃣ บันทึกรายการย่อย
    await conn.execute(
      "INSERT INTO TRANSACTION_DETAIL (TD_Amount_Changed, TD_Total_Left, T_No, I_Id) VALUES (?, ?, ?, ?)",
      [I_Quantity, I_Quantity, T_No, newId]
    );

    return NextResponse.json({ success: true, I_Id: newId });
  } catch (e) {
    console.error("POST /api/items error:", e);
    if (e.code == "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "สินค้าชื่อดังกล่าวอยู่แล้วภายในคลัง" }, { status: 400 });
    }
      return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    await conn.end();
  }
}

