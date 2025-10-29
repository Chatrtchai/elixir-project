// src/app/(dashboard)/housekeeper/requests/[id]/page.js

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

const TH = {
  Approved: "อนุมัติแล้ว",
  Waiting: "กำลังดำเนินการ",
  Accepted: "ตอบรับคำขอ",
  Rejected: "ปฏิเสธแล้ว",
  Purchasing: "ดำเนินการจัดซื้อ",
  Received: "ได้รับของแล้ว",
  Completed: "เสร็จสิ้นแล้ว",
};

export default function HKRequestDetailModal() {
  const router = useRouter();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // โหลดข้อมูล
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/requests/${id}`, { cache: "no-store" });
        const js = await res.json();
        setData(js);
      } catch (e) {
        setError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ฟังก์ชันเปลี่ยนสถานะเป็น Completed
  const markCompleted = async () => {
    if (!confirm("ยืนยันว่าได้ดำเนินการเสร็จสิ้นแล้ว?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markCompleted" }),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || "อัปเดตไม่สำเร็จ");
      alert("อัปเดตสถานะเป็น 'เสร็จสิ้นแล้ว' เรียบร้อย");
      router.refresh();
      router.back();
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-6 text-sm">กำลังโหลด...</div>;
  if (!data) return null;

  return (
    <ModalWrapper title={`รายละเอียดคำขอ #${id}`} width={"w-[600px]"}>
      <div className="space-y-3 text-sm">
        {error && (
          <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <Row label="ผู้ขอ" value={data.HK_Fullname} />
        <Row label="สถานะ" value={TH[data.R_Status] || data.R_Status} />
        <Row
          label="วันที่สร้าง"
          value={
            data.R_DateTime
              ? new Date(data.R_DateTime).toLocaleString("th-TH", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"
          }
        />
        <Row
          label="วันที่อัพเดตล่าสุด"
          value={
            data.R_LastModified
              ? new Date(data.R_LastModified).toLocaleString("th-TH", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"
          }
        />
        <Row
          label="หัวหน้า"
          value={data.H_Fullname || data.H_Username || "-"}
        />
        <Row
          label="ผู้จัดซื้อ"
          value={data.PD_Fullname || data.PD_Username || "-"}
        />

        <div>
          <div className="text-gray-500 mb-1">รายการที่ขอ</div>
          <ul className="list-disc list-inside space-y-1">
            {(data.details || []).map((d) => (
              <li key={d.RD_Id}>
                {d.I_Name} x {d.RD_Amount}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        {/* แสดงปุ่มเฉพาะเมื่อสถานะเป็น Received */}
        {data.R_Status === "Received" && (
          <button
            onClick={markCompleted}
            disabled={updating}
            className="px-4 py-2 rounded-lg text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 cursor-pointer"
          >
            {updating ? "กำลังอัปเดต..." : "เสร็จสิ้น"}
          </button>
        )}
        <button
          onClick={() => router.back()}
          type="button"
          className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </ModalWrapper>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <div className="w-28 text-gray-500">{label}:</div>
      <div className="flex-1">{value}</div>
    </div>
  );
}
