// src/app/(dashboard)/housekeeper/requests/new/page.js

"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function NewHKRequestModal() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [lines, setLines] = useState([]); // [{ itemId: "", amount: "" }]
  const [heads, setHeads] = useState([]); // รายชื่อหัวหน้า
  const [headUsername, setHeadUsername] = useState(""); // หัวหน้าที่เลือก
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    if (!headUsername) return false; // ต้องเลือกหัวหน้า
    if (lines.length === 0) return false; // ต้องมีอย่างน้อย 1 รายการ
    // แต่ละรายการต้องเลือกของ และจำนวน > 0
    return lines.every(
      (l) => l.itemId && l.itemId !== "" && Number(l.amount) > 0
    );
  }, [headUsername, lines]);

  // โหลดรายการ Item
  useEffect(() => {
    (async () => {
      try {
        const [itemRes, headRes] = await Promise.all([
          fetch("/api/items", { cache: "no-store" }),
          fetch("/api/users?role=head", { cache: "no-store" }),
        ]);
        const [itemData, headData] = await Promise.all([
          itemRes.json(),
          headRes.json(),
        ]);
        setItems(Array.isArray(itemData) ? itemData : []);
        setHeads(Array.isArray(headData) ? headData : []);
      } catch {
        setItems([]);
        setHeads([]);
      }
    })();
  }, []);

  const addLine = () =>
    setLines((prev) => [...prev, { itemId: "", amount: "" }]);
  const removeLine = (i) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const save = async (e) => {
    e.preventDefault();
    setErr("");

    // ตรวจความถูกต้องอย่างง่าย
    if (!headUsername) return setErr("กรุณาเลือกหัวหน้าที่รับผิดชอบ");

    for (const [idx, l] of lines.entries()) {
      if (!l.itemId) return setErr(`กรุณาเลือกรายการที่แถวที่ ${idx + 1}`);
      if (l.amount === "" || Number(l.amount) <= 0)
        return setErr(`กรุณากรอกจำนวน (> 0) ที่แถวที่ ${idx + 1}`);
    }

    const payload = {
      headUsername,
      items: lines.map((l) => ({
        itemId: Number(l.itemId),
        amount: Number(l.amount),
      })),
    };

    // NOTE: ให้ API POST /api/requests สร้างคำขอ (status=Waiting, hkUsername=จาก session)
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data?.error || "บันทึกไม่สำเร็จ");

    router.replace(`/housekeeper/requests?ts=${Date.now()}`);
  };

  // helper: หาสต็อกคงเหลือของ item ที่เลือก
  const currentQtyOf = (itemId) => {
    const it = items.find((x) => String(x.I_Id) === String(itemId));
    return typeof it?.I_Quantity === "number" ? it.I_Quantity : "-";
  };

  return (
    <ModalWrapper title="สร้างคำขอสั่งซื้อ" width="w-[880px]">
      <form onSubmit={save} className="space-y-4">
        {/* 🧩 เลือกหัวหน้า */}
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-6">
            <label className="block text-sm font-medium mb-1">
              หัวหน้าที่รับผิดชอบ
            </label>
            <select
              value={headUsername}
              onChange={(e) => setHeadUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            >
              <option value="">-- เลือกหัวหน้า --</option>
              {heads.map((h) => (
                <option key={h.Username} value={h.Username}>
                  {h.Fullname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 🧾 รายการขอซื้อ */}
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            {/* รายการ */}
            <div className="col-span-6">
              <label className="block text-sm font-medium mb-1">รายการ</label>
              <select
                value={l.itemId}
                onChange={(e) => {
                  const cp = [...lines];
                  cp[i].itemId = e.target.value;
                  setLines(cp);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
              >
                <option value="">-- เลือกรายการ --</option>
                {items.map((it) => (
                  <option key={it.I_Id} value={it.I_Id}>
                    {it.I_Name}
                  </option>
                ))}
              </select>
            </div>

            {/* จำนวนปัจจุบัน (สต็อก) */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1 text-center">
                จำนวนปัจจุบัน
              </label>
              <input
                value={currentQtyOf(l.itemId)}
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-center"
              />
            </div>

            {/* จำนวนที่ขอเพิ่ม */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1 text-center">
                จำนวนที่ขอเพิ่ม
              </label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={l.amount}
                onChange={(e) => {
                  const cp = [...lines];
                  cp[i].amount = e.target.value;
                  setLines(cp);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary] text-center"
              />
            </div>

            {/* ลบแถว */}
            <div className="col-span-1">
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="w-full rounded-md px-3 py-2 text-white bg-red-500 hover:bg-red-600 cursor-pointer text-center"
              >
                ลบ
              </button>
            </div>
          </div>
        ))}

        {/* ปุ่มควบคุม */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={addLine}
            className="rounded-md border px-3 py-2 hover:bg-gray-50 cursor-pointer"
          >
            + เพิ่มรายการ
          </button>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={!canSubmit} // ✅ ปุ่มจะทำงานเมื่อผ่านเงื่อนไข
              className={`rounded-md px-4 py-2 cursor-pointer text-white
                ${
                  canSubmit
                    ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              aria-disabled={!canSubmit}
              title={
                !canSubmit ? "เลือกหัวหน้าและระบุจำนวน (> 0) ให้ครบทุกแถว" : ""
              }
            >
              ส่งคำขอ
            </button>
            <button
              onClick={() => router.back()}
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </ModalWrapper>
  );
}
