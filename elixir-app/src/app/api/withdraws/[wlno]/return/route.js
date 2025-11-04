// src/app/api/withdraws/[wlno]/return/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

// ---------- Utilities ----------
function parseItems(bodyItems = []) {

  const items = Array.isArray(bodyItems) ? bodyItems : [];

  const out = [];

  for (const it of items) {

    const itemId = Number(it?.itemId);
    const amount = Number(it?.amount);

    const detailId = 
      it?.detailId != null ? 
      Number(it.detailId) : null;

    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new Error("invalid_item_id");
    }

    if (!Number.isInteger(amount) || amount < 0) {
      // คืนอย่างน้อย 1 ชิ้น
      throw new Error("invalid_amount");
    }

    out.push({ itemId, amount, detailId });
  }

  if (!out.length) 
    throw new Error("items_required");

  return out;

}

async function authHKorAdmin(req) {
  const session = await readSession(req);

  if (!session) 
    throw new Error("unauthorized");

  const role = (session.role || "").toUpperCase();

  if (role !== "HOUSEKEEPER" && role !== "ADMIN") 
    throw new Error("forbidden");

  return session;
}

// ---------- PATCH: อัปเดตสต็อก & รายการใบเบิก ----------
export async function PATCH(req, { params }) {

  try {

    const wlno = Number(params?.wlno);

    if (!Number.isInteger(wlno) || wlno <= 0) {
      return NextResponse.json({ error: "invalid_wlno" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}))
    
    const items = parseItems(body.items);

    const conn = await createConnection();

    try {

      await conn.beginTransaction();

      // 0) ตรวจใบเบิก & ล็อก
      const [wlRows] = await conn.execute(
        "SELECT WL_No FROM withdraw_list WHERE WL_No = ? FOR UPDATE",
        [wlno]
      );

      if (!wlRows.length) throw new Error("withdraw_list_not_found");

      // 1) คืนของ: ล็อกสินค้า แล้วเพิ่มสต็อก + อัปเดต WD
      for (const it of items) {
        const { itemId, amount, detailId } = it;

        // ล็อกสินค้า
        const [lockRows] = await conn.execute(
          "SELECT I_Quantity FROM item WHERE I_Id = ? FOR UPDATE",
          [itemId]
        );
        
        if (!lockRows.length) throw new Error(`item_not_found:${itemId}`);

        // เพิ่มสต็อก (คืนของ)
        await conn.execute(
          "UPDATE item SET I_Quantity = I_Quantity + ? WHERE I_Id = ?",
          [amount, itemId]
        );

        const [[itemRow]] = await conn.execute(
          "SELECT I_Quantity FROM item WHERE I_Id = ?",
          [itemId]
        );

        const afterReturnAmount = Number(itemRow?.I_Quantity ?? 0);

        // อัปเดตแถว withdraw_detail ของใบนี้:
        // - ถ้ารู้ WD_Id ให้ใช้เจาะจง, ถ้าไม่รู้ให้อิง WL_No+I_Id (อาจกระทบหลายแถว ถ้ามีหลายดีเทลของชิ้นเดียวกัน)
        if (detailId && Number.isInteger(detailId)) {
          await conn.execute(
            `UPDATE withdraw_detail
               SET WD_Return_Left = ?,
                   WD_After_Return_Amount = ?
             WHERE WD_Id = ? AND WL_No = ?`,
            [amount, afterReturnAmount, detailId, wlno]
          );
        } else {
          await conn.execute(
            `UPDATE withdraw_detail
               SET WD_Return_Left = ?,
                   WD_After_Return_Amount = ?
             WHERE WL_No = ? AND I_Id = ?`,
            [amount, afterReturnAmount, wlno, itemId]
          );
        }
      }

      await conn.execute(
        `UPDATE withdraw_list
            SET WL_Is_Finished = 1,
                WL_Finish_DateTime = CONVERT_TZ(NOW(), '+00:00', '+07:00')
          WHERE WL_No = ?`,
        [wlno]
      );

      await conn.commit();
      await conn.end();
      return NextResponse.json(
        {
          ok: true,
          WL_No: wlno,
          finished: 1,
        },
        { status: 200 }
      );
    } catch (e) {
      await conn.rollback().catch(() => {});
      await conn.end().catch(() => {});
      if (e.message === "withdraw_list_not_found") {
        return NextResponse.json(
          { error: "withdraw_list_not_found" },
          { status: 404 }
        );
      }
      if (String(e.message || "").startsWith("item_not_found")) {
        return NextResponse.json({ error: e.message }, { status: 404 });
      }
      if (
        ["items_required", "invalid_item_id", "invalid_amount"].includes(
          e.message
        )
      ) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      if (e.message === "unauthorized") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (e.message === "forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      console.error("PATCH /api/withdraws/[wlno]/return error:", e);
      return NextResponse.json(
        { error: "return_patch_failed" },
        { status: 500 }
      );
    }
  } catch (e) {
    // อ่าน body ไม่ได้/อื่นๆ
    console.log("+ ERROR ON PATCH!")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}

// ---------- POST: ลงประวัติธุรกรรม ----------
export async function POST(req, { params }) {
  try {
    const session = await authHKorAdmin(req);
    const wlno = Number(params?.wlno);
    if (!Number.isInteger(wlno) || wlno <= 0) {
      return NextResponse.json({ error: "invalid_wlno" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const items = parseItems(body.items);
    const extraNote = (body.note || "").trim();

    const conn = await createConnection();
    try {
      await conn.beginTransaction();

      // ตรวจว่ามีใบจริง
      const [wlRows] = await conn.execute(
        "SELECT WL_No FROM withdraw_list WHERE WL_No = ?",
        [wlno]
      );
      if (!wlRows.length) throw new Error("withdraw_list_not_found");

      // สร้าง TRANSACTION head
      const [trxHead] = await conn.execute(
        "INSERT INTO `transaction` (`T_DateTime`, `T_Note`, `HK_Username`) VALUES (CONVERT_TZ(NOW(), '+00:00', '+07:00'), ?, ?)",
        ["คืนของ", session.sub]
      );
      const T_No = trxHead.insertId;

      // เติมรายละเอียด: ใช้ค่ายอดคงเหลือปัจจุบันหลัง PATCH แล้ว
      for (const it of items) {
        const { itemId, amount } = it;
        const [[after]] = await conn.execute(
          "SELECT I_Quantity FROM item WHERE I_Id = ?",
          [itemId]
        );

        if (!after) throw new Error(`item_not_found:${itemId}`);
        const afterLeft = Number(after.I_Quantity);

        await conn.execute(
          `INSERT INTO transaction_detail
             (TD_Total_Left, TD_Amount_Changed, T_No, I_Id)
           VALUES (?, ?, ?, ?)`,
          [afterLeft, amount, T_No, itemId]
        );
      }

      await conn.commit();
      await conn.end();
      return NextResponse.json(
        { ok: true, WL_No: wlno, T_No },
        { status: 201 }
      );
    } catch (e) {
      await conn.rollback().catch(() => {});
      await conn.end().catch(() => {});
      if (e.message === "withdraw_list_not_found") {
        return NextResponse.json(
          { error: "withdraw_list_not_found" },
          { status: 404 }
        );
      }
      if (String(e.message || "").startsWith("item_not_found")) {
        return NextResponse.json({ error: e.message }, { status: 404 });
      }
      if (
        ["items_required", "invalid_item_id", "invalid_amount"].includes(
          e.message
        )
      ) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      if (e.message === "unauthorized") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (e.message === "forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      console.error("POST /api/withdraws/[wlno]/return error:", e);
      return NextResponse.json(
        { error: "return_post_failed" },
        { status: 500 }
      );
    }
  } catch {
    console.log("/ ERROR ON PATCH!");
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}
