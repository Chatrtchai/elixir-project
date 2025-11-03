// src/app/(dashboard)/purchase/requests/page.js
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// แมปสถานะ → ภาษาไทย + สี (ให้แสดงเหมือนหน้าอื่น ๆ)
const STATUS_MAP = {
  Waiting: { th: "กำลังดำเนินการ", className: "text-cyan-600" },
  Approved: { th: "ตอบรับคำขอ", className: "text-green-600" },
  Rejected: { th: "ปฏิเสธคำขอ", className: "text-red-600" },
  Purchasing: { th: "ดำเนินการจัดซื้อ", className: "text-amber-600" },
  Received: { th: "ได้รับของแล้ว", className: "text-amber-500" },
  Completed: { th: "เสร็จสิ้นแล้ว", className: "text-gray-500" },
};
const STATUS_KEYS = Object.keys(STATUS_MAP);

export default function PurchaseRequestsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // dropdown filter ของสถานะ (หลายค่า)
  const [showFilter, setShowFilter] = useState(false);
  const [checked, setChecked] = useState(() => new Set(STATUS_KEYS));

  const fetchData = async () => {
    setLoading(true);
    try {
      const u = new URL("/api/requests", window.location.origin);
      if (q) u.searchParams.set("q", q);

      const res = await fetch(u.toString());
      const data = await res.json();

      if (Array.isArray(data)) setRows(data);
      else setRows([]);
    } catch (err) {
      console.error("fetch failed", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // กรองด้วยสถานะ + คำค้น (ฝั่ง client)
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!checked.has(r.R_Status)) return false;
      if (!qLower) return true;
      const hay = `${r.R_No ?? ""} ${r.HKName ?? r.HK_Username ?? ""} ${
        r.R_Status ?? ""
      }`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [rows, q, checked]);

  // toggle checkbox ของสถานะ
  const toggleStatus = (key) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
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

        {/* Dropdown สถานะ (หลายค่า) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilter((s) => !s)}
            className="h-10 px-3 flex items-center justify-between bg-white border rounded-lg w-48"
          >
            <span className="text-gray-700 font-medium">สถานะ</span>
            <span className="text-gray-500">{showFilter ? "▾" : "▸"}</span>
          </button>

          {showFilter && (
            <div className="absolute z-50 mt-1 w-60 border rounded-lg shadow-lg bg-white">
              {STATUS_KEYS.map((key) => {
                const st = STATUS_MAP[key];
                const isOn = checked.has(key);
                return (
                  <label
                    key={key}
                    className="w-full px-3 py-2 flex items-center gap-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleStatus(key)}
                      className="size-4"
                    />
                    <span className={`text-base ${st.className}`}>{st.th}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr className="border-b">
              <th className="text-left px-4 py-2">เลขที่คำขอ</th>
              <th className="text-left px-4 py-2">วันที่สร้าง</th>
              <th className="text-left px-4 py-2">อัพเดตล่าสุด</th>
              <th className="text-center px-4 py-2">สถานะ</th>
              <th className="text-center px-4 py-2">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const st = STATUS_MAP[r.R_Status] ?? {
                th: r.R_Status ?? "-",
                className: "text-gray-600",
              };
              return (
                <tr key={r.R_No} className="border-t">
                  <td className="px-4 py-2">{r.R_No}</td>
                  <td className="px-4 py-2">
                    {r.R_DateTime
                      ? new Date(r.R_DateTime).toLocaleString("th-TH", {
                          second: "2-digit",
                          minute: "2-digit",
                          hour: "2-digit",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {r.R_LastModified
                      ? new Date(r.R_LastModified).toLocaleString("th-TH", {
                          second: "2-digit",
                          minute: "2-digit",
                          hour: "2-digit",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                  <td
                    className={`px-4 py-2 text-center font-medium ${st.className}`}
                  >
                    {st.th}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Link
                      href={`/purchase/requests/${r.R_No}`}
                      className="text-[--color-primary] hover:underline"
                    >
                      รายละเอียด
                    </Link>
                  </td>
                </tr>
              );
            })}

            {!filtered.length && (
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
