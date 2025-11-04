// src/components/dashboard/HistoryDetailModal.js
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";
import { HISTORY_TYPE_LABELS, formatHistoryDate } from "@/lib/history";

export default function HistoryDetailModal({ id, type, data, backPath }) {
  const router = useRouter();
  const normalizedType = typeof type === "string" ? type.toLowerCase() : "transaction";
  const title = useMemo(() => {
    if (normalizedType === "request_transaction") {
      return "รายละเอียดคำขอสั่งซื้อ";
    }
    return "รายละเอียดคลังของ";
  }, [normalizedType]);

  const safeBackPath = backPath || "/";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        router.push(safeBackPath);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, safeBackPath]);

  if (!data) {
    return (
      <ModalWrapper title={`${title} (#${id})`} width="w-[600px]">
        <div className="text-gray-400">ไม่พบข้อมูล</div>
      </ModalWrapper>
    );
  }

  const lines = data.lines || data.items || data.details || data.Rows || [];
  const rdLines = data.rd_lines || [];
  const formattedDate = formatHistoryDate(data.datetime);
  const noteLabel = data.note || "-";
  const actorLabel = data.actor || "-";
  const typeLabel = HISTORY_TYPE_LABELS[data.type] || HISTORY_TYPE_LABELS[normalizedType] || "-";
  const changeHeader = noteLabel === "เบิกของ"
    ? "จำนวนที่เบิก"
    : noteLabel === "คืนของ"
    ? "จำนวนที่คืน"
    : "จำนวนที่เพิ่ม/ลด";

  return (
    <ModalWrapper title={`${title} (#${id})`} width="w-[600px]">
      <div className="space-y-5">
        <section className="grid md:grid-cols-2 gap-3">
          <InfoRow label="วันเวลา" value={formattedDate} />
          <InfoRow label="ผู้กระทำ" value={actorLabel} />
          <InfoRow label="ประเภท" value={typeLabel} />
          <InfoRow label="หมายเหตุ" value={noteLabel} />
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">รายละเอียด</h3>

          {normalizedType === "request_transaction" ? (
            <div className="overflow-y-auto max-h-[250px]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <Th>ชื่อรายการ</Th>
                    <Th>จำนวนที่ขอ</Th>
                  </tr>
                </thead>
                <tbody>
                  {(rdLines.length ? rdLines : lines).length === 0 ? (
                    <tr>
                      <Td colSpan={2}>ไม่พบข้อมูล</Td>
                    </tr>
                  ) : (
                    (rdLines.length ? rdLines : lines).map((item, index) => (
                      <tr
                        key={item.RD_Id || `${item.I_Id}-${index}`}
                        className="border-t hover:bg-gray-50"
                      >
                        <Td>{item.I_Name}</Td>
                        <Td>{item.RD_Amount}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[250px]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <Th>รายการ</Th>
                    <Th>{changeHeader}</Th>
                    <Th>จำนวนคงเหลือ (หลังทำรายการ)</Th>
                  </tr>
                </thead>
                <tbody>
                  {!lines.length ? (
                    <tr>
                      <Td colSpan={3}>ไม่พบข้อมูล</Td>
                    </tr>
                  ) : (
                    lines.map((item, index) => (
                      <tr
                        key={item.TD_Id || `${item.I_Id}-${index}`}
                        className="border-t hover:bg-gray-50"
                      >
                        <Td>{item.I_Name ?? "-"}</Td>
                        <Td>{item.TD_Amount_Changed ?? "-"}</Td>
                        <Td>{item.TD_Total_Left ?? "-"}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => router.push(safeBackPath)}
            type="button"
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
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

function Th({ children, className = "", ...props }) {
  return (
    <th
      {...props}
      className={`text-left px-3 py-2 font-medium text-gray-600 ${className}`.trim()}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "", ...props }) {
  return (
    <td {...props} className={`px-3 py-2 ${className}`.trim()}>
      {children ?? "-"}
    </td>
  );
}
