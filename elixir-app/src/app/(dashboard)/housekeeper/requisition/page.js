// src\app\(dashboard)\housekeeper\requisition\page.js

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HKRequisitionPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (searchText = "") => {
    try {
      setLoading(true);
      const u = new URL("/api/withdraws", window.location.origin);
      if (searchText) u.searchParams.set("q", searchText);
      const res = await fetch(u.toString(), { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch withdraws:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลครั้งแรก
  useEffect(() => {
    fetchData();
  }, []);

  // ✅ ค้นหาอัตโนมัติเมื่อพิมพ์ (หน่วง 300ms เพื่อไม่ให้ยิง API ถี่เกินไป)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            รายการเบิกของ
          </h1>
          <p className="text-sm text-gray-500">
            สร้างใบเบิกของ ดูรายละเอียด และคืนของ
          </p>
        </div>
        <Link
          href="/housekeeper/requisition/new"
          className="rounded-lg bg-[var(--color-primary)] text-white px-4 py-2 hover:bg-[var(--color-primary-dark)] text-center transition"
        >
          + สร้างใบเบิกของ
        </Link>
      </header>

      {/* Search */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาเลขที่ใบเบิก / รายการ"
          className="flex-1 min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2">เลขที่ใบเบิก</th>
              <th className="text-left px-4 py-2">วันที่เบิก</th>
              <th className="text-left px-4 py-2">วันที่คืน</th>
              <th className="text-left px-4 py-2">สถานะ</th>
              <th className="text-center px-4 py-2">จำนวนรายการ</th>
              <th className="text-center px-4 py-2">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.WL_No} className="border-t">
                <td className="px-4 py-2">{r.WL_No}</td>
                <td className="px-4 py-2">
                  {new Date(r.WL_DateTime).toLocaleString("th-TH", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  {r.WL_Finish_DateTime
                    ? new Date(r.WL_Finish_DateTime).toLocaleString("th-TH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  {r.WL_Is_Finished ? "เสร็จสิ้นแล้ว" : "กำลังดำเนินการ"}
                </td>
                <td className="px-4 py-2 text-center">{r.ItemCount}</td>
                <td className="px-4 py-2 text-center space-x-3">
                  <Link
                    href={`/housekeeper/requisition/${r.WL_No}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    รายละเอียด
                  </Link>
                  {!r.WL_Is_Finished && (
                    <Link
                      href={`/housekeeper/requisition/${r.WL_No}/return`}
                      className="text-gray-600 hover:underline"
                    >
                      คืนของ
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
