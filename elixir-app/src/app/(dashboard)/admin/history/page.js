// src/app/(dashboard)/admin/history/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function HKHistoryPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const validTypes = useMemo(() => ["transaction", "request_transaction"], []);
  const initialType = useMemo(() => {
    const t = (sp.get("type") || "").toLowerCase();
    return validTypes.includes(t) ? t : "transaction";
  }, [sp, validTypes]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(initialType); // transaction | request_transaction

  // sync จาก URL -> state (รองรับ back/forward หรือเปิดเข้ามาพร้อม type)
  useEffect(() => {
    const t = (sp.get("type") || "").toLowerCase();
    if (validTypes.includes(t) && t !== filter) {
      setFilter(t);
    }
  }, [sp, validTypes, filter]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const query = `?type=${encodeURIComponent(filter)}`;
        const res = await fetch(`/api/transactions${query}`, {
          cache: "no-store",
        });
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
  }, [filter]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            ประวัติการทำรายการ
          </h1>
          <p className="text-sm text-gray-500">
            ประวัติการทำรายการทั้งหมดภายในระบบ
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => {
            const next = e.target.value;
            setFilter(next);
            router.replace(`/admin/history?type=${encodeURIComponent(next)}`);
          }}
          className="border rounded-md px-3 py-1 text-sm"
        >
          <option value="transaction">คลังของ</option>
          <option value="request_transaction">รายการคำขอสั่งซื้อ</option>
        </select>
      </header>

      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2">วันเวลา</th>
              <th className="text-left px-4 py-2">รายละเอียด</th>
              <th className="text-left px-4 py-2">ผู้กระทำ</th>
              <th className="text-center px-4 py-2">ดำเนินการ</th>
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
                  <td className="px-4 py-2">
                    {new Date(r.datetime).toLocaleString("th-TH", {
                      second: "2-digit",
                      minute: "2-digit",
                      hour: "2-digit",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2">{r.note}</td>
                  <td className="px-4 py-2 text-gray-600">{r.actor || "-"}</td>
                  <td className="px-4 py-2 text-center">
                    <Link
                      href={`/admin/history/${r.id}?type=${encodeURIComponent(
                        filter
                      )}`}
                      className="px-3 py-1 text-gray-500 rounded-md text-sm hover:underline transition"
                    >
                      รายละเอียด
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
