"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/"); // หลังล็อกอินพาไปแดชบอร์ดหลัก
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      {/* ซ้าย: ภาพรีสอร์ต */}
      <div className="hidden md:block relative">
        {/* ใส่รูปของคุณเองที่ public/login.jpg */}
        <Image
          src="/login.jpg"
          alt="resort"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* ขวา: ฟอร์ม */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            {/* โลโก้ */}
            <Image src="/logo-color.png" alt="logo" width={128} height={128} />
            <h1 className="mt-4 text-4xl font-bold text-primary">
              ระบบจัดการเบิกของ
            </h1>
            <p className="text-sm text-gray-500">Elixir Resort Koh Yao Yai</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                ชื่อผู้ใช้งาน
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="กรอกชื่อผู้ใช้งาน"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 
                 text-gray-800 placeholder:text-gray-400 
                 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary] 
                 transition-all duration-150"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="กรอกรหัสผ่าน"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 
                 text-gray-800 placeholder:text-gray-400 
                 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary] 
                 transition-all duration-150"
                required
              />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary hover:bg-primary-dark cursor-pointer text-white py-2 font-medium disabled:opacity-50"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
            <span>เฉพาะผู้ใช้งานที่ได้รับอนุญาตเท่านั้น</span>
            <span>version 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
