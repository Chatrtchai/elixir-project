// src/lib/auth.js

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createConnection } from "@/lib/db";

const COOKIE = "session";
const getSecret = () =>
  new TextEncoder().encode((process.env.APP_SECRET || "").trim());

export async function createSession({ sub, name, role }) {
  const token = await new SignJWT({ sub, name, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
  return {
    name: COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure: true // เปิดเมื่ออยู่โปรดักชัน (https)
    },
  };
}

export async function readSession(req) {
  const store = "cookies" in req ? req.cookies : cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { sub: payload.sub, name: payload.name, role: payload.role };
  } catch (e) {
    // token หมดอายุหรือ verify ไม่ผ่าน
    let sub = null;
    try {
      const decoded = decodeJwt(token);
      sub = decoded?.sub || null;
    } catch {}

    // เคลียร์ cookie
    const clearCookie = clearSessionCookie();
    store.set(clearCookie.name, clearCookie.value, clearCookie.options);

    // ถ้ารู้ username → อัปเดต Is_Login = 0
    if (sub) {
      let conn;
      try {
        conn = await createConnection();
        await conn.execute(
          "UPDATE `user` SET Is_Login = 0 WHERE Username = ?",
          [sub]
        );
      } catch (err) {
        console.error("Failed to auto logout user:", err);
      } finally {
        if (conn) {
          try {
            conn.release();
          } catch {}
        }
      }
    }
    return null;
  }
}

export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: "",
    options: { httpOnly: true, path: "/", maxAge: 0 },
  };
}
