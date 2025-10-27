// src/app/(dashboard)/housekeeper/inventory/edit/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ---------- Utils ---------- */
const isInt = (v) => /^-?\d+$/.test(String(v).trim());
const clampNonNegativeInt = (v) => {
  if (!isInt(v)) return 0;
  const n = parseInt(v, 10);
  return n < 0 ? 0 : n;
};

export default function HKInventoryBulkEditPage() {
  const router = useRouter();

  // ตารางจริงจากฐานข้อมูล
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ฉบับร่างที่กำลังแก้ไข (แก้ได้เฉพาะจำนวน)
  const [draftQty, setDraftQty] = useState({}); // { [I_Id]: number|string }
  const [errors, setErrors] = useState({}); // { [I_Id]: { qty?: string } }
  const [saving, setSaving] = useState(false);

  // Note สำหรับรอบการอัปเดตครั้งนี้
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");

  /** โหลดข้อมูลทั้งหมดและสร้างร่างเริ่มต้น */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/items", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRows(list);

      // set draft เฉพาะจำนวน
      const initQty = {};
      list.forEach((r) => {
        initQty[r.I_Id] = r.I_Quantity ?? 0;
      });
      setDraftQty(initQty);
      setErrors({});
    } catch (e) {
      console.error("fetch items failed", e);
      setRows([]);
      setDraftQty({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /** หาเฉพาะรายการที่ถูกแก้ไขจริง (เทียบจำนวน) */
  const changedRows = useMemo(() => {
    const list = [];
    for (const r of rows) {
      const dQty = draftQty[r.I_Id];
      const curQty = Number(r.I_Quantity ?? 0);
      if (dQty === undefined) continue;
      if (Number(dQty) !== curQty) {
        list.push({
          I_Id: r.I_Id,
          I_Quantity: clampNonNegativeInt(dQty),
        });
      }
    }
    return list;
  }, [rows, draftQty]);

  const hasChanges = changedRows.length > 0;

  /** อัปเดตจำนวนในร่าง */
  const setQty = (id, value) => {
    setDraftQty((prev) => ({
      ...prev,
      [id]: String(value).replace(/[^\d-]/g, ""), // ให้พิมพ์เฉพาะตัวเลข/ลบ
    }));
  };

  /** ตรวจความถูกต้องเฉพาะรายการที่มีการเปลี่ยนแปลง + ตรวจ Note */
  const validate = () => {
    const next = {};
    let ok = true;

    // validate per-item qty
    for (const item of changedRows) {
      const e = {};
      if (!isInt(item.I_Quantity)) {
        e.qty = "จำนวนต้องเป็นจำนวนเต็ม";
        ok = false;
      } else if (parseInt(item.I_Quantity, 10) < 0) {
        e.qty = "จำนวนต้องไม่น้อยกว่า 0";
        ok = false;
      }
      if (Object.keys(e).length) next[item.I_Id] = e;
    }
    setErrors(next);

    // validate note
    const trimmed = note.trim();
    if (!trimmed) {
      setNoteError("กรุณากรอก Note สำหรับการอัปเดตรอบนี้");
      ok = false;
    } else if (trimmed.length < 3) {
      setNoteError("Note สั้นเกินไป (อย่างน้อย 3 ตัวอักษร)");
      ok = false;
    } else if (trimmed.length > 500) {
      setNoteError("Note ยาวเกินไป (จำกัด 500 ตัวอักษร)");
      ok = false;
    } else {
      setNoteError("");
    }

    return ok;
  };

  /** บันทึกหลายรายการในครั้งเดียว (Bulk Update) + ส่ง note ไปด้วย */
  const saveAll = async () => {
    if (!hasChanges) {
      alert("ยังไม่มีการแก้ไข");
      return;
    }
    if (!validate()) return;

    try {
      setSaving(true);

      const bulkRes = await fetch("/api/items/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: changedRows,
          note: note.trim(), // ส่งไปกับรอบการอัปเดตนี้
        }),
      });

      if (!bulkRes.ok) {
        const msg = await bulkRes.text();
        throw new Error(msg || "บันทึกไม่สำเร็จ");
      }

      alert("บันทึกสำเร็จ");
      await fetchAll(); // รีโหลดข้อมูลจากฐานข้อมูลให้ตรง
      setNote(""); // เคลียร์โน้ตหลังบันทึก
    } catch (e) {
      console.error("saveAll failed", e);
      alert("บันทึกไม่สำเร็จ: " + (e?.message || "เกิดข้อผิดพลาด"));
    } finally {
      setSaving(false);
    }
  };

  // ตัวช่วยแสดง badge ส่วนต่าง (Δ) = คงเหลือใหม่ - จำนวนปัจจุบัน
  const DeltaBadge = ({ current, next }) => {
    const delta = Number(next) - Number(current);
    if (!isFinite(delta) || delta === 0) return null;
    const sign = delta > 0 ? "+" : "";
    const color =
      delta > 0
        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
        : "text-rose-600 bg-rose-50 border-rose-200";
    return (
      <span
        className={`ml-2 inline-block text-xs border rounded px-1 py-0.5 ${color}`}
      >
        {sign}
        {delta}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-primary]">
            แก้ไขรายการทั้งหมด
          </h1>
          <p className="text-sm text-gray-500">
            แก้ไขเฉพาะจำนวนคงเหลือ พร้อมระบุ Note สำหรับรอบการอัปเดตนี้
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/housekeeper/inventory")}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            ← กลับไปหน้ารายการ
          </button>
          <button
            onClick={saveAll}
            disabled={saving || !hasChanges}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            title={!hasChanges ? "ยังไม่มีการเปลี่ยนแปลง" : ""}
          >
            {saving
              ? "กำลังบันทึก..."
              : `บันทึกทั้งหมด (${changedRows.length})`}
          </button>
        </div>
      </div>

      {/* Note สำหรับรอบการอัปเดตนี้ */}
      <div className="rounded-xl border p-4">
        <label className="block text-sm font-medium mb-2">
          Note สำหรับการอัปเดตรอบนี้ <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น เติมของเข้าคลัง 20 ชิ้นจากใบสั่งซื้อ #PO-2025-001 หรือ แก้ไขยอดหลังตรวจนับประจำเดือน"
          className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 min-h-[96px] ${
            noteError
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300 focus:ring-[--color-primary]"
          }`}
          maxLength={500}
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          {noteError ? (
            <span className="text-red-500">{noteError}</span>
          ) : (
            <span className="text-gray-500">อักษรสูงสุด 500 ตัวอักษร</span>
          )}
          <span className="text-gray-400">{note.trim().length}/500</span>
        </div>
      </div>

      {/* ตารางแก้ไข */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {/* <th className="text-left px-4 py-2">รหัส</th> */}
              <th className="text-left px-4 py-2">รายการ</th>
              <th className="text-right px-4 py-2">จำนวนปัจจุบัน</th>
              <th className="text-right px-4 py-2">จำนวนใหม่</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const currentQty = Number(r.I_Quantity ?? 0);
              const dQtyRaw = draftQty[r.I_Id] ?? currentQty;
              const dQty = String(dQtyRaw);
              const err = errors[r.I_Id] || {};
              return (
                <tr key={`edit-${r.I_Id}`} className="border-t align-top">
                  {/* ชื่อรายการ (อ่านอย่างเดียว) */}
                  <td className="px-4 py-2 align-middle">
                    <div className="font-medium">{r.I_Name ?? "-"}</div>
                    {/* ถ้าต้องการแสดงรหัสด้วย ให้ปลดคอมเมนต์บรรทัดล่าง */}
                    {/* <div className="text-xs text-gray-500 mt-0.5">ID: {r.I_Id}</div> */}
                  </td>

                  {/* จำนวนปัจจุบัน (อ่านอย่างเดียว) */}
                  <td className="px-4 py-2 text-right align-middle">
                    <span className="inline-block min-w-20">{currentQty}</span>
                  </td>

                  {/* คงเหลือใหม่ (แก้ไขได้เฉพาะจำนวน) */}
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end">
                      <input
                        inputMode="numeric"
                        value={dQty}
                        onChange={(e) => setQty(r.I_Id, e.target.value)}
                        onBlur={(e) =>
                          setQty(
                            r.I_Id,
                            String(clampNonNegativeInt(e.target.value))
                          )
                        }
                        className={`w-32 rounded-md border px-2 py-1 text-right focus:outline-none focus:ring-1 ${
                          err.qty
                            ? "border-red-400 focus:ring-red-400"
                            : "border-gray-300 focus:ring-[--color-primary]"
                        }`}
                        placeholder="0"
                      />
                      <DeltaBadge current={currentQty} next={dQty} />
                    </div>
                    {err.qty && (
                      <div className="text-xs text-red-500 mt-1 text-left">
                        {err.qty}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action bar ล่าง (เพื่อความสะดวกบนจอเล็ก) */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/housekeeper/inventory")}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          ← กลับไปหน้ารายการ
        </button>
        <button
          onClick={saveAll}
          disabled={saving || !hasChanges}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : `บันทึกทั้งหมด (${changedRows.length})`}
        </button>
      </div>
    </div>
  );
}
