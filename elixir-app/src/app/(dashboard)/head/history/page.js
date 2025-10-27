export default function HeadHistoryPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[--color-primary]">
        ประวัติการทำรายการ
      </h1>
      <p className="text-gray-500 text-sm">
        หน้านี้จะแสดงการอนุมัติ/ปฏิเสธของหัวหน้า และการเปลี่ยนสถานะของคำขอ (ต่อ
        API ได้ภายหลัง)
      </p>
      <div className="rounded-xl border p-6 text-sm text-gray-500">
        (WIP) — เตรียมเชื่อมต่อกับตาราง RequestTransaction / AuditLog
      </div>
    </div>
  );
}
