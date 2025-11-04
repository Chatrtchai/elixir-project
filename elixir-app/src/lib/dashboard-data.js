// src/lib/dashboard-data.js

import { createConnection } from "@/lib/db";

async function withConnection(callback) {
  const conn = await createConnection();
  try {
    return await callback(conn);
  } finally {
    try {
      conn.release();
    } catch {}
  }
}

export async function getTransactionLogs(type = "transaction") {
  const normalized = String(type || "").toLowerCase();

  return withConnection(async (conn) => {
    let sql;

    if (normalized === "transaction") {
      sql = `
        SELECT
          CAST(t.T_No AS CHAR) AS id,
          t.T_DateTime         AS datetime,
          t.T_Note             AS note,
          u.Fullname           AS actor
        FROM transaction t
        JOIN user u ON u.Username = t.HK_Username
        ORDER BY datetime DESC
      `;
    } else if (normalized === "request_transaction") {
      sql = `
        SELECT
          CAST(rt.RT_No AS CHAR) AS id,
          rt.RT_DateTime         AS datetime,
          rt.RT_Note             AS note,
          u.Fullname             AS actor
        FROM request_transaction rt
        JOIN user u ON u.Username = rt.Username
        ORDER BY datetime DESC
      `;
    } else {
      sql = `
        SELECT id, datetime, note, actor FROM (
          SELECT
            CAST(t.T_No AS CHAR) AS id,
            t.T_DateTime         AS datetime,
            t.T_Note             AS note,
            u.Fullname           AS actor
          FROM transaction t
          JOIN user u ON u.Username = t.HK_Username

          UNION ALL

          SELECT
            CAST(rt.RT_No AS CHAR) AS id,
            rt.RT_DateTime         AS datetime,
            rt.RT_Note             AS note,
            u.Fullname             AS actor
          FROM request_transaction rt
          JOIN user u ON u.Username = rt.Username
        ) AS all_logs
        ORDER BY datetime DESC
      `;
    }

    const [rows] = await conn.execute(sql);
    return rows;
  });
}

export async function getTransactionLogDetail(id, type = "transaction") {
  const normalized = String(type || "").toLowerCase();
  const targetType = normalized === "request_transaction" ? "request_transaction" : "transaction";

  return withConnection(async (conn) => {
    let headerSql;
    const params = [id];

    if (targetType === "request_transaction") {
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

    const [headerRows] = await conn.execute(headerSql, params);
    const header = headerRows?.[0];
    if (!header) {
      return null;
    }

    if (header.type === "request_transaction") {
      const detail = {
        id: header.id,
        datetime: header.datetime,
        note: header.note,
        actor: header.actor,
        type: header.type,
        lines: [
          {
            RT_No: header.id,
            RT_DateTime: header.datetime,
            RT_Note: header.note ?? null,
            R_No: header.R_No ?? null,
            Username: header.Username ?? null,
          },
        ],
        rd_lines: [],
      };

      if (header.R_No) {
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

        detail.rd_lines = (rows || []).map((row) => ({
          RD_Id: row.RD_Id,
          I_Id: row.I_Id,
          I_Name: row.I_Name,
          RD_Amount: row.RD_Amount,
        }));
      }

      return detail;
    }

    const [lineRows] = await conn.execute(
      `
        SELECT
          td.TD_Id             AS TD_Id,
          td.TD_Total_Left     AS TD_Total_Left,
          td.TD_Amount_Changed AS TD_Amount_Changed,
          td.I_Id              AS I_Id,
          it.I_Name            AS I_Name,
          td.T_No              AS T_No
        FROM transaction_detail td
        JOIN item it ON it.I_Id = td.I_Id
        WHERE td.T_No = ?
        ORDER BY td.TD_Id ASC
      `,
      [id]
    );

    return {
      id: header.id,
      datetime: header.datetime,
      note: header.note,
      actor: header.actor,
      type: header.type,
      lines: (lineRows || []).map((row) => ({
        TD_Id: row.TD_Id,
        TD_Total_Left: row.TD_Total_Left,
        TD_Amount_Changed: row.TD_Amount_Changed,
        I_Id: row.I_Id,
        I_Name: row.I_Name,
        T_No: row.T_No,
      })),
      rd_lines: [],
    };
  });
}

export async function getInventoryItems(keyword = "") {
  const q = String(keyword || "").trim();

  return withConnection(async (conn) => {
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
    return rows;
  });
}

export async function getUsersList({ keyword = "", excludeUsername = "" } = {}) {
  const q = String(keyword || "").trim();
  const exclude = String(excludeUsername || "").trim();

  return withConnection(async (conn) => {
    const wh = [];
    const args = [];

    if (exclude) {
      wh.push("Username <> ?");
      args.push(exclude);
    }

    if (q) {
      wh.push("(Username LIKE ? OR Fullname LIKE ?)");
      args.push(`%${q}%`, `%${q}%`);
    }

    const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
    const [rows] = await conn.execute(
      `
      SELECT Username, Fullname, Role, Is_Login
      FROM user
      ${where}
      ORDER BY Fullname ASC
      `,
      args
    );

    return rows;
  });
}
