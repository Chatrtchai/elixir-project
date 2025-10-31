// src/app/(dashboard)/head/requests/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

const TH = {
  Approved: "ตอบรับคำขอ",
  Waiting: "กำลังดำเนินการ",
  Rejected: "ปฏิเสธคำขอ",
  Purchasing: "ดำเนินการจัดซื้อ",
  Received: "ได้รับของแล้ว",
  Completed: "เสร็จสิ้นแล้ว",
};

export default function HeadRequestDetailAction() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // อนุมัติ: เลือกผู้จัดซื้อ (Username)
  const [approveOpen, setApproveOpen] = useState(false);
  const [pdDept, setPdDept] = useState("");
  const [pdError, setPdError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // รายชื่อผู้ใช้ฝ่ายจัดซื้อ (จาก /api/users?role=Purchasing%20Department)
  const [pdList, setPdList] = useState([]);
  const [pdLoading, setPdLoading] = useState(false);

  // โหลดรายละเอียดคำขอ
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/requests/${id}`, { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("load request failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // โหลดรายชื่อฝ่ายจัดซื้อเมื่อกด "อนุมัติ"
  useEffect(() => {
    if (!approveOpen) return;
    (async () => {
      try {
        setPdLoading(true);
        const res = await fetch("/api/users?role=Purchasing%20Department", {
          cache: "no-store",
        });
        const json = await res.json();
        setPdList(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("load purchasing users failed", e);
        setPdList([]);
      } finally {
        setPdLoading(false);
      }
    })();
  }, [approveOpen]);

  if (loading || !data) return null;

  // ----- Actions -----
  const openApprove = () => {
    setApproveOpen(true);
    setPdError("");
  };

  const cancelApprove = () => {
    setApproveOpen(false);
    setPdDept("");
    setPdError("");
  };

  const confirmApprove = async () => {
    if (!pdDept) {
      setPdError("กรุณาเลือกผู้จัดซื้อ");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", pdDept }), // Username ของผู้จัดซื้อ
      });

      console.log("res", res);

      if (!res.ok) throw new Error(await res.text());
      alert("อนุมัติคำขอสำเร็จ");
      router.back(); // ปิดโมดัล/ย้อนกลับ
    } catch (e) {
      console.error("approve failed", e);
      alert("ไม่สามารถอนุมัติได้: " + (e?.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSubmitting(false);
    }
  };

  const clickReject = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("ปฏิเสธคำขอเรียบร้อยแล้ว");
      router.back();
    } catch (e) {
      console.error("reject failed", e);
      alert("ไม่สามารถปฏิเสธได้: " + (e?.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper title={`รายละเอียดคำขอ #${id}`} width={"w-[600px]"}>
      <div className="space-y-3 text-sm">
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
          <ul className="list-disc list-inside space-y-1">
            {(data.details || []).map((d) => (
              <li key={d.RD_Id}>
                {d.I_Name} x {d.RD_Amount}
              </li>
            ))}
          </ul>
        </div>

        {/* กล่องอนุมัติ */}
        {approveOpen && (
          <div className="mt-4 rounded-lg border p-3">
            <div className="text-sm font-medium mb-2">
              เลือกผู้รับผิดชอบฝ่ายจัดซื้อ{" "}
              <span className="text-rose-500">*</span>
            </div>

            {pdLoading ? (
              <div className="text-gray-500 text-sm">กำลังโหลดรายชื่อ...</div>
            ) : (
              <select
                value={pdDept}
                onChange={(e) => {
                  setPdDept(e.target.value);
                  setPdError("");
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  pdError
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[--color-primary]"
                }`}
              >
                <option value="">-- กรุณาเลือก --</option>
                {pdList.map((u) => (
                  <option key={u.Username} value={u.Username}>
                    {u.Fullname}
                  </option>
                ))}
              </select>
            )}
            {pdError && (
              <div className="text-xs text-red-500 mt-1">{pdError}</div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={cancelApprove}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                disabled={submitting || data.R_Status !== "Waiting"}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmApprove}
                className="rounded-md bg-[var(--color-primary)] text-white px-3 py-2 hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                disabled={submitting || data.R_Status !== "Waiting"}
              >
                {submitting ? "กำลังยืนยัน..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => router.back()}
          type="button"
          className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          ปิดหน้าต่าง
        </button>

        <div className="flex justify-end gap-2">
          {/* ปุ่มอนุมัติ */}
          {!submitting && data?.R_Status === "Waiting" && !approveOpen && (
            <button
              onClick={openApprove}
              className="rounded-md bg-[var(--color-primary)] text-white px-3 py-2 hover:bg-[var(--color-primary-dark)] cursor-pointer"
            >
              อนุมัติ
            </button>
          )}

          {/* ปุ่มปฏิเสธ */}
          {!submitting && data?.R_Status === "Waiting" && !approveOpen && (
            <button
              onClick={clickReject}
              className="rounded-md border px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600 cursor-pointer"
            >
              ปฏิเสธ
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <div className="w-40 text-gray-500">{label}:</div>
      <div className="flex-1">{value}</div>
    </div>
  );
}
