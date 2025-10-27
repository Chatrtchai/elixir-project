// src\app\(dashboard)\purchase\requests\page.js

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const TH = {
  Waiting: "กำลังดำเนินการ",
  Approved: "ตอบรับคำขอ",
  Rejected: "ปฏิเสธแล้ว",
  Purchasing: "ดำเนินการจัดซื้อ",
  Received: "ได้รับของแล้ว",
  Completed: "เสร็จสิ้นแล้ว",
};

export default function PurchaseRequestsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const u = new URL("/api/requests", window.location.origin);
    if (q) u.searchParams.set("q", q);
    if (status !== "ALL") u.searchParams.set("status", status);
    const res = await fetch(u.toString());
    const data = await res.json();
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const badge = useMemo(
    () => (st) => {
      const base =
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
      switch (st) {
        case "Approved":
          return `${base} bg-blue-100 text-blue-800`;
        case "Purchasing":
          return `${base} bg-indigo-100 text-indigo-800`;
        case "Received":
          return `${base} bg-emerald-100 text-emerald-700`;
        case "Completed":
          return `${base} bg-gray-200 text-gray-700`;
        case "Waiting":
          return `${base} bg-yellow-100 text-yellow-800`;
        case "Rejected":
          return `${base} bg-red-100 text-red-700`;
        default:
          return base;
      }
    },
    []
  );

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-primary]">
            รายการคำขอจัดซื้อ
          </h1>
          <p className="text-sm text-gray-500">
            สำหรับฝ่ายจัดซื้อ: รับช่วงคำขอที่ Head อนุมัติแล้ว
          </p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาจากเลขที่คำขอ/ชื่อผู้ขอ/ชื่อรายการ"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
        >
          <option value="ALL">สถานะทั้งหมด</option>
          <option value="Accepted">{TH.Approved}</option>
          <option value="Purchasing">{TH.Purchasing}</option>
          <option value="Received">{TH.Received}</option>
          <option value="Completed">{TH.Completed}</option>
          <option value="Waiting">{TH.Waiting}</option>
          <option value="Rejected">{TH.Rejected}</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">เลขที่คำขอ</th>
              <th className="text-left px-4 py-2">ผู้ขอ</th>
              <th className="text-left px-4 py-2">วันที่สร้าง</th>
              <th className="text-left px-4 py-2">สถานะ</th>
              <th className="text-center px-4 py-2">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.R_No} className="border-t">
                <td className="px-4 py-2">{r.R_No}</td>
                <td className="px-4 py-2">{r.HKName}</td>
                <td className="px-4 py-2">
                  {new Date(r.R_DateTime).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <span className={badge(r.R_Status)}>
                    {TH[r.R_Status] || r.R_Status}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <Link
                    href={"/purchase/requests/" + r.R_No}
                    className="text-[--color-primary] hover:underline"
                  >
                    รายละเอียด
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {loading ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
