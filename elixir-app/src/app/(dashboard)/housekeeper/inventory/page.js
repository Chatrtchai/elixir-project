// src/app/(dashboard)/housekeeper/inventory/page.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";

export default function HKInventoryPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printRows, setPrintRows] = useState([]);

  // ใช้ยกเลิก request ก่อนหน้าเมื่อพิมพ์ต่อ
  const abortRef = useRef(null);

  const printRef = useRef(null);

  // ✅ react-to-print (v3+)
  const handleReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "รายการของทั้งหมด",
    onAfterPrint: () => setPrinting(false),
    removeAfterPrint: true,
  });

  // โหลดข้อมูล (รองรับยกเลิกคำขอเก่า)
  const fetchData = useCallback(async (keyword) => {
    try {
      // ยกเลิก request เก่า ถ้ามี
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      const u = new URL("/api/items", window.location.origin);
      if (keyword) u.searchParams.set("q", keyword);

      const res = await fetch(u.toString(), {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      // ถ้าเป็น AbortError ให้เงียบไว้
      if (e?.name !== "AbortError") {
        console.error("fetch items failed", e);
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดรอบแรก
  useEffect(() => {
    fetchData("");
  }, []);

  // ⌨️ พิมพ์แล้วค้นหาอัตโนมัติ (debounce 300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchData(q.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [q, fetchData]);

  // ดึงข้อมูลทั้งหมด แล้วพิมพ์
  const printAll = useCallback(async () => {
    try {
      setPrinting(true);
      const res = await fetch("/api/items", { cache: "no-store" });
      const all = await res.json();
      setPrintRows(Array.isArray(all) ? all : []);
      // รอให้ DOM อัปเดตก่อนสั่งพิมพ์
      setTimeout(() => handleReactToPrint(), 100);
    } catch (e) {
      console.error("print failed", e);
      alert("ไม่สามารถสร้างหน้าพิมพ์ได้");
      setPrinting(false);
    }
  }, [handleReactToPrint]);

  const formatNow = () =>
    new Date().toLocaleString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">
          รายการของทั้งหมด
        </h1>
        <div className="flex gap-2">
          {/* ➕ ปุ่มเพิ่มของ */}
          <button
            onClick={() => router.push("/housekeeper/inventory/add")}
            className="rounded-md border px-3 py-2 text-white text-sm bg-green-600 hover:bg-green-700 cursor-pointer transition"
          >
            เพิ่มของ
          </button>

          {/* ✏️ ปุ่มไปหน้าแก้ไข (จะทำภายหลัง) */}
          <button
            onClick={() => router.push("/housekeeper/inventory/edit")}
            className="rounded-md px-3 py-2 text-black text-sm bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition"
          >
            แก้ไขรายการทั้งหมด
          </button>

          {/* 🖨️ พิมพ์ทั้งหมด */}
          <button
            onClick={printAll}
            disabled={printing}
            className="rounded-md border px-3 py-2 text-white text-sm bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer transition"
          >
            {printing ? "กำลังเตรียมพิมพ์..." : "พิมพ์รายการทั้งหมด"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อของ"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]"
        />
      </div>

      {/* ตารางแสดงผลบนหน้า */}
      <div className="overflow-y-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              {/* <th className="text-left px-4 py-2">รหัส</th> */}
              <th className="text-left px-4 py-2">รายการ</th>
              <th className="text-right px-4 py-2">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.I_Id} className="border-t">
                {/* <td className="px-4 py-2">{r.I_Id}</td> */}
                <td className="px-4 py-2">{r.I_Name}</td>
                <td className="px-4 py-2 text-right">{r.I_Quantity}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                  {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🖨️ ส่วนที่ใช้พิมพ์ */}
      <div style={{ position: "absolute", left: -9999, top: 0 }}>
        <div ref={printRef} className="p-6">
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 12mm; }
              body { 
                font-family: TH Sarabun New, sans-serif;
              }
              table { width: 100%; border-collapse: collapse; font-size: 20px; }
              th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 20px; }
              thead th { background: #f9fafb; text-align: left; font-size: 20px; }
              tfoot td { border: none; padding-top: 8px; font-size: 20px; color: #6b7280; }
            }
          `}</style>

          <h2 className="text-3xl font-semibold mb-1">รายการของทั้งหมด</h2>
          <div className="text-2xl text-gray-500 mb-3">
            ออกรายงานเมื่อ: {formatNow()}
          </div>

          <table>
            <thead>
              <tr>
                {/* <th style={{ width: 100, textAlign: "left" }}>รหัส</th> */}
                <th style={{ textAlign: "left" }}>รายการ</th>
                <th style={{ width: 120, textAlign: "center" }}>จำนวน (ชิ้น)</th>
              </tr>
            </thead>
            <tbody>
              {printRows.length > 0 ? (
                printRows.map((r) => (
                  <tr key={`print-${r.I_Id}`}>
                    {/* <td>{safe(r.I_Id)}</td> */}
                    <td>{safe(r.I_Name)}</td>
                    <td style={{ textAlign: "center" }}>
                      _________
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                      padding: 12,
                    }}
                  >
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={3}
                  style={{
                    border: "none",
                    paddingTop: 8,
                    fontSize: 20,
                    color: "#6b7280",
                  }}
                >
                  รวมทั้งหมด: {printRows.length} รายการ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// escape HTML เพื่อความปลอดภัย
function safe(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
