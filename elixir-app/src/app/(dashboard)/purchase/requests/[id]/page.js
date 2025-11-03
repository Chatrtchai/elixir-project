// src/app/(dashboard)/purchase/requests/[id]/page.js

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

const TH = {
  Waiting: "กำลังดำเนินการ",
  Approved: "อนุมัติแล้ว",
  Rejected: "ปฏิเสธแล้ว",
  Purchasing: "ดำเนินการจัดซื้อ",
  Received: "ได้รับของแล้ว",
  Completed: "เสร็จสิ้นแล้ว",
};

export default function PurchaseRequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [err, setErr] = useState("");

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${id}`);
      const json = await res.json();
      setData(json || null);
    } catch (e) {
      setErr("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  console.log("data", data);

  const onStartPurchasing = async () => {
    setUpdating(true);
    setErr("");
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "startPurchasing" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "อัปเดตสถานะไม่สำเร็จ");
      await fetchDetail();
      router.back();
    } catch (e) {
      setErr(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const onMarkReceived = async () => {
    setUpdating(true);
    setErr("");
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markReceived" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "อัปเดตสถานะไม่สำเร็จ");
      await fetchDetail();
      router.back();
    } catch (e) {
      setErr(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const actionBtn = useMemo(() => {
    if (!data) return null;
    const st = data.R_Status;
    if (st === "Approved") {
      return (
        <button
          onClick={onStartPurchasing}
          disabled={updating}
          className="rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 disabled:opacity-60 cursor-pointer transition"
        >
          {updating ? "กำลังอัปเดต..." : "ดำเนินการจัดซื้อ"}
        </button>
      );
    }
    if (st === "Purchasing") {
      return (
        <button
          onClick={onMarkReceived}
          disabled={updating}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 disabled:opacity-60 cursor-pointer transition"
        >
          {updating ? "กำลังอัปเดต..." : "ได้รับของแล้ว"}
        </button>
      );
    }
    // สถานะอื่น: ไม่แสดงปุ่ม
    return null;
  }, [data, updating]);

  if (loading) return null;
  if (!data) return null;

  return (
    <ModalWrapper title={`รายละเอียดคำขอ #${id}`} width={"w-[600px]"}>
      <div className="space-y-4">
        {err && (
          <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <Row
            label="ผู้ขอ"
            value={data.HK_Fullname || data.HK_Username || "-"}
          />
          <Row
            label="วันที่สร้าง"
            value={
              data.R_DateTime
                ? new Date(data.R_DateTime).toLocaleString("th-TH", {
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
          <Row
            label="วันที่อัพเดตล่าสุด"
            value={
              data.R_LastModified
                ? new Date(data.R_LastModified).toLocaleString("th-TH", {
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
          <Row label="สถานะ" value={TH[data.R_Status] || data.R_Status} />
          <Row
            label="หัวหน้า"
            value={data.H_Fullname || data.H_Username || "-"}
          />
          <Row
            label="ผู้จัดซื้อ"
            value={data.PD_Fullname || data.PD_Username || "-"}
          />
          <div className="pt-2">
            <div className="text-gray-500 mb-1">รายการที่ขอ</div>
            <div className="overflow-y-auto h-[100px]">
              <ul className="list-disc list-inside space-y-1">
                {(data.details || []).map((d) => (
                  <li key={d.RD_Id}>
                    {d.I_Name} x {d.RD_Amount}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div />
          <div className="flex gap-3">
            {actionBtn}
            <button
              onClick={() => history.back()}
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
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
