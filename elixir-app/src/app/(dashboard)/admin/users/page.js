// src/app/(dashboard)/admin/users/page.js
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);

  const abortRef = useRef(null);

  // ✅ ดึง session ของผู้ใช้ปัจจุบัน
  const getCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user || null;
    } catch {
      return null;
    }
  };

  // ✅ โหลดข้อมูลผู้ใช้ทั้งหมด ยกเว้นตัวเอง
  const fetchUsers = async (keyword = "") => {
    try {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      const res = await fetch(
        "/api/users" + (keyword ? `?q=${encodeURIComponent(keyword)}` : ""),
        { signal: controller.signal, cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();

      // กรองไม่ให้แสดง user ของตัวเอง
      const filtered = me
        ? data.filter((u) => u.Username !== me.username)
        : data;

      setRows(filtered);
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // โหลด session ปัจจุบัน
  useEffect(() => {
    getCurrentUser().then((user) => setMe(user));
  }, []);

  // โหลดผู้ใช้ทั้งหมดหลังรู้ว่าเราเป็นใคร
  useEffect(() => {
    if (me) fetchUsers();
  }, [me]);

  // ค้นหาอัตโนมัติขณะพิมพ์ (debounce 300ms)
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => {
      fetchUsers(q.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [q, me]);

  return (
    <div className="p-6 space-y-6">
      <DashboardPageHeader
        title="จัดการบัญชีผู้ใช้งาน"
        description="เพิ่ม แก้ไข หรือตรวจสอบข้อมูลผู้ใช้งาน"
        actions={
          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-3 py-2 text-sm transition"
          >
            เพิ่มบัญชีผู้ใช้งาน
          </Link>
        }
      />

      {/* 🔍 ช่องค้นหา */}
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาจากชื่อผู้ใช้ / ชื่อจริง"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* 🧾 ตารางผู้ใช้ */}
      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2">ชื่อผู้ใช้</th>
              <th className="text-left px-4 py-2">ชื่อ-สกุล</th>
              <th className="text-left px-4 py-2">บทบาท</th>
              <th className="text-left px-4 py-2">สถานะ</th>
              <th className="text-center px-4 py-2">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.Username} className="border-t">
                <td className="px-4 py-2">{r.Username}</td>
                <td className="px-4 py-2">{r.Fullname}</td>
                <td className="px-4 py-2">
                  {r?.Role === "HEAD"
                    ? "หัวหน้า"
                    : r?.Role === "HOUSEKEEPER"
                    ? "พนักงานทำความสะอาด"
                    : r?.Role === "ADMIN"
                    ? "ผู้ดูแลระบบ"
                    : r?.Role === "PURCHASING DEPARTMENT"
                    ? "พนักงานแผนกจัดซื้อ"
                    : ""}
                </td>
                <td className="px-4 py-2">
                  {r.Is_Login ? "ใช้งานอยู่" : "ไม่ได้ใช้งาน"}
                </td>
                <td className="px-4 py-2 text-center space-x-2">
                  <Link
                    href={`/admin/users/${encodeURIComponent(r.Username)}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    รายละเอียด
                  </Link>
                  <Link
                    href={`/admin/users/${encodeURIComponent(r.Username)}/edit`}
                    className="text-gray-600 hover:underline"
                  >
                    แก้ไขข้อมูล
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {loading ? "กำลังค้นหา..." : "ไม่พบข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
