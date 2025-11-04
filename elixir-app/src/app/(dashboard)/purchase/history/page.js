// src/app/(dashboard)/purchase/history/page.js

import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import HistoryTypeSelect from "@/components/dashboard/HistoryTypeSelect";
import HistoryTable from "@/components/dashboard/HistoryTable";
import { getTransactionLogs } from "@/lib/dashboard-data";
import { HISTORY_TYPES } from "@/lib/history";

const VALID_TYPES = new Set(HISTORY_TYPES);

export const revalidate = 30;

export default async function PurchaseHistoryPage({ searchParams }) {
  const typeParam = String(searchParams?.type || "").toLowerCase();
  const filter = VALID_TYPES.has(typeParam) ? typeParam : "transaction";

  const rows = await getTransactionLogs(filter);

  return (
    <div className="p-6 space-y-6">
      <DashboardPageHeader
        title="ประวัติการทำรายการ"
        description="ประวัติการทำรายการทั้งหมดภายในระบบ"
        actions={<HistoryTypeSelect value={filter} options={HISTORY_TYPES} />}
      />

      <HistoryTable rows={rows} filter={filter} basePath="/purchase/history" />
    </div>
  );
}