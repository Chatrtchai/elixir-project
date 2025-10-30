// src\app\(dashboard)\admin\users\new\page.js

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function NewUserModal() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "ADMIN",
  });
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "บันทึกไม่สำเร็จ");
    router.back();
    router.refresh();
  };

  return (
    <ModalWrapper title="เพิ่มบัญชีผู้ใช้งาน" width={"w-[600px]"}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            ชื่อผู้ใช้ (ภาษาอังกฤษ)
          </label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            รหัสผ่าน (เริ่มต้น)
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ-สกุล</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">บทบาท</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="HEAD">หัวหน้า</option>
            <option value="HOUSEKEEPER">พนักงานทำความสะอาด</option>
            <option value="PURCHASING DEPARTMENT">พนักงานแผนกจัดซื้อ</option>
          </select>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] text-white px-4 py-2 hover:bg-[var(--color-primary-dark)] cursor-pointer"
          >
            บันทึก
          </button>
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
