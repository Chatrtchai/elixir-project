// src/app/api/withdraws/[wlno]/return/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";

// (แนะนำ) ชัดเจนว่าใช้ node runtime ไม่ใช่ edge
export const runtime = "nodejs";

export async function PATCH(req, context) {
  // ✅ ต้อง await context เพื่อให้ได้ params
  const { params } = await context;
  const wlno = Number(params?.wlno);
  if (!wlno) {
    return NextResponse.json(
      { error: "รหัสใบเบิกไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // ✅ parse body ให้ปลอดภัย
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "รูปแบบข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "ไม่มีรายการคืน" }, { status: 400 });
  }

  // ✅ validate payload ทีละแถว
  for (const it of items) {
    if (
      typeof it?.detailId !== "number" ||
      typeof it?.amount !== "number" ||
      !Number.isFinite(it.detailId) ||
      !Number.isFinite(it.amount) ||
      it.amount < 0
    ) {
      return NextResponse.json(
        { error: "ข้อมูลรายการคืนไม่ถูกต้อง" },
        { status: 400 }
      );
    }
  }

  let conn;
  try {
    conn = await createConnection();
    await conn.beginTransaction();

    for (const r of items) {
      // ล็อคแถวไว้กัน race condition
      const [rows] = await conn.execute(
        `
        SELECT 
          wd.WD_Id,
          wd.WL_No,
          wd.I_Id,
          wd.WD_Amount_Left,
          COALESCE(wd.WD_Return_Left, 0)         AS WD_Return_Left,
          COALESCE(wd.WD_After_Return_Amount, 0) AS WD_After_Return_Amount,
          i.I_Quantity
        FROM withdraw_detail wd
        JOIN item i ON i.I_Id = wd.I_Id
        WHERE wd.WD_Id = ? AND wd.WL_No = ?
        FOR UPDATE
        `,
        [r.detailId, wlno]
      );

      if (!rows.length) {
        await conn.rollback();
        return NextResponse.json(
          { error: `ไม่พบรายการ WD_Id=${r.detailId} ในใบเบิกนี้` },
          { status: 404 }
        );
      }

      const d = rows[0];

      // ห้ามคืนเกินของที่ยังเหลือในรายการนี้
      if (r.amount > Number(d.WD_Amount_Left)) {
        await conn.rollback();
        return NextResponse.json(
          { error: `จำนวนคืนเกินของคงเหลือ (detailId=${r.detailId})` },
          { status: 409 }
        );
      }

      if (r.amount === 0) {
        // เคส “ใช้หมดไม่คืน” — ปิดรายการนี้ (ของคงเหลือ = 0) และไม่เพิ่มสต็อก
        await conn.execute(
          `UPDATE withdraw_detail
             SET WD_Amount_Left = 0
           WHERE WD_Id = ? AND WL_No = ?`,
          [d.WD_Id, wlno]
        );
      } else {
        // คืนของ → เพิ่มสต็อก และปรับสถานะรายการ
        const afterStock = Number(d.I_Quantity) + Number(r.amount);

        // 1) เพิ่มของเข้าสต็อก
        await conn.execute(`UPDATE item SET I_Quantity = ? WHERE I_Id = ?`, [
          afterStock,
          d.I_Id,
        ]);

        // 2) ปรับค่าสถานะใน withdraw_detail
        await conn.execute(
          `
          UPDATE withdraw_detail
          SET 
            -- จำนวนที่ยังต้องคืน ลดลง
            WD_Return_Left = GREATEST(COALESCE(WD_Return_Left, 0) - ?, 0),

            -- ของคงเหลือในรายการนี้ ลดลง (ทั้งใช้หมดหรือคืนก็ลด)
            WD_Amount_Left = GREATEST(COALESCE(WD_Amount_Left, 0) - ?, 0),

            -- จำนวนที่คืนไปแล้ว สะสมเพิ่มขึ้น
            WD_After_Return_Amount = COALESCE(WD_After_Return_Amount, 0) + ?
          WHERE WD_Id = ? AND WL_No = ?
          `,
          [r.amount, r.amount, r.amount, d.WD_Id, wlno]
        );
      }
    }

    // เช็คว่าทั้งใบเบิกยังเหลือของอยู่ไหม
    const [[remain]] = await conn.execute(
      `SELECT SUM(WD_Amount_Left) AS leftSum
       FROM withdraw_detail
       WHERE WL_No = ?`,
      [wlno]
    );

    if (Number(remain?.leftSum || 0) === 0) {
      // ปิดใบเบิก ถ้าไม่มีของเหลืออยู่ในทุกรายการ
      await conn.execute(
        `
        UPDATE withdraw_list
        SET WL_Is_Finished = 1,
            WL_Finish_DateTime = NOW()
        WHERE WL_No = ?
        `,
        [wlno]
      );
    }

    await conn.commit();
    return NextResponse.json({
      ok: true,
      wlno,
      leftSum: Number(remain?.leftSum || 0),
    });
  } catch (e) {
    try {
      if (conn) await conn.rollback();
    } catch {}
    return NextResponse.json(
      { error: e?.message || "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end(); // ✅ ใช้ end() กับ connection ที่สร้างจาก createConnection()
  }
}
