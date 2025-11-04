// src/app/api/requests/[id]/complete/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(_req, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const role = (session.role || "").toUpperCase();
  if (role !== "HOUSEKEEPER" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rno = Number(params.id);
  if (!rno)
    return NextResponse.json({ error: "invalid_request_no" }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 0) ตรวจสถานะคำร้อง
    const [reqRows] = await conn.execute(
      "SELECT R_Status FROM request WHERE R_No = ? FOR UPDATE",
      [rno]
    );
    if (!reqRows.length) throw new Error("request_not_found");
    if (reqRows[0].R_Status !== "Received") {
      throw new Error("invalid_state_to_complete");
    }

    // 1) สร้างหัว transaction
    const note = `รับของตามคำร้อง #${rno}`;
    const [headRes] = await conn.execute(
      "INSERT INTO `transaction` (`T_DateTime`,`T_Note`,`HK_Username`) VALUES (NOW(), ?, ?)",
      [note, session.sub]
    );
    const T_No = headRes.insertId;

    // 2) ดึงรายละเอียดคำร้องทั้งหมด
    const [rdRows] = await conn.execute(
      "SELECT I_Id, RD_Amount FROM request_detail WHERE R_No = ?",
      [rno]
    );
    if (!rdRows.length) throw new Error("request_detail_empty");

    // 2.1) วนเพิ่มสต็อก + บันทึกรายการย่อย
    for (const row of rdRows) {
      const itemId = Number(row.I_Id);
      const amount = Number(row.RD_Amount);
      if (!itemId || !amount || amount <= 0) {
        throw new Error("invalid_request_detail");
      }

      // ล็อกแถว item
      const [lockRows] = await conn.execute(
        "SELECT I_Quantity FROM item WHERE I_Id = ? FOR UPDATE",
        [itemId]
      );
      if (!lockRows.length) throw new Error(`item_not_found:${itemId}`);

      // เพิ่มสต็อก
      await conn.execute(
        "UPDATE item SET I_Quantity = I_Quantity + ? WHERE I_Id = ?",
        [amount, itemId]
      );

      // ยอดคงเหลือใหม่
      const [afterRows] = await conn.execute(
        "SELECT I_Quantity FROM item WHERE I_Id = ?",
        [itemId]
      );
      const totalLeft = Number(afterRows[0].I_Quantity);

      // บันทึกรายการย่อย
      await conn.execute(
        "INSERT INTO `transaction_detail` (`TD_Total_Left`,`TD_Amount_Changed`,`I_Id`,`T_No`) VALUES (?,?,?,?)",
        [totalLeft, amount, itemId, T_No]
      );
    }

    // 3) เปลี่ยนสถานะ → Completed + ลง request_transaction
    await conn.execute(
      "UPDATE request SET R_Status='Completed', R_DateTime = R_DateTime WHERE R_No=?",
      [rno]
    );
    await conn.execute(
      "INSERT INTO request_transaction (`RT_DateTime`,`RT_Note`,`R_No`,`Username`) VALUES (NOW(),'Completed',?,?)",
      [rno, session.sub]
    );

    await conn.commit();
    return NextResponse.json({ ok: true, rno, T_No });
  } catch (e) {
    await conn.rollback();
    console.error("complete request error:", e);
    return NextResponse.json(
      { error: e.message || "complete_failed" },
      { status: 400 }
    );
  } finally {
    try {
      conn.release();
    } catch {}
  }
}
