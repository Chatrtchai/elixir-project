"use client";
import { useEffect, useState } from "react";
import ModalWrapper from "@/components/modal/ModalWrapper";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function UserEditModal() {
  const params = useParams();
  const currentUsername =
    typeof params?.username === "string"
      ? params.username
      : String(params?.username ?? "");
  const router = useRouter();

  const [form, setForm] = useState({
    username: currentUsername,
    fullName: "",
    role: "",
    password: "",
  });
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // ✅ ตรวจสอบความถูกต้องก่อนบันทึก
  const validateForm = () => {
    if (!form.fullName || !form.role) {
      setErr("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return false;
    }

    // ตรวจสอบ username (ถึงแม้จะ disabled ก็กันไว้)
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(form.username)) {
      setErr(
        "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษตัวพิมพ์เล็ก และใช้ได้เฉพาะ a-z, 0-9, _ และ - เท่านั้น"
      );
      return false;
    }

    if (form.username.length < 4) {
      setErr("ความยาวชื่อผู้ใช้งานอย่างน้อย 4 ตัวอักษร");
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

    // ตรวจสอบ password ถ้ามีกรอกใหม่
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

    const payload = {
      username: form.username,
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
    <ModalWrapper title="แก้ไขข้อมูลผู้ใช้" width={"w-[600px]"}>
      <form onSubmit={save} className="space-y-4">
        {/* username */}
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
          <input
            className="w-full rounded-md border px-3 py-2 bg-gray-50"
            value={form.username}
            disabled
            required
          />
        </div>

        {/* fullName */}
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
            <option value="HOUSEKEEPER">พนักงานทำความสะอาด</option>
            <option value="HEAD">หัวหน้า</option>
            <option value="PURCHASING DEPARTMENT">พนักงานแผนกจัดซื้อ</option>
          </select>
        </div>

        {/* password */}
        <div>
          <label className="block text-sm font-medium mb-1">
            เปลี่ยนรหัสผ่าน (ถ้าต้องการ)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="ใส่รหัสใหม่ หรือเว้นว่าง"
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[--color-primary]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* error message */}
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
