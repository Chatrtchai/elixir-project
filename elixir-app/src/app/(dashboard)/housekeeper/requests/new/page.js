// src/app/(dashboard)/housekeeper/requests/new/page.js

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function NewHKRequestModal() {
  const router = useRouter();

  // โหลดข้อมูล
  const [items, setItems] = useState([]); // [{ I_Id, I_Name, I_Quantity }]
  const [heads, setHeads] = useState([]); // [{ Username, Fullname }]
  const [loadingItems, setLoadingItems] = useState(false);

  // ฟอร์ม
  const [headUsername, setHeadUsername] = useState("");
  const [lines, setLines] = useState([]); // [{ itemId, amount }]
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // ค้นหา + dropdown (สไตล์เดียวกับ requisition/new/page.js)
  const [q, setQ] = useState("");
  const [showDD, setShowDD] = useState(false);
  const [selectedId, setSelectedId] = useState(""); // item ที่เลือกจาก dropdown
  const searchBoxRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingItems(true);
        const [itemRes, headRes] = await Promise.all([
          fetch("/api/items", { cache: "no-store" }),
          fetch("/api/users?role=head", { cache: "no-store" }),
        ]);
        const [itemData, headData] = await Promise.all([
          itemRes.json().catch(() => []),
          headRes.json().catch(() => []),
        ]);
        setItems(Array.isArray(itemData) ? itemData : []);
        setHeads(Array.isArray(headData) ? headData : []);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, []);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    const onClick = (e) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target)) setShowDD(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // helpers
  const findItem = (id) => items.find((it) => String(it.I_Id) === String(id));

  const chosenIds = useMemo(
    () => new Set(lines.map((l) => String(l.itemId)).filter(Boolean)),
    [lines]
  );

  // คงเหลือของแถว i = สต็อกจริง - ผลรวมที่แถวอื่นๆ ขอเพิ่มของ item เดียวกัน
  const remainingForLine = (i) => {
    const line = lines[i];
    if (!line?.itemId) return 0;
    const item = findItem(line.itemId);
    if (!item) return 0;
    const usedElsewhere = lines.reduce((sum, l, idx) => {
      if (idx === i) return sum;
      if (String(l.itemId) === String(line.itemId)) {
        return sum + Number(l.amount || 0);
      }
      return sum;
    }, 0);
    return Math.max(Number(item.I_Quantity || 0) - usedElsewhere, 0);
  };

  // ตัวเลือกที่ search เจอ (ตัดที่ถูกเลือกแล้วออก) — เหมือน requisition
  const suggestions = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return [];
    return items
      .filter(
        (it) =>
          (it.I_Name || "").toLowerCase().includes(keyword) &&
          !chosenIds.has(String(it.I_Id))
      )
      .slice(0, 10);
  }, [q, items, chosenIds]);

  // ฟอร์มไม่ถูกต้อง?
  const hasInvalid = useMemo(() => {
    if (!headUsername) return true;
    if (!lines.length) return true;
    // ห้ามซ้ำ
    const seen = new Set();
    for (const l of lines) {
      if (!l.itemId) return true;
      const k = String(l.itemId);
      if (seen.has(k)) return true;
      seen.add(k);
    }
  }, [lines, headUsername]);

  // เพิ่มจากปุ่ม “เพิ่มรายการ” (เลือกจาก dropdown)
  const addSelected = () => {
    setErr("");
    const id = selectedId || ""; // จาก dropdown
    if (!id) return setErr("กรุณาเลือกสินค้าในช่องค้นหาก่อน");
    if (chosenIds.has(String(id))) return setErr("เลือกรายการซ้ำไม่ได้");
    const item = findItem(id);
    if (!item) return setErr("ไม่พบสินค้า");
    if (Number(item.I_Quantity) <= 0) return setErr("สินค้าในสต็อกหมด");

    setLines((prev) => [...prev, { itemId: id, amount: "" }]);

    // เคลียร์การเลือก
    setSelectedId("");
    setQ("");
    setShowDD(false);
  };

  const removeLine = (i) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setErr("");

    // ตรวจซ้ำก่อนส่ง
    const seen = new Set();
    for (const element of lines) {
      const l = element;
      if (!l.itemId) return setErr("กรุณาเลือกรายการให้ครบถ้วน");
      const k = String(l.itemId);
      if (seen.has(k)) return setErr("ไม่สามารถเลือกรายการซ้ำในหลายแถวได้");
      seen.add(k);

      let n = Number(l.amount ?? "");
      if (!Number.isFinite(n) || n <= 0) return setErr("จำนวนต้องมากกว่า 0");
      if (n > 1000) n = 1000; // clamp ฝั่ง client
    }

    const payload = {
      headUsername,
      items: lines.map((l) => ({
        itemId: Number(l.itemId),
        amount: Math.min(Number(l.amount), 1000),
      })),
    };

    console.log(payload);

    setSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "บันทึกไม่สำเร็จ");

      router.replace(`/housekeeper/requests`);
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="สร้างคำขอสั่งซื้อ" width="w-[600px]">
      {/* กล่อง modal: สไตล์เดียวกับ requisition/new/page.js */}
      <form
        onSubmit={save}
        className="w-full max-h-[85vh] p-3 bg-white rounded-[10px] flex flex-col gap-2.5 overflow-hidden"
      >
        {/* เลือกหัวหน้า */}
        <div className="flex flex-col gap-1">
          <label className="text-[13px] text-gray-600">
            หัวหน้าที่รับผิดชอบ
          </label>
          <select
            value={headUsername}
            onChange={(e) => setHeadUsername(e.target.value)}
            className="w-full px-3 py-2.5 bg-white rounded-lg border focus:outline-[var(--color-primary)]"
          >
            <option value="">-- เลือกหัวหน้า --</option>
            {heads.map((h) => (
              <option key={h.Username} value={h.Username}>
                {h.Fullname}
              </option>
            ))}
          </select>
        </div>

        {/* แสดงส่วนค้นหา/เพิ่ม และตาราง เฉพาะเมื่อเลือกหัวหน้าแล้ว */}
        {!headUsername ? (
          <div>
          </div>
        ) : (
          <>
            {/* แถวค้นหา + ปุ่มเพิ่ม (stack บนมือถือ) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2.5">
              {/* Search + Dropdown (เหมือนหน้า requisition) */}
              <div ref={searchBoxRef} className="relative flex-1">
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setShowDD(true);
                    setSelectedId(""); // reset เมื่อพิมพ์ใหม่
                  }}
                  onFocus={() => q && setShowDD(true)}
                  placeholder="ค้นหา (รายการ)"
                  className="w-full px-3 py-2.5 bg-white rounded-lg border focus:outline-[var(--color-primary)]"
                />
                {/* Dropdown */}
                {showDD && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto bg-white border rounded-lg shadow">
                    {loadingItems && (
                      <div className="px-3 py-2 text-gray-500">
                        กำลังโหลด...
                      </div>
                    )}
                    {!loadingItems &&
                      suggestions.length > 0 &&
                      suggestions.map((it) => (
                        <button
                          type="button"
                          key={it.I_Id}
                          onClick={() => {
                            setQ(it.I_Name);
                            setSelectedId(String(it.I_Id));
                            setShowDD(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        >
                          {it.I_Name}{" "}
                          <span className="text-xs text-gray-500">
                            (คงเหลือ {it.I_Quantity})
                          </span>
                        </button>
                      ))}
                    {!loadingItems && suggestions.length === 0 && q.trim() && (
                      <div className="px-3 py-2 text-gray-500">ไม่พบรายการ</div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={addSelected}
                className={`h-[42px] px-5 py-1 rounded-[5px] text-white text-sm font-medium sm:w-auto w-full cursor-pointer flex-shrink-0
          ${
            saving
              ? "bg-gray-400 cursor-wait"
              : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
          }`}
                disabled={saving}
              >
                {saving ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}
              </button>
            </div>

            {/* หัวตาราง (ซ่อนบนจอเล็ก) */}
            <div className="px-[5px] hidden sm:flex items-center text-sm text-gray-500 font-medium">
              <div className="flex-1">รายการ</div>
              <div className="flex-1 text-center">จำนวนคงเหลือ</div>
              <div className="flex-1 text-center">จำนวนที่ขอเพิ่ม (1–1000)</div>
              <div className="flex-1 text-center">ดำเนินการ</div>
            </div>

            {/* เนื้อหา: แถว responsive แบบเดียวกับ requisition */}
            <div className="flex-1 overflow-auto">
              {lines.map((l, i) => {
                const item = l.itemId ? findItem(l.itemId) : null;
                const remainNow = l.itemId ? remainingForLine(i) : "";
                const over =
                  Number(l.amount || 0) >
                  (Number.isFinite(remainNow) ? remainNow : Infinity);

                return (
                  <div
                    key={i}
                    className="px-[5px] py-2 border-b last:border-b-0"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
                      {/* รายการ */}
                      <div className="sm:col-span-1">
                        <div className="sm:hidden text-[13px] text-gray-500">
                          รายการ
                        </div>
                        <div className="text-black font-medium">
                          {item?.I_Name || "-"}
                        </div>
                      </div>

                      {/* คงเหลือ */}
                      <div className="sm:col-span-1">
                        <div className="sm:hidden text-[13px] text-gray-500">
                          จำนวนคงเหลือ
                        </div>
                        <div className="w-full text-center px-2.5 py-[9px] bg-gray-50 rounded-lg outline-gray-200 text-gray-600">
                          {remainNow || "-"}
                        </div>
                      </div>

                      {/* จำนวน */}
                      <div className="sm:col-span-1">
                        <div className="sm:hidden text-[13px] text-gray-500">
                          จำนวนที่ขอเพิ่ม (0–1000)
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={l.amount}
                          onChange={(e) => {

                            const cp = [...lines];

                            let n = Number(e.target.value);

                            if (!Number.isFinite(n) || n < 0) { 
                              n = 1; 
                            }
        
                            if (n > 1000) {
                              n = 1000;
                            }

                            cp[i].amount = n;
                            setLines(cp);
                          }}
                          className={[
                            "w-full text-center px-2.5 py-[9px] bg-white rounded-lg",
                            over
                              ? "outline-red-400"
                              : "outline-gray-300 focus:outline-[var(--color-primary)]",
                          ].join(" ")}
                          placeholder="กรอกจำนวน"
                        />
                      </div>

                      {/* ลบ */}
                      <div className="sm:col-span-1">
                        <div className="sm:hidden text-[13px] text-gray-500">
                          ดำเนินการ
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="w-full px-5 py-[9px] rounded-[5px] bg-red-500 text-white text-sm cursor-pointer hover:bg-red-600"
                          disabled={saving}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!lines.length && (
                <div className="px-[5px] py-6 text-center text-gray-500">
                  ยังไม่มีรายการ — ค้นหา เลือก แล้วกด “เพิ่มรายการ”
                </div>
              )}
            </div>
          </>
        )}

        {/* Error */}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {/* ปุ่มส่งคำขอ */}
        <div className="min-h-9 flex items-center justify-center gap-3">
          <button
            type="submit"
            disabled={hasInvalid || saving}
            className={`w-full sm:w-auto px-5 py-2 rounded-[5px] text-white text-sm font-medium
              ${
                hasInvalid || saving
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
              }
              ${saving ? "cursor-wait" : ""}`}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                กำลังบันทึก...
              </span>
            ) : (
              "ส่งคำขอ"
            )}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            disabled={saving}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
