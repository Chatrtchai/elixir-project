import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

/**
 * GET /api/withdraws?q=
 * - แสดงเฉพาะใบเบิกของ Housekeeper ที่ล็อกอินอยู่ (session.sub)
 * - ค้นหาจาก WL_No หรือชื่อ Item ที่อยู่ในใบเบิกก็ได้
 */
export async function GET(req) {
  const session = await readSession(req);
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const conn = await createConnection();
  try {
    const where = ["wl.HK_Username = ?"];
    const params = [session.sub];

    if (q) {
      where.push(`(
        wl.WL_No = ? OR EXISTS (
          SELECT 1
          FROM withdraw_detail wd
          JOIN item it ON it.I_Id = wd.I_Id
          WHERE wd.WL_No = wl.WL_No
            AND it.I_Name LIKE ?
        )
      )`);
      params.push(Number(q) || -1, `%${q}%`);
    }

    const sql = `
      SELECT
        wl.WL_No,
        wl.WL_Is_Finished,
        wl.WL_DateTime,
        wl.WL_Finish_DateTime,
        wl.HK_Username,
        (
          SELECT COUNT(*) FROM withdraw_detail d WHERE d.WL_No = wl.WL_No
        ) AS ItemCount,
        (
          SELECT MAX(d.WD_Id) FROM withdraw_detail d WHERE d.WL_No = wl.WL_No
        ) AS LastDetailId
      FROM withdraw_list wl
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY wl.WL_DateTime DESC
      LIMIT 500
    `;
    const [rows] = await conn.execute(sql, params);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/withdraws", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    await conn.end();
  }
}

/**
 * POST /api/withdraws
 * body: { items: [{ itemId: number, amount: number }, ...] }
 * - สร้างหัวใบเบิกใน withdraw_list
 * - ใส่รายการลง withdraw_detail
 * - หักสต็อกจาก item.I_Quantity
 * - ตั้งค่าเขตข้อมูลใน detail:
 *   WD_Amount = จำนวนที่เบิก,
 *   WD_Amount_Left = จำนวนคงเหลือให้ “คืนได้” (ตั้งต้น = WD_Amount),
 *   WD_Return_Left = 0,
 *   WD_After_Return_Amount = สต็อกของ item หลังจากหักเบิก (ตั้งต้น)
 */
export async function POST(req) {
  const session = await readSession(req);
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "HOUSEKEEPER")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json(
      { error: "ต้องมีรายการอย่างน้อย 1 รายการ" },
      { status: 400 }
    );
  }

  // sanitize
  for (const it of items) {
    it.itemId = Number(it.itemId);
    it.amount = Number(it.amount);
    if (
      !Number.isFinite(it.itemId) ||
      !Number.isFinite(it.amount) ||
      it.amount <= 0
    ) {
      return NextResponse.json(
        { error: "รูปแบบรายการไม่ถูกต้อง" },
        { status: 400 }
      );
    }
  }

  const conn = await createConnection();
  try {
    await conn.beginTransaction();

    // 1) สร้างหัวใบเบิก
    const [resHead] = await conn.execute(
      `INSERT INTO withdraw_list (WL_Is_Finished, WL_DateTime, HK_Username)
       VALUES (0, NOW(), ?)`,
      [session.sub]
    );
    const wlno = resHead.insertId;

    // 2) ใส่รายละเอียด + ตัดสต็อก
    for (const line of items) {
      // ล็อกสต็อก item
      const [[it]] = await conn.execute(
        `SELECT I_Id, I_Quantity FROM item WHERE I_Id = ? FOR UPDATE`,
        [line.itemId]
      );
      if (!it) {
        await conn.rollback();
        return NextResponse.json(
          { error: `ไม่พบ Item I_Id=${line.itemId}` },
          { status: 404 }
        );
      }
      if (it.I_Quantity < line.amount) {
        await conn.rollback();
        return NextResponse.json(
          { error: `ของไม่พอ (I_Id=${line.itemId})` },
          { status: 409 }
        );
      }

      // ตัดสต็อก
      const after = it.I_Quantity - line.amount;
      await conn.execute(`UPDATE item SET I_Quantity = ? WHERE I_Id = ?`, [
        after,
        it.I_Id,
      ]);

      // เพิ่ม withdraw_detail
      await conn.execute(
        `INSERT INTO withdraw_detail
          (WD_After_Return_Amount, WD_Amount_Left, WD_Amount, WD_Return_Left, WL_No, I_Id)
         VALUES (?, ?, ?, 0, ?, ?)`,
        [
          after, // WD_After_Return_Amount (สต็อกหลังหักเบิก ณ เวลานี้)
          line.amount, // WD_Amount_Left (ยอดที่ยัง "คืนได้" ตั้งต้น=จำนวนที่เบิก)
          line.amount, // WD_Amount (จำนวนที่เบิก)
          wlno,
          line.itemId,
        ]
      );
    }

    // 3) (ถ้าต้องการ) ปิดใบเบิกทันทีหรือยัง - ที่นี่ยังไม่ปิด (WL_Is_Finished=0)
    await conn.commit();
    return NextResponse.json({ ok: true, wlno }, { status: 201 });
  } catch (e) {
    await conn.rollback();
    console.error("POST /api/withdraws", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
