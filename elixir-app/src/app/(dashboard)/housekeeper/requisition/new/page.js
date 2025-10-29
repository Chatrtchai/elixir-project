// src/app/(dashboard)/housekeeper/requisition/new/page.js

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function NewWithdrawModal() {
  const router = useRouter();

  // items จาก /api/items -> [{ I_Id, I_Name, I_Quantity }, ...]
  const [items, setItems] = useState([]);
  // บรรทัดที่เลือกแล้ว -> [{ itemId, amount }]
  const [lines, setLines] = useState([]);
  const [err, setErr] = useState("");

  // ค้นหา + dropdown
  const [q, setQ] = useState("");
  const [showDD, setShowDD] = useState(false);
  const [selectedId, setSelectedId] = useState(""); // item ที่เลือกจาก dropdown
  const searchBoxRef = useRef(null);

  // โหลดรายการของ
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/items");
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json() : [];
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("โหลดข้อมูล items ล้มเหลว:", e);
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

  // คงเหลือของแถว i = สต็อกจริง - ผลรวมที่แถวอื่นๆ เบิกของ item เดียวกัน
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

  // ตัวเลือกที่ search เจอ (ตัดของที่ถูกเลือกแล้วออก)
  const suggestions = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return [];
    return items
      .filter(
        (it) =>
          it.I_Name.toLowerCase().includes(keyword) &&
          !chosenIds.has(String(it.I_Id))
      )
      .slice(0, 10);
  }, [q, items, chosenIds]);

  // ฟอร์มไม่ถูกต้อง?
  const hasInvalid = useMemo(() => {
    if (!lines.length) return true;
    // ห้ามซ้ำ
    const seen = new Set();
    for (const l of lines) {
      if (!l.itemId) return true;
      const k = String(l.itemId);
      if (seen.has(k)) return true;
      seen.add(k);
    }
    // จำนวน > 0 และไม่เกินคงเหลือ
    for (let i = 0; i < lines.length; i++) {
      const n = Number(lines[i].amount || 0);
      if (!Number.isFinite(n) || n <= 0) return true;
      if (n > remainingForLine(i)) return true;
    }
    return false;
  }, [lines, items]);

  // เพิ่มจากปุ่ม “เพิ่มรายการเบิก”
  const addSelected = () => {
    setErr("");
    const id = selectedId || ""; // จาก dropdown ที่เลือก
    if (!id) {
      setErr("กรุณาเลือกสินค้าในช่องค้นหาก่อน");
      return;
    }
    if (chosenIds.has(String(id))) {
      setErr("เลือกรายการซ้ำไม่ได้");
      return;
    }
    const item = findItem(id);
    if (!item) {
      setErr("ไม่พบสินค้า");
      return;
    }
    if (Number(item.I_Quantity) <= 0) {
      setErr("สินค้าในสต็อกหมด");
      return;
    }
    setLines((prev) => [...prev, { itemId: id, amount: "" }]);
    // เคลียร์การเลือก
    setSelectedId("");
    setQ("");
    setShowDD(false);
  };

  const addEmptyLine = () =>
    setLines((prev) => [...prev, { itemId: "", amount: "" }]);

  const removeLine = (i) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const save = async (e) => {
    e.preventDefault();
    setErr("");

    if (!lines.length) return setErr("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");

    // ตรวจซ้ำก่อนส่ง
    const seen = new Set();
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.itemId) return setErr("กรุณาเลือกรายการให้ครบถ้วน");
      const k = String(l.itemId);
      if (seen.has(k)) return setErr("ไม่สามารถเลือกของซ้ำในหลายแถวได้");
      seen.add(k);

      const n = Number(l.amount || 0);
      if (!Number.isFinite(n) || n <= 0) return setErr("จำนวนต้องมากกว่า 0");
      if (n > remainingForLine(i)) return setErr("จำนวนที่เบิกเกินคงเหลือ");
    }

    const payload = {
      items: lines.map((l) => ({
        itemId: Number(l.itemId),
        amount: Number(l.amount),
      })),
    };

    try {
      const res = await fetch("/api/withdraws", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      router.back();
      router.refresh();
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    }
  };

  // Render (Responsive)
  return (
    <ModalWrapper title="สร้างรายการเบิก" width="max-w-[600px]">
      {/* กล่อง modal: กว้างเต็มบนมือถือ, จำกัดความกว้างบนจอใหญ่, สูงไม่เกิน 85vh */}
      <form
        onSubmit={save}
        className="w-full max-h-[85vh] p-3 bg-white rounded-[10px] flex flex-col gap-2.5 overflow-hidden"
      >
        {/* หัวข้อ */}

        {/* แถวค้นหา + ปุ่มเพิ่ม (stack บนมือถือ) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2.5">
          {/* Search + Dropdown */}
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
            {showDD && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto bg-white border rounded-lg shadow">
                {suggestions.map((it) => (
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
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={addSelected}
            className="h-[42px] px-5 py-1 bg-[var(--color-primary)] rounded-[5px] text-white text-sm font-medium sm:w-auto w-full cursor-pointer flex-shrink-0"
          >
            เพิ่มรายการเบิก
          </button>
        </div>

        {/* หัวตาราง (ซ่อนบนจอเล็ก) */}
        <div className="px-[5px] hidden sm:flex items-center text-sm text-gray-500 font-medium">
          <div className="flex-1">รายการ</div>
          <div className="flex-1 text-center">จำนวนที่เหลือ</div>
          <div className="flex-1 text-center">จำนวน</div>
          <div className="flex-1 text-center">ดำเนินการ</div>
        </div>

        {/* เนื้อหาตาราง: เลื่อนภายใน, แถว responsive */}
        <div className="flex-1 overflow-auto">
          {lines.map((l, i) => {
            const item = l.itemId ? findItem(l.itemId) : null;
            const remainNow = l.itemId ? remainingForLine(i) : "";
            const over = Number(l.amount || 0) > (remainNow || Infinity);

            return (
              <div key={i} className="px-[5px] py-2 border-b last:border-b-0">
                {/* จอเล็ก: stack เป็น 2 คอลัมน์ */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
                  {/* รายการ */}
                  <div className="sm:col-span-1">
                    <div className="sm:hidden text-[13px] text-gray-500">
                      รายการ
                    </div>
                    {!l.itemId ? (
                      <select
                        value={l.itemId}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (
                            v &&
                            chosenIds.has(String(v)) &&
                            String(v) !== String(l.itemId)
                          ) {
                            setErr("เลือกรายการซ้ำไม่ได้");
                            return;
                          }
                          const cp = [...lines];
                          cp[i].itemId = v;
                          // reset amount ถ้าเกินคงเหลือใหม่
                          const maxNow = v ? remainingForLine(i) : 0;
                          const cur = Number(cp[i].amount || 0);
                          if (cur > maxNow) cp[i].amount = maxNow || "";
                          setLines(cp);
                        }}
                        className="w-full px-2.5 py-[9px] bg-white rounded-lg outline-gray-300"
                      >
                        <option value="">-- เลือกรายการ --</option>
                        {items
                          .filter(
                            (it) =>
                              String(it.I_Id) === String(l.itemId) ||
                              !chosenIds.has(String(it.I_Id))
                          )
                          .map((it) => (
                            <option key={it.I_Id} value={it.I_Id}>
                              {it.I_Name} (คงเหลือ {it.I_Quantity})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="text-black font-medium">
                        {item?.I_Name || "-"}
                      </div>
                    )}
                  </div>

                  {/* คงเหลือ */}
                  <div className="sm:col-span-1">
                    <div className="sm:hidden text-[13px] text-gray-500">
                      จำนวนที่เหลือ
                    </div>
                    <div className="w-full text-center px-2.5 py-[9px] bg-gray-50 rounded-lg outline-gray-200 text-gray-600">
                      {remainNow || "-"}
                    </div>
                  </div>

                  {/* จำนวน */}
                  <div className="sm:col-span-1">
                    <div className="sm:hidden text-[13px] text-gray-500">
                      จำนวน
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={l.itemId ? remainNow : undefined}
                      value={l.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cp = [...lines];
                        let n = Number(val);
                        if (!Number.isFinite(n) || n <= 0) {
                          cp[i].amount = "";
                        } else {
                          const maxNow = Number(remainingForLine(i));
                          if (n > maxNow) n = maxNow;
                          cp[i].amount = n;
                        }
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
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {/* ปุ่มสร้างรายการ (เต็มความกว้างบนมือถือ) */}
        <div className="min-h-9 flex items-center justify-center gap-3">
          <button
            type="submit"
            disabled={hasInvalid}
            className="w-full sm:w-auto px-5 py-2 rounded-[5px] bg-green-600 text-white text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-green-700"
          >
            สร้างรายการเบิก
          </button>

          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
