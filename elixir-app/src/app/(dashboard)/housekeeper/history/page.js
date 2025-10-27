// src/app/(dashboard)/housekeeper/history/page.js
"use client";

import { useEffect, useState } from "react";

export default function HKHistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/transactions", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(data);
      } catch (e) {
        setError(e.message || "fetch_error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            ประวัติการทำรายการ
          </h1>
          <p className="text-sm text-gray-500">
            สร้างใบเบิกของ ดูรายละเอียด และคืนของ
          </p>
        </div>
      </header>

      {/* Table */}
      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2">หมายเลข</th>
              <th className="text-left px-4 py-2">วันเวลา</th>
              <th className="text-left px-4 py-2">หัวข้อ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-red-500">
                  เกิดข้อผิดพลาด: {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.id}</td>
                  <td className="px-4 py-2">
                    {new Date(r.datetime).toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-2">{r.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
