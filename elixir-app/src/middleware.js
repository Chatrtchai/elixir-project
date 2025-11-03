// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

const ROLE_HOME = {
  ADMIN: "/admin/users",
  HEAD: "/head/requests",
  HOUSEKEEPER: "/housekeeper/inventory",
  "PURCHASING DEPARTMENT": "/purchase/requests",
};

const ROLE_ALLOWED_PREFIX = {
  ADMIN: ["/admin"],
  HEAD: ["/head"],
  HOUSEKEEPER: ["/housekeeper"],
  "PURCHASING DEPARTMENT": ["/purchase"],
};

function startsWithAny(pathname, prefixes) {
  return prefixes.some((p) => pathname.startsWith(p));
}

async function readSessionFromCookie(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const secretStr = (process.env.APP_SECRET || "").trim();
  if (secretStr.length < 32) return null;
  const secret = new TextEncoder().encode(secretStr);

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      username: String(payload.sub || ""),
      role: String(payload.role || ""),
      name: String(payload.name || ""),
    };
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // ✅ ปล่อยไฟล์ static ผ่าน
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ✅ ปล่อย API auth ผ่าน (กัน redirect → HTML)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  // (ถ้าต้องการปล่อยทั้ง /api/ ก็ใช้ if (pathname.startsWith('/api')) return NextResponse.next();)

  const session = await readSessionFromCookie(req);

  // root
  if (pathname === "/") {
    if (session?.role) {
      const home = ROLE_HOME[session.role] || "/";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // login
  if (pathname === "/login") {
    if (session?.role) {
      const home = ROLE_HOME[session.role] || "/";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // โซนที่ต้องล็อกอิน (ใช้พาธจริง ไม่มี route group)
  const isProtected = ["/admin", "/head", "/housekeeper", "/purchase"].some(
    (p) => pathname.startsWith(p)
  );

  if (isProtected && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  if (isProtected && session?.role) {
    const allowed = startsWithAny(
      pathname,
      ROLE_ALLOWED_PREFIX[session.role] ?? []
    );
    if (!allowed) {
      const home = ROLE_HOME[session.role] || "/";
      return NextResponse.redirect(new URL(home, req.url));
    }
  }

  return NextResponse.next();
}

// ใช้ URL จริงใน matcher (ไม่มีวงเล็บ)
export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/head/:path*",
    "/housekeeper/:path*",
    "/purchase/:path*",
    // ไม่ใส่ /api/... เพื่อหลีกเลี่ยงการ redirect API responses
  ],
};
