"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);

  const fetchUsers = async () => {
    const res = await fetch(
      "/api/users" + (q ? `?q=${encodeURIComponent(q)}` : "")
    );
    if (!res.ok) return; // จะเพิ่ม toast/error ก็ได้
    const data = await res.json();
    setRows(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color-primary]">
            จัดการบัญชีผู้ใช้งาน
          </h1>
        </div>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-3 py-2 text-sm font-semibold"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#fff"
          >
            <path d="M720-400v-120H600v-80h120v-120h80v120h120v80H800v120h-80Zm-360-80q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Z" />
          </svg>
          เพิ่มบัญชีผู้ใช้งาน
        </Link>
      </header>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาจากชื่อผู้ใช้ / ชื่อจริง"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        <button
          onClick={fetchUsers}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          ค้นหา
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
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
                  {r.Is_Login ? "ใข้งานอยู่" : "ไม่ได้ใช้งาน"}
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
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
