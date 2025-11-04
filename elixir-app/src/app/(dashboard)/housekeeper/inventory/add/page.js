// src/app/(dashboard)/housekeeper/inventory/add/page.js
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";

export default function AddItemPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [dup, setDup] = useState(false);

  // helper: แปลงค่าให้เป็นเลขภายในช่วง 1..1000 หรือค่าว่าง
  const coerceQty = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = Number(String(v).replace(/[^\d]/g, "")); // กัน non-digit
    if (!Number.isFinite(n)) return "";
    if (n < 1) return 1;
    if (n > 1000) return 1000;
    return n;
  };

  const qtyNum = useMemo(() => (qty === "" ? NaN : Number(qty)), [qty]);

  const isQtyValid = Number.isInteger(qtyNum) && qtyNum >= 1 && qtyNum <= 1000;
  const isNameValid = name.trim().length > 0;

  async function checkDupName(n) {
    // ลองเรียก endpoint ตรวจชื่อซ้ำถ้ามี (ถ้าไม่มีจะ catch แล้วข้าม)
    try {
      const res = await fetch(
        `/api/items/exists?name=${encodeURIComponent(n)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // คาดหวังโครงสร้าง { exists: boolean }
        if (typeof data?.exists === "boolean") return data.exists;
      }
    } catch (_) {
      // ถ้า endpoint ไม่มี/ล้มเหลว ให้ปล่อยผ่านไปเช็คตอน POST แทน
    }
    return false;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // validate ฝั่ง client
    const trimmed = name.trim();
    if (!trimmed) return alert("กรุณากรอกชื่อของ");
    if (!isQtyValid) return alert("จำนวนต้องเป็นตัวเลข 1 ถึง 1000");

    setLoading(true);
    setDup(false);
    try {
      // เช็คชื่อซ้ำล่วงหน้า (ถ้า endpoint รองรับ)
      const exists = await checkDupName(trimmed);
      if (exists) {
        setDup(true);
        return;
      }

      // POST เพิ่มของ
      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          I_Name: trimmed,
          I_Quantity: Number(qtyNum),
        }),
      });

      // พยายามอ่าน body (เผื่อเป็นข้อความดิบ)
      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // กรณี backend แจ้งซ้ำด้วย 409 หรือข้อความบอก duplicate
      if (
        res.status === 409 ||
        /duplicate|already exists|ซ้ำ/i.test(String(data?.error || ""))
      ) {
        setDup(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "เพิ่มของไม่สำเร็จ");
      }

      alert("เพิ่มของสำเร็จ!");
      router.push("/housekeeper/inventory");
    } catch (err) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto">
      <DashboardPageHeader title="เพิ่มของใหม่เข้าคลัง" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">ชื่อของ</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDup(false); // พิมพ์ใหม่ เคลียร์สถานะซ้ำ
            }}
            className="w-full border rounded-md px-3 py-2"
            placeholder="เช่น น้ำยาถูพื้น"
          />
          {dup && (
            <p className="text-red-600 text-sm mt-1">
              มีรายการนี้อยู่แล้วในระบบ
            </p>
          )}
        </div>

        <div>
          <label className="block mb-1 font-medium">
            จำนวนเริ่มต้น (1–1000)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={qty}
            onChange={(e) => {
              const coerced = coerceQty(e.target.value);
              setQty(coerced === "" ? "" : String(coerced));
            }}
            className="w-full border rounded-md px-3 py-2"
            placeholder="เช่น 10"
          />
          {!isQtyValid && qty !== "" && (
            <p className="text-red-600 text-sm mt-1">
              จำนวนต้องเป็นตัวเลข 1 ถึง 1000
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !isNameValid || !isQtyValid}
            className={`flex-1 text-white py-2 rounded-md ${
              loading || !isNameValid || !isQtyValid
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            title={
              !isNameValid ? "กรุณากรอกชื่อของ" : !isQtyValid ? "จำนวนต้องเป็น 1 ถึง 1000" : undefined
            }
          >
            {loading ? "กำลังเพิ่ม..." : "เพิ่มของ"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/housekeeper/inventory")}
            className="flex-1 border border-gray-400 text-gray-700 py-2 rounded-md hover:bg-gray-100"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}
