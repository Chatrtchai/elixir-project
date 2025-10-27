// src/app/api/requests/[id]/route.js

import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * สถานะ:
 * Waiting -> (HEAD) -> Approved | Rejected
 * Approved -> (PURCHASE) -> Purchasing
 * Purchasing -> (PURCHASE) -> Received
 * Received -> (HK/PURCHASE) -> Completed   <-- ย้ายอัปเดตสต็อกมาตรงนี้
 */

// GET /api/requests/:id — รายละเอียดคำขอ + รายการย่อย (มี Fullname)
export async function GET(_req, { params }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const conn = await createConnection();
  try {
    const [[header]] = await conn.execute(
      `
      SELECT 
        r.R_No,
        r.R_Status,
        r.R_DateTime,
        r.HK_Username,
        r.H_Username,
        r.PD_Username,
        hk.Fullname AS HK_Fullname,
        h.Fullname  AS H_Fullname,
        pd.Fullname AS PD_Fullname
      FROM Request r
      LEFT JOIN User hk ON hk.Username = r.HK_Username
      LEFT JOIN User h  ON h.Username  = r.H_Username
      LEFT JOIN User pd ON pd.Username = r.PD_Username
      WHERE r.R_No = ?
      `,
      [id]
    );

    if (!header) {
      await conn.end();
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const [details] = await conn.execute(
      `
      SELECT rd.RD_Id, rd.I_Id, it.I_Name, rd.RD_Amount
      FROM Request_Detail rd
      JOIN Item it ON it.I_Id = rd.I_Id
      WHERE rd.R_No = ?
      ORDER BY rd.RD_Id ASC
      `,
      [id]
    );

    await conn.end();
    return NextResponse.json({ ...header, details });
  } catch (e) {
    console.error("GET /api/requests/:id error", e);
    try {
      await conn.end();
    } catch {}
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// PATCH /api/requests/:id
// body: { action: "startPurchasing" | "markReceived" | "markCompleted" }
export async function PATCH(req, { params }) {
  const session = await readSession(req).catch(() => null);
  if (!session?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = String(session.role || "").toUpperCase();
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").toLowerCase();

  // สิทธิ์:
  // - startPurchasing / markReceived: เฉพาะ PURCHASING
  // - markCompleted: อนุญาต HOUSEKEEPER และ PURCHASING
  const isPUR = role.includes("PURCHASING");
  const isHK = role.includes("HOUSEKEEPER");

  if ((action === "startpurchasing" || action === "markreceived") && !isPUR) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (action === "markcompleted" && !(isHK || isPUR)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const conn = await createConnection();
  try {
    await conn.beginTransaction();

    const [[cur]] = await conn.execute(
      `SELECT R_No, R_Status FROM Request WHERE R_No = ? FOR UPDATE`,
      [id]
    );
    if (!cur) {
      await conn.rollback();
      await conn.end();
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    let nextStatus = null;
    let note = "";

    if (action === "startpurchasing") {
      if (cur.R_Status !== "Approved" && cur.R_Status !== "Accepted") {
        await conn.rollback();
        await conn.end();
        return NextResponse.json(
          { error: `invalid transition ${cur.R_Status} -> Purchasing` },
          { status: 409 }
        );
      }
      nextStatus = "Purchasing";
      note = "ฝ่ายจัดซื้อเริ่มดำเนินการจัดซื้อ";

      // อัปเดตสถานะ + ผูก PD_Username ให้ผู้กด (PURCHASING)
      await conn.execute(
        `UPDATE Request SET R_Status=?, PD_Username=?, R_LastModified=NOW() WHERE R_No=?`,
        [nextStatus, session.sub, id]
      );
    } else if (action === "markreceived") {
      if (cur.R_Status !== "Purchasing") {
        await conn.rollback();
        await conn.end();
        return NextResponse.json(
          { error: `invalid transition ${cur.R_Status} -> Received` },
          { status: 409 }
        );
      }
      nextStatus = "Received";
      note = "ฝ่ายจัดซื้อยืนยันได้รับของแล้ว";

      await conn.execute(
        `UPDATE Request SET R_Status=?, PD_Username=COALESCE(PD_Username, ?), R_LastModified=NOW() WHERE R_No=?`,
        [nextStatus, session.sub, id]
      );
    } else if (action === "markcompleted") {
      if (cur.R_Status !== "Received") {
        await conn.rollback();
        await conn.end();
        return NextResponse.json(
          { error: `invalid transition ${cur.R_Status} -> Completed` },
          { status: 409 }
        );
      }
      nextStatus = "Completed";
      note = isHK
        ? "แม่บ้านยืนยันเสร็จสิ้น รับของเข้าคลังแล้ว"
        : "ฝ่ายจัดซื้อยืนยันเสร็จสิ้น รับของเข้าคลังแล้ว";

      // อัปเดตสถานะ (ไม่แก้ PD_Username ที่บันทึกไว้ก่อนหน้า)
      await conn.execute(
        `UPDATE Request SET R_Status=?, R_LastModified=NOW() WHERE R_No=?`,
        [nextStatus, id]
      );

      // อัปเดตสต็อกเมื่อเสร็จสิ้น (ย้ายจาก Received มาไว้ที่นี่)
      const [details] = await conn.execute(
        `SELECT I_Id, RD_Amount FROM Request_Detail WHERE R_No=?`,
        [id]
      );
      for (const d of details) {
        await conn.execute(
          `UPDATE Item SET I_Quantity = I_Quantity + ? WHERE I_Id = ?`,
          [d.RD_Amount, d.I_Id]
        );
      }
    } else {
      await conn.rollback();
      await conn.end();
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    // บันทึกประวัติ
    await conn.execute(
      `INSERT INTO Request_Transaction (RT_DateTime, RT_Note, R_No, Username)
       VALUES (NOW(), ?, ?, ?)`,
      [note, id, session.sub]
    );

    await conn.commit();
    await conn.end();
    return NextResponse.json({ ok: true, R_No: id, R_Status: nextStatus });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    try {
      await conn.end();
    } catch {}
    console.error("PATCH /api/requests/:id error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
