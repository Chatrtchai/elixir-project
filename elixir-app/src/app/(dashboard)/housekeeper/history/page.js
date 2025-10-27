export default function HKHistoryPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[--color-primary]">
        ประวัติการทำรายการ
      </h1>
      <p className="text-gray-500 text-sm">
        จะแสดงการเบิกของ/คืนของ และคำขอจัดซื้อของผู้ใช้นี้
      </p>
      <div className="rounded-xl border p-6 text-sm text-gray-500">
        (WIP) — ต่อ API กับ RequestTransaction / RequisitionTransaction
      </div>
    </div>
  );
}
