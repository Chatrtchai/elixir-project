// src/app/api/transactions/[id]/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET(req, { params }) {
  const session = await readSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "transaction").toLowerCase();

  const conn = await createConnection();
  try {
    // ---------- 1) Header ----------
    let headerSql = "";
    let headerParams = [id];

    if (type === "request_transaction") {
      headerSql = `
        SELECT 
          CAST(rt.RT_No AS CHAR)  AS id,
          rt.RT_DateTime          AS datetime,
          rt.RT_Note              AS note,
          u.Fullname              AS actor,
          rt.R_No                 AS R_No,
          rt.Username             AS Username,
          'request_transaction'   AS type
        FROM request_transaction rt
        LEFT JOIN user u ON u.Username = rt.Username
        WHERE rt.RT_No = ?
        LIMIT 1
      `;
    } else {
      headerSql = `
        SELECT 
          CAST(t.T_No AS CHAR)    AS id,
          t.T_DateTime            AS datetime,
          t.T_Note                AS note,
          u.Fullname              AS actor,
          'transaction'           AS type
        FROM transaction t
        LEFT JOIN user u ON u.Username = t.HK_Username
        WHERE t.T_No = ?
        LIMIT 1
      `;
    }

    const [headerRows] = await conn.execute(headerSql, headerParams);
    const header = headerRows?.[0];

    if (!header) {
      await conn.end();
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // ---------- 2) Lines ----------
    let lines = [];
    let rd_lines = []; // ✅ บรรทัดจาก REQUEST_DETAIL

    if (header.type === "request_transaction") {
      // คงรูปแบบเดิมของ lines (แถวเดียว: RT_*)
      lines = [
        {
          RT_No: header.id,
          RT_DateTime: header.datetime,
          RT_Note: header.note ?? null,
          R_No: header.R_No ?? null,
          Username: header.Username ?? null,
        },
      ];

      // ✅ เพิ่มรายละเอียด REQUEST_DETAIL
      const [rows] = await conn.execute(
        `
          SELECT 
            rd.RD_Id,
            rd.I_Id,
            it.I_Name,
            rd.RD_Amount
          FROM request_detail rd
          JOIN item it ON it.I_Id = rd.I_Id
          WHERE rd.R_No = ?
          ORDER BY rd.RD_Id ASC
        `,
        [header.R_No]
      );

      rd_lines = (rows || []).map((r) => ({
        RD_Id: r.RD_Id,
        I_Id: r.I_Id,
        I_Name: r.I_Name,
        RD_Amount: r.RD_Amount,
      }));
    } else {
      // transaction_detail (เหมือนเดิม)
      const [lineRows] = await conn.execute(
        `
          SELECT
            td.TD_Id                AS TD_Id,
            td.TD_Total_Left        AS TD_Total_Left,
            td.TD_Amount_Changed    AS TD_Amount_Changed,
            td.I_Id                 AS I_Id,
            it.I_Name               AS I_Name,
            td.T_No                 AS T_No
          FROM transaction_detail td
          JOIN item it ON it.I_Id = td.I_Id
          WHERE td.T_No = ?
          ORDER BY td.TD_Id ASC
        `,
        [id]
      );

      lines = (lineRows || []).map((r) => ({
        TD_Id: r.TD_Id,
        TD_Total_Left: r.TD_Total_Left,
        TD_Amount_Changed: r.TD_Amount_Changed,
        I_Id: r.I_Id,
        I_Name: r.I_Name,
        T_No: r.T_No,
      }));
    }

    const payload = {
      id: header.id,
      datetime: header.datetime,
      note: header.note,
      actor: header.actor,
      type: header.type,
      lines, // ⬅️ คงไว้เหมือนเดิม (RT_* หรือ TD_*)
      rd_lines, // ⬅️ เพิ่มบรรทัดจาก REQUEST_DETAIL (มีเมื่อ type=request_transaction)
    };

    await conn.end();
    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/transactions/[id] error:", e);
    await conn.end().catch(() => {});
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
