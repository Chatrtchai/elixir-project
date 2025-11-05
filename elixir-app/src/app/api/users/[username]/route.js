// /app/api/users/[username]/route.js
import { NextResponse } from "next/server";
import { createConnection } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// helper: ส่ง error เป็น JSON เสมอ
const jsonError = (message, status = 500) =>
  NextResponse.json({ message }, { status });

export async function GET(_req, { params }) {
  const username = params?.username;
  if (!username) return jsonError("Missing username param", 400);

  let conn;
  try {
    conn = await createConnection();
    const [rows] = await conn.execute(
      "SELECT Username, Fullname, Role, Is_Login FROM `user` WHERE Username=? LIMIT 1",
      [username]
    );

    if (!rows || !rows[0]) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]); // ✅ ตอบเป็น JSON เสมอ
  } catch (e) {
    console.error("GET /users/[username] error:", e);
    return jsonError("Internal Server Error", 500);
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch {}
    }
  }
}

export async function PATCH(req, { params }) {
  const currentUsername = params?.username; // จาก URL
  if (!currentUsername) return jsonError("Missing username param", 400);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  let conn;
  try {
    const set = [];
    const values = [];

    // Fullname
    const nextFullname = body?.Fullname ?? body?.fullName;
    if (nextFullname !== undefined) {
      set.push("Fullname=?");
      values.push(nextFullname);
    }

    // Role
    const nextRole = body?.Role ?? body?.role;
    if (nextRole !== undefined) {
      set.push("Role=?");
      values.push(nextRole);
    }

    // Password
    if (body?.password !== undefined) {
      const isHash =
        typeof body.password === "string" && body.password.startsWith("$2");
      const hash = isHash
        ? body.password
        : await bcrypt.hash(String(body.password), 10);
      set.push("Password=?");
      values.push(hash);
    }

    // isLogin
    if (body?.isLogin !== undefined) {
      const isLoginNum = Number(body.isLogin ? 1 : 0);
      set.push("Is_Login=?");
      values.push(isLoginNum);
    }

    if (!set.length) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    // ✅ ใช้ currentUsername ใน WHERE
    conn = await createConnection();
    const sql = `UPDATE \`user\` SET ${set.join(", ")} WHERE Username=?`;
    values.push(currentUsername);
    const [res] = await conn.execute(sql, values);

    if (!res?.affectedRows) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await Promise.all([
      revalidatePath("/admin/users"),
      revalidatePath(`/admin/users/${currentUsername}`),
      revalidatePath(`/admin/users/${currentUsername}/edit`),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code == "ER_DUP_ENTRY") {
      return jsonError("มีชื่อผู้ใช้งานนี้อยู่ในระบบแล้ว", 409);
    }
    console.error("PATCH /users/[username] error:", e);
    return jsonError("Internal Server Error", 500);
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch {}
    }
  }
}

export async function DELETE(_req, { params }) {
  const username = params?.username;
  if (!username) return jsonError("Missing username param", 400);

  let conn;
  try {
    conn = await createConnection();
    const [res] = await conn.execute("DELETE FROM `user` WHERE Username=?", [
      username,
    ]);

    if (!res?.affectedRows) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    await Promise.all([
      revalidatePath("/admin/users"),
      revalidatePath(`/admin/users/${username}`),
      revalidatePath(`/admin/users/${username}/edit`),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /users/[username] error:", e);
    return jsonError("Internal Server Error", 500);
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch {}
    }
  }
}
