// src/app/(dashboard)/head/history/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function HeadHistoryDetailModalPage() {
  const { id } = useParams();
  const router = useRouter();
  const sp = useSearchParams();

  // อ่าน filter เดิมจาก URL ของโมดัล
  const type = (sp.get("type") || "transaction").toLowerCase(); // transaction | request_transaction

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const title = useMemo(
    () =>
      type === "request_transaction"
        ? "รายละเอียดคำขอสั่งซื้อ"
        : "รายละเอียดคลังของ",
    [type]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");
        const q = type ? `?type=${encodeURIComponent(type)}` : "";
        const res = await fetch(`/api/transactions/${id}${q}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setErr(e.message || "fetch_error");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, type]);

  // ปิดด้วยคีย์ Esc -> กลับไปหน้าลิสต์พร้อม type เดิม
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        router.push(`/head/history?type=${encodeURIComponent(type)}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, type]);

  // รองรับชื่อฟิลด์บรรทัดหลายรูปแบบจาก API
  const lines = data?.lines || data?.items || data?.details || data?.Rows || [];

  // ✅ บรรทัดของ REQUEST_DETAIL (ถ้าไม่มีให้ fallback เป็น lines)
  const rd_lines = data?.rd_lines || [];

  return (
    <ModalWrapper
      open
      title={`${title} (#${id})`}
      width={"w-[600px]"}
      onClose={() =>
        router.push(`/head/history?type=${encodeURIComponent(type)}`)
      }
    >
      {loading ? (
        <div className="text-gray-400">กำลังโหลด...</div>
      ) : err ? (
        <div className="text-red-500">เกิดข้อผิดพลาด: {err}</div>
      ) : !data ? (
        <div className="text-gray-400">ไม่พบข้อมูล</div>
      ) : (
        <div className="space-y-5">
          {/* สรุปหัวรายการ */}
          <section className="grid md:grid-cols-2 gap-3">
            <InfoRow
              label="วันเวลา"
              value={
                data.datetime
                  ? new Date(data.datetime).toLocaleString("th-TH", {
                      second: "2-digit",
                      minute: "2-digit",
                      hour: "2-digit",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"
              }
            />
            <InfoRow label="ผู้กระทำ" value={data.actor || "-"} />
            <InfoRow
              label="ประเภท"
              value={
                data.type === "request_transaction"
                  ? "รายการคำขอสั่งซื้อ"
                  : "คลังของ"
              }
            />
            <InfoRow label="หมายเหตุ" value={data.note || "-"} />
          </section>

          {/* รายละเอียด */}
          <section className="space-y-2">
            <h3 className="font-semibold">รายละเอียด</h3>

            {type === "request_transaction" ? (
              <div className="overflow-y-auto max-h-[250px]">
                {/* ✅ ตารางแสดง REQUEST_DETAIL */}
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <Th>ชื่อรายการ</Th>
                      <Th>จำนวนที่ขอ</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rd_lines.length ? rd_lines : lines).map((r, idx) => (
                      <tr
                        key={r.RD_Id || `${r.I_Id}-${idx}`}
                        className="border-t hover:bg-gray-50"
                      >
                        <Td>{r.I_Name}</Td>
                        <Td>{r.RD_Amount}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // ตารางของ transaction_detail (เหมือนเดิม)
              <div className="overflow-y-auto max-h-[250px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <Th>รายการ</Th>

                      {data.note === "เบิกของ" && <Th>จำนวนที่เบิก</Th>}
                      {data.note === "คืนของ" && <Th>จำนวนที่คืน</Th>}

                      {/* กรณีอื่น (เช่น bulk update) */}
                      {data.note !== "เบิกของ" && data.note !== "คืนของ" && (
                        <Th>จำนวนที่เพิ่ม/ลด</Th>
                      )}

                      <Th>จำนวนคงเหลือ (หลังทำรายการ)</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {lines.map((r, idx) => (
                      <tr
                        key={r.TD_Id || idx}
                        className="border-t hover:bg-gray-50"
                      >
                        <Td>{r.I_Name ?? "-"}</Td>
                        <Td>{r.TD_Amount_Changed ?? "-"}</Td>
                        <Td>{r.TD_Total_Left ?? "-"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() =>
                router.push(`/head/history?type=${encodeURIComponent(type)}`)
              }
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-3 py-2">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 text-center">{children}</td>;
}