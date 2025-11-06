// src/app/api/withdraws/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

/* ---------------------------------- GET ---------------------------------- */
/**
 * GET /api/withdraws?q=...
 * ส่งคืนรายการใบเบิก (ของผู้ใช้ปัจจุบันเท่านั้น)
 * รูปแบบแต่ละแถว:
 * {
 *   WL_No, WL_DateTime, WL_Finish_DateTime, WL_Is_Finished, ItemCount
 * }
 */
export async function GET(req) {
  const session = await readSession(req);
  if (!session) return NextResponse.json([], { status: 200 }); // ไม่บึ้มหน้า

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  const conn = await createConnection();
  try {
    // คำสั่งหลัก: รวมนับจำนวนรายการ/ชิ้นในใบเบิก
    // เงื่อนไขค้นหา:
    // - ถ้า q เป็นตัวเลข: หา WL_No ตรง
    // - หรือมีสินค้าชื่อ/ไอดีที่แมตช์ (JOIN ผ่าน subquery)
    const wh = ["wl.HK_Username = ?"];
    const args = [session.sub];

    let subSearch = "";
    if (q) {
      const asNum = Number(q);
      const isInt = Number.isInteger(asNum);

      if (isInt) {
        wh.push(
          "(wl.WL_No = ? OR EXISTS (SELECT 1 FROM withdraw_detail wd JOIN item it ON it.I_Id = wd.I_Id WHERE wd.WL_No = wl.WL_No AND (it.I_Id = ? OR it.I_Name LIKE ?)))"
        );
        args.push(asNum, asNum, `%${q}%`);
      } else {
        wh.push(
          "EXISTS (SELECT 1 FROM withdraw_detail wd JOIN item it ON it.I_Id = wd.I_Id WHERE wd.WL_No = wl.WL_No AND it.I_Name LIKE ?)"
        );
        args.push(`%${q}%`);
      }
    }

    const whereSql = `WHERE ${wh.join(" AND ")}`;

    const [rows] = await conn.query(
      `
      SELECT
        wl.WL_No,
        wl.WL_DateTime,
        wl.WL_Finish_DateTime,
        wl.WL_Is_Finished,
        COUNT(wd.WD_Id) AS ItemCount
      FROM withdraw_list wl
      LEFT JOIN withdraw_detail wd ON wd.WL_No = wl.WL_No
      ${whereSql}
      GROUP BY wl.WL_No
      ORDER BY wl.WL_Finish_DateTime DESC
      `,
      args
    );

    // หน้า UI คาดหวังเป็น "array" ตรง ๆ
    return NextResponse.json(rows || [], { status: 200 });
  } catch (e) {
    console.error("GET /api/withdraws error:", e);
    // ส่ง array ว่างเพื่อไม่ให้หน้าแตก
    return NextResponse.json([], { status: 200 });
  } finally {
    try {
      conn.release();
    } catch {}
  }
}

/* ---------------------------------- POST --------------------------------- */
/**
 * POST /api/withdraws
 * สร้าง "ใบเบิก" + หักสต็อก + บันทึกประวัติ (transaction/transaction_detail)
 * Body:
 * {
 *   "items": [{ "itemId": 1, "amount": 3 }, ...],
 *   "note": "ข้อความเพิ่มเติม (ออปชัน)"
 * }
 */
export async function POST(req) {
  const session = await readSession(req);
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const role = (session.role || "").toUpperCase();
  if (role !== "HOUSEKEEPER" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  const extraNote = (body.note || "").trim();

  if (!items.length) {
    return NextResponse.json({ error: "items_required" }, { status: 400 });
  }
  for (const it of items) {
    const itemId = Number(it?.itemId);
    const amount = Number(it?.amount);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "invalid_item_id" }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }
  }

  const conn = await createConnection();
  try {
    await conn.beginTransaction();

    // 1) สร้างหัวใบเบิก
    // WITHDRAW_LIST(WL_No, WL_DateTime, WL_Is_Finished, WL_Finish_DateTime, HK_Username)
    const [wlHead] = await conn.execute(
      "INSERT INTO withdraw_list (WL_DateTime, WL_Is_Finished, HK_Username) VALUES (NOW(), 0, ?)",
      [session.sub]
    );
    const WL_No = wlHead.insertId;

    // 2) ล็อก → ตรวจสต็อก → หักสต็อก → ใส่ withdraw_detail
    for (const it of items) {
      const itemId = Number(it.itemId);
      const amount = Number(it.amount);

      const [lockRows] = await conn.execute(
        "SELECT I_Quantity FROM item WHERE I_Id = ? FOR UPDATE",
        [itemId]
      );

      if (!lockRows.length) throw new Error(`item_not_found:${itemId}`);

      const qty = Number(lockRows[0].I_Quantity);
      
      // qty: จำนวนที่มีอยู่, amount: จำนวนที่เบิก
      if (qty < amount)
        throw new Error(
          `insufficient_stock:item=${itemId},have=${qty},need=${amount}`
        );

      // WITHDRAW_DETAIL(WD_Id, WD_Amount_Left, WD_Amount, WD_Return_Left, WD_After_Return_Amount, I_Id, WL_No)
      await conn.execute(
        `INSERT INTO withdraw_detail
           (WD_Amount_Left, WD_Amount, WD_Return_Left, WD_After_Return_Amount, I_Id, WL_No)
         VALUES (?, ?, 0, 0, ?, ?)`,
        [qty - amount, amount, itemId, WL_No]
      );

    }

    // 3) TRANSACTION (หัว)

    const [trxHead] = await conn.execute(
      "INSERT INTO `transaction` (`T_DateTime`, `T_Note`, `HK_Username`) VALUES (NOW(), ?, ?)",
      ["เบิกของ", session.sub]
    );

    const T_No = trxHead.insertId;

    // 4) TRANSACTION_DETAIL (หลังเบิก: ยอดคงเหลือจริง)
    for (const it of items) {
      const itemId = Number(it.itemId);
      const amount = Number(it.amount);

      const [[after]] = await conn.execute(
        "SELECT I_Quantity FROM item WHERE I_Id = ?",
        [itemId]
      );
      
      const afterLeft = Number(after.I_Quantity);

      await conn.execute(
        `INSERT INTO transaction_detail
           (TD_Total_Left, TD_Amount_Changed, T_No, I_Id)
         VALUES (?, ?, ?, ?)`,
        [afterLeft - amount, amount, T_No, itemId]
      );

      await conn.execute(
        "UPDATE item SET I_Quantity = I_Quantity - ? WHERE I_Id = ?",
        [amount, itemId]
      );

    }

    await conn.commit();
    return NextResponse.json({ ok: true, WL_No, T_No }, { status: 201 });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error("POST /api/withdraws error:", e);
    if (String(e.message || "").startsWith("insufficient_stock")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (String(e.message || "").startsWith("item_not_found")) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: "withdraw_failed" }, { status: 500 });
  } finally {
    try {
      conn.release();
    } catch {}
  }
}
