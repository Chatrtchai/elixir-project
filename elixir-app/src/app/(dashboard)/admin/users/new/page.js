"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";
import { Eye, EyeOff } from "lucide-react"; // 👈 ใช้ไอคอนจาก lucide-react

export default function NewUserModal() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "ADMIN",
  });
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 สถานะเปิด/ปิดตา

  const validateForm = () => {
    if (!form.username || !form.password || !form.fullName) {
      setErr("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return false;
    }

    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(form.username)) {
      setErr(
        "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษตัวพิมพ์เล็ก และใช้ได้เฉพาะ a-z, 0-9, _ และ - เท่านั้น"
      );
      return false;
    }

    if (form.username.length < 4) {
      setErr(
        "ความยาวชื่อผู้ใช้งานอย่างน้อย 4 ตัวอักษร"
      );
      return false;
    }

    if (form.username.length > 12) {
      setErr("ความยาวชื่อผู้ใช้งานไม่เกิน 12 ตัวอักษร");
      return false;
    }

    const fullNameRegex = /^[A-Za-zก-๙\s]+$/;
    if (!fullNameRegex.test(form.fullName)) {
      setErr("ชื่อ-สกุลต้องเป็นตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น");
      return false;
    }

    if (form.fullName.length > 40) {
      setErr("ความยาวชื่อ-สกุลไม่เกิน 40 ตัวอักษร");
      return false;
    }

    if (form.password && form.password.length < 4) {
      setErr("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return false;
    }

    if (form.password && form.password.length > 12) {
      setErr("รหัสผ่านต้องมีความยาวไม่เกิน 12 ตัวอักษร");
      return false;
    }

    return true;
  };

  const save = async (e) => {
    e.preventDefault();
    setErr("");

    if (!validateForm()) return;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "บันทึกไม่สำเร็จ");

    router.back();
    router.refresh();
  };

  return (
    <ModalWrapper title="เพิ่มบัญชีผู้ใช้งาน" width={"w-[600px]"}>
      <form onSubmit={save} className="space-y-4">
        {/* username */}
        <div>
          <label className="block text-sm font-medium mb-1">
            ชื่อผู้ใช้ (ภาษาอังกฤษ)
          </label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        {/* password */}
        <div>
          <label className="block text-sm font-medium mb-1">
            รหัสผ่าน (เริ่มต้น)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* full name */}
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ-สกุล</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>

        {/* role */}
        <div>
          <label className="block text-sm font-medium mb-1">บทบาท</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {/* <option value="ADMIN">ผู้ดูแลระบบ</option> */}
            <option value="HEAD">หัวหน้า</option>
            <option value="HOUSEKEEPER">พนักงานทำความสะอาด</option>
            <option value="PURCHASING DEPARTMENT">พนักงานแผนกจัดซื้อ</option>
          </select>
        </div>

        {/* error */}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {/* buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] text-white px-4 py-2 hover:bg-[var(--color-primary-dark)] cursor-pointer"
          >
            บันทึก
          </button>
          <button
            onClick={() => router.back()}
            type="button"
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
