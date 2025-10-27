"use client";
import { useEffect, useState } from "react";
import ModalWrapper from "@/components/modal/ModalWrapper";
import { useParams, useRouter } from "next/navigation";

export default function UserEditModal() {
  const params = useParams();
  const currentUsername =
    typeof params?.username === "string"
      ? params.username
      : String(params?.username ?? "");
  const router = useRouter();

  const [form, setForm] = useState({
    username: currentUsername, // ✅ มี username ใน form
    fullName: "",
    role: "ADMIN",
    password: "",
  });
  const [err, setErr] = useState("");

  // โหลดข้อมูลผู้ใช้
  useEffect(() => {
    if (!currentUsername) return;
    (async () => {
      try {
        const res = await fetch(`/api/users/${currentUsername}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
        const data = await res.json();
        setForm((f) => ({
          ...f,
          username: data.Username || currentUsername,
          fullName: data.Fullname || "",
          role: data.Role || "ADMIN",
        }));
      } catch (e) {
        console.error(e);
        setErr(e.message);
      }
    })();
  }, [currentUsername]);

  const save = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      username: form.username, // ✅ ส่ง username ใหม่
      fullName: form.fullName,
      role: form.role,
    };
    if (form.password) payload.password = form.password;

    try {
      const res = await fetch(`/api/users/${currentUsername}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErr(data.message || data.error || "บันทึกไม่สำเร็จ");
        return;
      }

      // ✅ ถ้า username เปลี่ยน ให้กลับไปหน้า list ใหม่
      if (form.username !== currentUsername) {
        router.push(`/admin/users/${form.username}/edit`);
        router.back();
      } else {
        router.back();
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      setErr(e.message || "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <ModalWrapper title="แก้ไขข้อมูลผู้ใช้">
      <form onSubmit={save} className="space-y-4">
        {/* ✅ username editable */}
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ-สกุล</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">บทบาท</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="HEAD">หัวหน้า</option>
            <option value="HOUSEKEEPER">พนักงานทำความสะอาด</option>
            <option value="PURCHASING DEPARTMENT">พนักงานแผนกจัดซื้อ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            เปลี่ยนรหัสผ่าน (ถ้าต้องการ)
          </label>
          <input
            type="password"
            placeholder="ใส่รหัสใหม่ หรือเว้นว่าง"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] text-white px-4 py-2 hover:bg-[var(--color-primary-dark)] cursor-pointer"
          >
            บันทึก
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
