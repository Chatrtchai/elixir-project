// src/lib/auth.js

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "session";
const getSecret = () =>
  new TextEncoder().encode((process.env.APP_SECRET || "").trim());

export async function createSession({ sub, name, role }) {
  const token = await new SignJWT({ sub, name, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
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
  } catch {
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
