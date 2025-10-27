// src/app/(dashboard)/housekeeper/requisition/[id]/return/page.js

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function WithdrawReturnModal() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [returns, setReturns] = useState([]); // [{detailId, amount, max, item, withdrawn}]
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // โหลดข้อมูลใบเบิก
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/withdraws/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
        setReturns(
          (json.details || []).map((d) => ({
            detailId: d.WD_Id,
            amount: "", // ควบคุมค่า (controlled) — เว้นว่าง = 0
            max: Number(d.WD_Amount_Left ?? 0),
            item: d.I_Name,
            withdrawn: Number(d.WD_Amount ?? 0),
          }))
        );
      } catch {
        // เงียบไว้เพื่อไม่ flash error ตอนแรก
      }
    })();
  }, [id]);

  function testSubmit() {
    console.log("จำนวนที่คืนของ", returns.amount ?? 0);
    console.log("จำนวนที่ใส่คืนของ", return_amount.value ?? 0);
    console.log("ส่งข้อมูล:", {
      items: returns.map((r) => ({
        detailId: r.detailId,
        amount: Number(r.amount === "" ? 0 : r.amount),
      })),
    });
    // submit();
  }

  const submit = async () => {
    try {
      setLoading(true);
      setErr("");

      // ตรวจความถูกต้องก่อนส่ง
      for (const r of returns) {
        const val = Number(r.amount === "" ? 0 : r.amount);
        if (!Number.isFinite(val) || val < 0) {
          throw new Error(`จำนวนคืนของ "${r.item}" ไม่ถูกต้อง`);
        }
        if (val > r.max) {
          throw new Error(
            `จำนวนคืนของ "${r.item}" เกินคงเหลือที่คืนได้ (${r.max})`
          );
        }
      }

      // ส่งทุกรายการเสมอ: ค่าว่าง -> 0
      const payload = {
        items: returns.map((r) => ({
          detailId: r.detailId,
          amount: Number(r.amount === "" ? 0 : r.amount),
        })),
      };

      const res = await fetch(`/api/withdraws/${id}/return`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || "ไม่สามารถคืนของได้");

      router.back();
      router.refresh();
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  return (
    <ModalWrapper title={`คืนของจากใบเบิก #${id}`} width="w-[700px]">
      <div className="space-y-4 text-sm">
        {/* ตาราง: ชื่อรายการของที่เบิก | จำนวนที่เบิก | จำนวนที่คืน */}
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">
                  ชื่อรายการของที่เบิก
                </th>
                <th className="text-center px-3 py-2 border-b">จำนวนที่เบิก</th>
                <th className="text-center px-3 py-2 border-b">จำนวนที่คืน</th>
              </tr>
            </thead>
            <tbody>
              {(data.details || []).map((d, idx) => {
                const r = returns[idx] ?? {};
                const max = Number(d.WD_Amount_Left ?? 0);
                const withdrawn = Number(d.WD_Amount ?? 0);
                const amountStr = r.amount ?? "";

                const val = Number(amountStr === "" ? 0 : amountStr);
                const over = val > max;
                const invalid =
                  amountStr !== "" &&
                  (!Number.isFinite(Number(amountStr)) ||
                    Number(amountStr) < 0);

                return (
                  <tr key={d.WD_Id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-gray-800">
                        {d.I_Name}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-top">
                      {withdrawn}
                    </td>
                    <td className="px-3 py-2 text-center align-top">
                      <div className="flex items-center justify-center gap-2" id="return_amount">
                        <input
                          type="number"
                          min="0"
                          max={max}
                          inputMode="numeric"
                          value={amountStr}
                          onChange={(e) => {
                            const cp = [...returns];
                            cp[idx] = cp[idx] || {
                              detailId: d.WD_Id,
                              amount: "",
                              max,
                              item: d.I_Name,
                              withdrawn,
                            };
                            cp[idx].amount = e.target.value;
                            setReturns(cp);
                          }}
                          className={`w-28 rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-center
                            ${
                              over || invalid
                                ? "border-red-400"
                                : "border-gray-300"
                            }`}
                        />
                      </div>
                      {(over || invalid) && (
                        <div className="text-xs text-red-600 mt-1">
                          {invalid
                            ? "กรุณาใส่จำนวนที่ถูกต้อง"
                            : `เกินคงเหลือที่คืนได้ (${max})`}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!data.details || data.details.length === 0) && (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-gray-500"
                    colSpan={3}
                  >
                    ไม่มีรายการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end pt-2 gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-md bg-[var(--color-primary)] text-white px-4 py-2 disabled:opacity-50 cursor-pointer hover:bg-[var(--color-primary-dark)]"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกการคืนของ"}
          </button>
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
