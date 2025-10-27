// src\app\api\withdraws\[wlno]\route.js

import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";

export async function GET(_req, { params }) {
  const wlno = Number(params.wlno);
  if (!Number.isFinite(wlno)) {
    return NextResponse.json({ error: "bad wlno" }, { status: 400 });
  }

  const conn = await createConnection();
  try {
    const [[head]] = await conn.execute(
      `SELECT WL_No, WL_Is_Finished, WL_DateTime, WL_Finish_DateTime, HK_Username
       FROM withdraw_list
       WHERE WL_No = ? LIMIT 1`,
      [wlno]
    );
    if (!head)
      return NextResponse.json({ error: "not found" }, { status: 404 });

    const [details] = await conn.execute(
      `SELECT
          wd.WD_Id,
          wd.I_Id,
          it.I_Name,
          wd.WD_Amount,
          wd.WD_Amount_Left,
          wd.WD_Return_Left,
          wd.WD_After_Return_Amount
       FROM withdraw_detail wd
       JOIN item it ON it.I_Id = wd.I_Id
       WHERE wd.WL_No = ?
       ORDER BY wd.WD_Id ASC`,
      [wlno]
    );

    return NextResponse.json({ ...head, details });
  } catch (e) {
    console.error("GET /api/withdraws/:wlno", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
