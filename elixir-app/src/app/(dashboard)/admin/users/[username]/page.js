// src\app\(dashboard)\admin\users\[username]\page.js

"use client";
import useSWR from "swr";
import ModalWrapper from "@/components/modal/ModalWrapper";
import { useParams, useRouter } from "next/navigation";

const fetcher = (u) => fetch(u).then((r) => r.json());

export default function UserDetailModal() {
  const { username } = useParams();
  const { data } = useSWR(`/api/users/${username}`, fetcher);
  const router = useRouter();

  function getRoleName(role) {
    switch (role) {
      case "ADMIN":
        return "ผู้ดูแลระบบ";
      case "HEAD":
        return "หัวหน้า";
      case "HOUSEKEEPER":
        return "พนักงานทำความสะอาด";
      case "PURCHASING DEPARTMENT":
        return "พนักงานแผนกจัดซื้อ";
      default:
        return "ไม่ระบุ";
    }
  }

  if (!data) return null;
  if (data.error)
    return (
      <ModalWrapper title="รายละเอียดผู้ใช้">
        <p className="text-red-600">{data.error}</p>
      </ModalWrapper>
    );

  return (
    <ModalWrapper title="รายละเอียดผู้ใช้" width={"w-[600px]"}>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-500">ชื่อผู้ใช้:</span> {data.Username}
        </div>
        <div>
          <span className="text-gray-500">ชื่อ-สกุล:</span> {data.Fullname}
        </div>
        <div>
          <span className="text-gray-500">บทบาท:</span> {getRoleName(data.Role)}
        </div>
        <div>
          <span className="text-gray-500">สถานะ:</span>{" "}
          {data.Is_Login ? "ใช้งานอยู่" : "ไม่ได้ใช้งาน"}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </ModalWrapper>
  );
}
