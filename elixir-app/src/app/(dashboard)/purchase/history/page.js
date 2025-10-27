export default function PurchaseHistoryPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[--color-primary]">
        ประวัติการทำรายการ
      </h1>
      <p className="text-gray-500 text-sm">
        จะแสดง log ของฝ่ายจัดซื้อ เช่น เริ่มจัดซื้อ/รับของ/เสร็จสิ้น
      </p>
      <div className="rounded-xl border p-6 text-sm text-gray-500">
        (WIP) — เตรียมเชื่อมต่อกับตาราง RequestTransaction / AuditLog
      </div>
    </div>
  );
}
