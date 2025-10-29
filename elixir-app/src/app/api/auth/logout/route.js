// src\app\api\auth\logout\route.js

import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { clearSessionCookie, readSession } from "@/lib/auth";

export async function POST(req) {
  const session = await readSession(req);
  const conn = await createConnection();

  if (session?.sub) {
    // ✅ ตั้งค่า Is_Login = 0 เมื่อ logout
    await conn.execute("UPDATE `user` SET Is_Login = 0 WHERE Username = ?", [
      session.sub,
    ]);
  }
  await conn.end();

  // ล้าง cookie
  const cookie = clearSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
