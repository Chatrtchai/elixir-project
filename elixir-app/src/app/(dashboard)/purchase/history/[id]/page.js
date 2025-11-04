// src/app/(dashboard)/purchase/history/[id]/page.js

import HistoryDetailModal from "@/components/dashboard/HistoryDetailModal";
import { getTransactionLogDetail } from "@/lib/dashboard-data";
import { HISTORY_TYPES } from "@/lib/history";
import { notFound } from "next/navigation";

const VALID_TYPES = new Set(HISTORY_TYPES);

export default async function PurchaseHistoryDetailPage({
  params,
  searchParams,
}) {
  const id = params?.id;
  if (!id) {
    notFound();
  }

  const typeParam = String(searchParams?.type || "").toLowerCase();
  const filter = VALID_TYPES.has(typeParam) ? typeParam : "transaction";

  const data = await getTransactionLogDetail(id, filter);
  if (!data) {
    notFound();
  }

  const query = filter === "transaction" ? "" : `?type=${encodeURIComponent(filter)}`;

  return (
    <HistoryDetailModal
      id={data.id || String(id)}
      type={filter}
      data={data}
      backPath={`/purchase/history${query}`}
    />
  );
}
