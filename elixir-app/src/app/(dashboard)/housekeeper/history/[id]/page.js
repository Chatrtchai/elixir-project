// src/app/(dashboard)/housekeeper/history/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function HKHistoryDetailModalPage() {
  const { id } = useParams();
  const router = useRouter();
  const sp = useSearchParams();

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

  // ปิดด้วยคีย์ Esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && router.back();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // รองรับชื่อฟิลด์บรรทัดหลายรูปแบบจาก API
  const lines = data?.lines || data?.items || data?.details || data?.Rows || [];

  return (
    <ModalWrapper
      open
      title={`${title} (#${id})`}
      onClose={() => router.back()}
      // ใส่ prop อื่น ๆ ตามที่คอมโพเนนต์ของคุณรองรับ เช่น size="lg" หรือ className
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

          {/* รายการบรรทัด */}
          <section className="space-y-2">
            <h3 className="font-semibold">รายละเอียด</h3>
            {Array.isArray(lines) && lines.length > 0 ? (
              <div className="overflow-y-auto max-h-[250px]">
                {type === "request_transaction" ? (
                  // 🔹 ตารางของ request_transaction
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <Th>วันที่</Th>
                        <Th>หมายเหตุ</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((r, idx) => (
                        <tr
                          key={r.RT_No || idx}
                          className="border-t hover:bg-gray-50"
                        >
                          <Td>
                            {r.RT_DateTime
                              ? new Date(r.RT_DateTime).toLocaleString(
                                  "th-TH",
                                  {
                                    second: "2-digit",
                                    minute: "2-digit",
                                    hour: "2-digit",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  }
                                )
                              : "-"}
                          </Td>
                          <Td>{r.RT_Note ?? "-"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // 🔹 ตารางของ transaction_detail
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <Th>รายการ</Th>
                        {data.note === "เบิกของ" && <Th>จำนวนที่เบิก</Th>}
                        {data.note === "คืนของ" && <Th>จำนวนที่คืน</Th>}
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
                )}
              </div>
            ) : (
              <div className="text-gray-500">ไม่มีรายละเอียดบรรทัด</div>
            )}
          </section>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => router.back()}
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
