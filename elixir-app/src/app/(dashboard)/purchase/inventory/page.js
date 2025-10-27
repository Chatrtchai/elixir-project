"use client";
import { useEffect, useState } from "react";

export default function PurchaseInventoryPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);

  const fetchData = async () => {
    const u = new URL("/api/items", window.location.origin);
    if (q) u.searchParams.set("q", q);
    const res = await fetch(u.toString());
    const json = await res.json();
    setRows(json || []);
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[--color-primary]">
        รายการของทั้งหมด
      </h1>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อของ"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]"
        />
        <button
          onClick={fetchData}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          ค้นหา
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">รหัส</th>
              <th className="text-left px-4 py-2">รายการ</th>
              <th className="text-left px-4 py-2">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.I_Id} className="border-t">
                <td className="px-4 py-2">{r.I_Id}</td>
                <td className="px-4 py-2">{r.I_Name}</td>
                <td className="px-4 py-2">{r.I_Quantity}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
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
