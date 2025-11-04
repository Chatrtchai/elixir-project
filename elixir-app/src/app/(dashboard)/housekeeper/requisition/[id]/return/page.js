// src/app/(dashboard)/housekeeper/requisition/[id]/return/page.js

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function WithdrawReturnModal() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [returns, setReturns] = useState([]); // [{detailId, itemId, amount, max, item, withdrawn}]
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
            itemId: d.I_Id, // ✅ ใส่ไว้เพื่อส่งให้ API
            amount: "", // controlled; ค่าว่างหมายถึง 0
            // max: Number(d.WD_Amount_Left ?? 0),
            item: d.I_Name,
            withdrawn: Number(d.WD_Amount ?? 0),
          }))
        );
      } catch {
        // เงียบไว้เพื่อไม่ flash error
      }
    })();
  }, [id]);

  // helper: แปลง Response เป็น JSON แบบทน error body ว่าง
  async function safeJson(res) {
    const txt = await res.text();
    try {
      return txt ? JSON.parse(txt) : {};
    } catch {
      return {};
    }
  }

  const submit = async () => {
    try {
      setLoading(true);
      setErr("");

      console.log("returns:", returns);

      // ตรวจความถูกต้องก่อนส่ง
      for (const r of returns) {
        const val = Number(r.amount === "" ? 0 : r.amount);
        if (!Number.isFinite(val) || val < 0) {
          throw new Error(`จำนวนคืนของ "${r.item}" ไม่ถูกต้อง`);
        }
        if (val > 1000) {
          throw new Error(`จำนวนคืนของ "${r.item}" ต้องไม่เกิน 1000`);
        }
      }

      // สร้าง payload: ส่งเฉพาะรายการที่คืนจริง (>0)
      const items = returns
        .map((r) => ({
          itemId: Number(r.itemId),
          detailId:
            r.detailId != null && Number.isFinite(Number(r.detailId))
              ? Number(r.detailId)
              : undefined,
          amount: Number(r.amount === "" ? 0 : r.amount),
        }))
        .filter((x) => x.amount >= 0);

      // console.log("items ", items);

      if (items.length === 0) {
        throw new Error("กรุณาระบุจำนวนที่คืนอย่างน้อย 1 รายการ");
      }

      // 1) PATCH — อัปเดตสต็อก/ดีเทล/สถานะใบเบิก
      {
        const res = await fetch(`/api/withdraws/${id}/return`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const js = await safeJson(res);
        if (!res.ok) {
          throw new Error(js.error || `คืนของไม่สำเร็จ (PATCH ${res.status})`);
        }
      }

      // 2) POST — บันทึกประวัติธุรกรรม (ไม่ทำให้ล้ม workflow ถ้า fail)
      {
        const res = await fetch(`/api/withdraws/${id}/return`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items /*, note: "ข้อความเพิ่มเติม (ออปชัน)"*/,
          }),
        });
        const js = await safeJson(res);
        if (!res.ok) {
          console.warn("POST transaction failed:", js);
          alert(
            "อัปเดตสต็อกสำเร็จแล้ว แต่บันทึกประวัติธุรกรรมไม่สำเร็จ (POST)"
          );
        }
      }

      router.back();
      router.refresh();
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  const hasEmpty = returns.some(
    (r) => r.amount === "" || !Number.isFinite(Number(r.amount))
  );

  return (
    <ModalWrapper title={`คืนของจากใบเบิก #${id}`} width="w-[700px]">
      <div className="space-y-4 text-sm">
        {/* ตาราง: ชื่อรายการของที่เบิก | จำนวนที่เบิก | จำนวนที่คืน */}
        <div className="overflow-y-auto h-[250px] pr-[10px]">
          <table className="min-w-full border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 sticky top-0">
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
                const withdrawn = Number(d.WD_Amount ?? 0);
                const amountStr = r.amount ?? "";

                const invalid =
                  amountStr !== "" &&
                  (!Number.isFinite(Number(amountStr)) ||
                    Number(amountStr) < 0);

                return (
                  <tr key={d.WD_Id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">
                        {d.I_Name}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">{withdrawn}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          inputMode="numeric"
                          value={amountStr}
                          onChange={(e) => {
                            let n = Number(e.target.value);
                            if (!Number.isFinite(n) || n < 0) n = 0;
                            if (n > 1000) n = 1000;

                            const cp = [...returns];
                            cp[idx] = cp[idx] || {
                              detailId: d.WD_Id,
                              itemId: d.I_Id,
                              amount: "",
                              item: d.I_Name,
                              withdrawn,
                            };
                            cp[idx].amount = String(n);
                            setReturns(cp);
                          }}
                          className={`w-28 rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-center ${
                            invalid ? "border-red-400" : "border-gray-300"
                          }`}
                        />
                      </div>
                      {invalid && (
                        <div className="text-xs text-red-600 mt-1">
                          กรุณาใส่จำนวนที่ถูกต้อง (0–1000)
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
            disabled={loading || hasEmpty}
            className="rounded-md bg-[var(--color-primary)] text-white px-4 py-2 disabled:opacity-50 cursor-pointer hover:bg-[var(--color-primary-dark)]"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกการคืนของ"}
          </button>
          <button
            type="button"
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
