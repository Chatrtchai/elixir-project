"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddItemPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !qty) return alert("กรุณากรอกข้อมูลให้ครบ");

    try {
      setLoading(true);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ I_Name: name.trim(), I_Quantity: Number(qty) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เพิ่มของไม่สำเร็จ");
      alert("เพิ่มของสำเร็จ");
      router.push("/housekeeper/inventory");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-primary)]">
        เพิ่มของใหม่เข้าคลัง
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">ชื่อของ</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="เช่น น้ำยาถูพื้น"
          />
        </div>
        <div>
          <label className="block mb-1">จำนวนเริ่มต้น</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="เช่น 10"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
        >
          {loading ? "กำลังเพิ่ม..." : "เพิ่มของ"}
        </button>
      </form>
    </div>
  );
}
