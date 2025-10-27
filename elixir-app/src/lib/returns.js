// lib/returns.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";

/**
 * คืนของจากรายการเบิก
 * @param {object} session - ข้อมูลผู้ใช้/เซสชัน (เผื่อใช้ log/สิทธิ์)
 * @param {number|string} wlno - เลขใบเบิก (WL_No)
 * @param {Array<{detailId:number|string, amount:number|string}>} items - รายการคืน [{ detailId, amount }]
 * @returns NextResponse.json(...)
 */
export async function handleReturn(session, wlno, items) {

   console.log("handleReturn called with wlno:", wlno, "items:", items);
   console.log("Session info:", session); 

  const wlNoNum = Number(wlno);
  if (!wlNoNum) {
    return NextResponse.json(
      { message: "Missing or invalid wlno" },
      { status: 400 }
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { message: "No items to return" },
      { status: 400 }
    );
  }

  let conn;
  try {
    conn = await createConnection();
    await conn.beginTransaction();

    const summary = [];

    for (const it of items) {
    console.log("Processing return item:", it);
      const detailId = Number(it?.detailId);
      const amount = Number(it?.amount);

      if (!detailId || !detailId || amount < 0) {
        throw new Error(
          `Invalid item payload for detailId=${it?.detailId}, amount=${it?.amount}`
        );
      }

      // อ่านรายการเบิกเพื่อ validate
      const [rows] = await conn.execute(
        `
        SELECT 
          wd.WD_Id,
          wd.WL_No,
          wd.I_Id,
          wd.WD_Amount,
          COALESCE(wd.WD_Return_Left, 0)         AS WD_Return_Left,
          COALESCE(wd.WD_After_Return_Amount, 0) AS WD_After_Return_Amount
        FROM withdraw_detail wd
        WHERE wd.WD_Id = ? AND wd.WL_No = ?
        LIMIT 1
        `,
        [detailId, wlNoNum]
      );

      if (!rows[0]) {
        throw new Error(`WD_Id=${detailId} not found in WL_No=${wlNoNum}`);
      }

      const row = rows[0];

      // คำนวณจำนวนที่ยังคืนได้ (กันกรณีบางคอลัมน์เป็น null)
      const approxLeft = Math.max(
        Number(row.WD_Amount) - Number(row.WD_After_Return_Amount),
        0
      );
      const returnLeft = Math.max(Number(row.WD_Return_Left || 0), approxLeft);

      if (amount > returnLeft) {
        throw new Error(
          `Return amount (${amount}) exceeds remaining (${returnLeft}) for WD_Id=${detailId}`
        );
      }

      // 1) เพิ่มสต็อกใน item
      await conn.execute(
        `UPDATE item SET I_Quantity = I_Quantity + ? WHERE I_Id = ?`,
        [amount, row.I_Id]
      );

      // 2) อัปเดตสถานะใน withdraw_detail
      await conn.execute(
        `
        UPDATE withdraw_detail
        SET 
          WD_After_Return_Amount = COALESCE(WD_After_Return_Amount, 0) + ?,
          WD_Return_Left = GREATEST(
            COALESCE(WD_Return_Left, ? ) - ?, 
            0
          )
        WHERE WD_Id = ? AND WL_No = ?
        `,
        [amount, approxLeft, amount, detailId, wlNoNum]
      );

      summary.push({
        detailId,
        iId: row.I_Id,
        returned: amount,
        remaining: returnLeft - amount,
      });
    }

    // ตรวจว่าคืนครบทั้งใบหรือยัง
    const [leftRows] = await conn.execute(
      `
      SELECT SUM(
        GREATEST(
          COALESCE(wd.WD_Return_Left, wd.WD_Amount - COALESCE(wd.WD_After_Return_Amount,0)),
          0
        )
      ) AS total_left
      FROM withdraw_detail wd
      WHERE wd.WL_No = ?
      `,
      [wlNoNum]
    );

    const totalLeft = Number(leftRows?.[0]?.total_left ?? 0);

    if (totalLeft === 0) {
      await conn.execute(
        `
        UPDATE withdraw_list
        SET WL_Is_Finished = 1,
            WL_Finish_DateTime = NOW()
        WHERE WL_No = ?
        `,
        [wlNoNum]
      );
    }

    await conn.commit();

    return NextResponse.json({
      ok: true,
      wlno: wlNoNum,
      totalLeft,
      closed: totalLeft === 0,
      items: summary,
    });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error("handleReturn error:", e);
    return NextResponse.json(
      { message: e.message || "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}
