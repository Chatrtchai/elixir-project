export default function AdminHistoryPage() {
  // คุณสามารถต่อ API /api/history ได้ภายหลัง
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[--color-primary]">
        ประวัติการทำรายการ
      </h1>
      <p className="text-gray-500 text-sm">
        หน้านี้จะแสดง log การเปลี่ยนแปลง/เพิ่ม/ลบผู้ใช้ และเหตุการณ์สำคัญ
      </p>
      <div className="rounded-xl border p-6 text-sm text-gray-500">
        (ยังไม่มีข้อมูล) — เตรียมต่อ API ในภายหลัง เช่น RequestTransaction /
        AuditLog
      </div>
    </div>
  );
}
