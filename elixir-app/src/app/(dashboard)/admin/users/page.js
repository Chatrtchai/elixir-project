// src/app/(dashboard)/admin/users/page.js

import Link from "next/link";
import { cookies } from "next/headers";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import UsersSearchInput from "@/components/dashboard/UsersSearchInput";
import { getUsersList } from "@/lib/dashboard-data";
import { readSession } from "@/lib/auth";

const ROLE_LABELS = {
  HEAD: "หัวหน้า",
  HOUSEKEEPER: "พนักงานทำความสะอาด",
  ADMIN: "ผู้ดูแลระบบ",
  "PURCHASING DEPARTMENT": "พนักงานแผนกจัดซื้อ",
};

export const revalidate = 30;

export default async function AdminUsersPage({ searchParams }) {
  const q = String(searchParams?.q || "").trim();
  const session = await readSession({ cookies: cookies() });
  const excludeUsername = session?.sub || "";
  const rows = await getUsersList({ keyword: q, excludeUsername });

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

      <div className="flex gap-2">
        <UsersSearchInput
          initialValue={q}
          placeholder="ค้นหาจากชื่อผู้ใช้ / ชื่อจริง"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

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
                <td className="px-4 py-2">{ROLE_LABELS[r.Role] || ""}</td>
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
