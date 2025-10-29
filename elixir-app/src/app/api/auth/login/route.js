// src\app\api\auth\login\route.js

import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req) {
  const { username, password } = await req.json();
  const conn = await createConnection();

  try {
    await conn.beginTransaction();

    // 🔒 ล็อคแถว user ป้องกัน race condition ตอนอัปเกรด hash/อัปเดต Is_Login
    const [[user]] = await conn.execute(
      "SELECT Username, Fullname, Password, Role, Is_Login FROM `user` WHERE Username=? FOR UPDATE",
      [username]
    );
    if (!user) {
      await conn.rollback();
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // ถ้าคนนี้กำลังล็อกอินอยู่แล้ว -> กันการล็อกอินซ้ำ
    if (Number(user.Is_Login) === 1) {
      // ถ้าต้องการโหมดบังคับ สามารถปลดคอมเมนต์โค้ดด้านล่าง
      // if (force) {
      //   await conn.execute("UPDATE `user` SET Is_Login = 0 WHERE Username = ?", [username]);
      // } else {
      await conn.rollback();
      return NextResponse.json(
        { error: "บัญชีนี้กำลังใช้งานอยู่" },
        { status: 409 }
      );
      // }
    }

    const stored = String(user.Password || "");
    const isHashed =
      stored.startsWith("$2a$") ||
      stored.startsWith("$2b$") ||
      stored.startsWith("$2y$");

    let ok = false;
    if (isHashed) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // first-login migration: เปรียบเทียบ plaintext ครั้งแรก
      ok = password === stored;
      if (ok) {
        const newHash = await bcrypt.hash(password, 10);
        await conn.execute(
          "UPDATE `user` SET Password = ? WHERE Username = ?",
          [newHash, username]
        );
      }
    }

    if (!ok) {
      await conn.rollback();
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // ตั้งสถานะล็อกอิน
    await conn.execute("UPDATE `user` SET Is_Login = 1 WHERE Username = ?", [
      username,
    ]);

    await conn.commit();

    // ออก session cookie
    const cookie = await createSession({
      sub: user.Username,
      name: user.Fullname,
      role: user.Role,
    });
    const res = NextResponse.json({ ok: true, role: user.Role });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e) {
    console.error("POST /api/auth/login", e);
    try {
      await conn.rollback();
    } catch {}
    return NextResponse.json({ error: "server error" }, { status: 500 });
  } finally {
    await conn.end();
  }
}
