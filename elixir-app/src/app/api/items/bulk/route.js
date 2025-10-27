// src/app/api/items/bulk/route.js
import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createConnection } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // กัน cache บน route handlers

/** ---------- helpers ---------- */
const isIntStr = (v) => /^-?\d+$/.test(String(v).trim());

function normalizeItem(x) {
  const I_Id = Number(x?.I_Id);
  const qtyStr = String(x?.I_Quantity ?? "");
  const I_Quantity = isIntStr(qtyStr) ? parseInt(qtyStr, 10) : NaN;

  const errors = {};
  if (!Number.isInteger(I_Id) || I_Id <= 0)
    errors.I_Id = "I_Id ต้องเป็นจำนวนเต็มบวก";
  if (!Number.isInteger(I_Quantity) || I_Quantity < 0)
    errors.I_Quantity = "จำนวนต้องเป็นจำนวนเต็มและไม่น้อยกว่า 0";

  return {
    ok: Object.keys(errors).length === 0,
    value: { I_Id, I_Quantity },
    errors,
  };
}

function sanitizeNote(s) {
  const note = (s ?? "").toString().trim();
  if (!note)
    return { ok: false, message: "กรุณากรอก Note สำหรับการอัปเดตรอบนี้" };
  if (note.length < 3)
    return { ok: false, message: "Note สั้นเกินไป (อย่างน้อย 3 ตัวอักษร)" };
  if (note.length > 500)
    return { ok: false, message: "Note ยาวเกินไป (จำกัด 500 ตัวอักษร)" };
  return { ok: true, note };
}

/** ---------- PUT /api/items/bulk ---------- */
export async function PUT(req) {
  // อ่าน session จากคุกกี้ของคำขอนี้
  const session = await readSession(req); // { sub, name, role } | null
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // จำกัดสิทธิ์ไว้เฉพาะบทบาทที่เหมาะสม
  const allowed = new Set(["HOUSEKEEPER", "ADMIN"]);
  if (!allowed.has(String(session.role || ""))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let conn;
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const noteCheck = sanitizeNote(body?.note);

    if (!items.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }
    if (!noteCheck.ok) {
      return NextResponse.json(
        { error: "Validation failed", details: { note: noteCheck.message } },
        { status: 422 }
      );
    }
    const note = noteCheck.note;

    // validate items
    const normalized = items.map(normalizeItem);
    const invalid = normalized.filter((x) => !x.ok);
    if (invalid.length) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: invalid.map((x, i) => ({ index: i, errors: x.errors })),
        },
        { status: 422 }
      );
    }

    // ใช้การเชื่อมต่อแบบเดียวกับไฟล์ของคุณ (DATABASE_* envs)
    conn = await createConnection();

    // เริ่ม Transaction
    await conn.beginTransaction();

    // 1) lock แถวที่จะอัปเดต + อ่านจำนวนปัจจุบัน
    const ids = normalized.map((n) => n.value.I_Id);
    const placeholders = ids.map(() => "?").join(",");
    const [currentRows] = await conn.query(
      `SELECT I_Id, I_Quantity FROM item WHERE I_Id IN (${placeholders}) FOR UPDATE`,
      ids
    );

    const currentMap = new Map();
    for (const r of currentRows)
      currentMap.set(Number(r.I_Id), Number(r.I_Quantity ?? 0));

    const missing = ids.filter((id) => !currentMap.has(id));
    if (missing.length) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Some items not found", missing },
        { status: 404 }
      );
    }

    // 2) บันทึกหัวธุรกรรม (ใช้ backticks กันคำสงวน)
    // ปรับชื่อคอลัมน์ให้ตรง schema จริงของคุณถ้าต่าง
    const [txRes] = await conn.execute(
      "INSERT INTO `transaction` (T_Time, T_Note, HK_Username) VALUES (NOW(), ?, ?)",
      [note, session.name || "UNKNOWN"]
    );
    const T_No = txRes.insertId;

    // 3) อัปเดต item + บันทึกรายการย่อยของธุรกรรม
    const updateSql = "UPDATE item SET I_Quantity = ? WHERE I_Id = ?";
    const insertDetailSql = `
      INSERT INTO transaction_detail (TD_Amount_Changed, TD_Total_Left, T_No, I_Id)
      VALUES (?, ?, ?, ?)
    `;

    const details = [];
    for (const { value } of normalized) {
      const cur = currentMap.get(value.I_Id);
      const next = value.I_Quantity;
      const delta = Number(next) - Number(cur);

      const [uRes] = await conn.execute(updateSql, [next, value.I_Id]);
      await conn.execute(insertDetailSql, [delta, next, T_No, value.I_Id]);

      details.push({
        I_Id: value.I_Id,
        prev: cur,
        next,
        delta,
        affected: uRes.affectedRows,
      });
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      transaction: { T_No, note, hkUsername: session.name },
      updated: details.length,
      updatedIds: details.map((d) => d.I_Id),
      details,
    });
  } catch (e) {
    try {
      if (conn) await conn.rollback();
    } catch {}
    console.error("PUT /api/items/bulk error:", e);
    return NextResponse.json(
      { error: "Internal Server Error", message: e?.message ?? "unknown" },
      { status: 500 }
    );
  } finally {
    try {
      if (conn) await conn.end();
    } catch {}
  }
}
