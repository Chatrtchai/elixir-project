"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TH = {
  Approved: "อนุมัติแล้ว",
  Waiting: "กำลังดำเนินการ",
  Accepted: "ตอบรับคำขอ",
  Rejected: "ปฏิเสธแล้ว",
  Purchasing: "ดำเนินการจัดซื้อ",
  Received: "ได้รับของแล้ว",
  Completed: "เสร็จสิ้นแล้ว",
};

export default function HKPurchaseRequestsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (search = "") => {
    setLoading(true);

    try {
      const u = new URL("/api/requests", location.origin);
      if (search) u.searchParams.set("q", search); // ✅ เพิ่มตัวกรองเมื่อมีการพิมพ์

      const res = await fetch(u.toString(), { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();

      let data = [];
      if (text && ct.includes("application/json")) {
        data = JSON.parse(text);
      }

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ โหลดข้อมูลครั้งแรก
  useEffect(() => {
    fetchData();
  }, []);

  // ✅ ค้นหาอัตโนมัติเมื่อพิมพ์ (หน่วง 300ms)
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchData(q);
    }, 300);
    return () => clearTimeout(delay);
  }, [q]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            รายการคำขอจัดซื้อ
          </h1>
          <p className="text-sm text-gray-500">
            สร้างใบเบิกของ ดูรายละเอียด และคืนของ
          </p>
        </div>

        <Link
          href="/housekeeper/requests/new"
          className="rounded-lg bg-[var(--color-primary)] text-white px-3 py-2 hover:bg-[var(--color-primary-dark)]"
        >
          สร้างคำขอสั่งซื้อ
        </Link>
      </header>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาเลขที่คำขอ / รายการ"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]"
        />
      </div>

      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2">เลขที่คำขอ</th>
              <th className="text-left px-4 py-2">วันที่สร้าง</th>
              <th className="text-left px-4 py-2">อัพเดตล่าสุด</th>
              <th className="text-left px-4 py-2">สถานะ</th>
              <th className="text-right px-4 py-2">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.R_No} className="border-t">
                <td className="px-4 py-2">{r.R_No}</td>
                <td className="px-4 py-2">
                  {new Date(r.R_DateTime).toLocaleString("th-TH", {
                    second: "2-digit",
                    minute: "2-digit",
                    hour: "2-digit",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2">
                  {new Date(r.R_LastModified).toLocaleString("th-TH", {
                    second: "2-digit",
                    minute: "2-digit",
                    hour: "2-digit",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {TH[r.R_Status] || r.R_Status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={"/housekeeper/requests/" + r.R_No}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    รายละเอียด
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
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
