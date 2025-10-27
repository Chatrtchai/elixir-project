// src/app/api/auth/session/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET(req) {
  try {
    const s = await readSession(req);
    if (!s) {
      return NextResponse.json({ loggedIn: false }, { status: 401 });
    }

    const conn = await createConnection();
    const [[user]] = await conn.execute(
      "SELECT Username, Fullname, Role, Is_Login FROM `user` WHERE Username = ? LIMIT 1",
      [s.sub]
    );
    await conn.end();

    // ใช้ Is_Login จากฐานข้อมูลเป็นตัวชี้วัดความ active
    if (!user || !user.Is_Login) {
      return NextResponse.json({ loggedIn: false }, { status: 401 });
    }

    return NextResponse.json({
      loggedIn: true,
      user: { username: user.Username, name: user.Fullname, role: user.Role },
    });
  } catch (e) {
    console.error("/api/auth/session", e);
    return NextResponse.json(
      { loggedIn: false, error: "server error" },
      { status: 500 }
    );
  }
}
