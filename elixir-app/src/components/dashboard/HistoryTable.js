// src/components/dashboard/HistoryTable.js

import Link from "next/link";
import { formatHistoryDate } from "@/lib/history";

export default function HistoryTable({ rows = [], filter = "transaction", basePath }) {
  const allItems = Array.isArray(rows) ? rows : [];
  const normalizedFilter = typeof filter === "string" ? filter : "transaction";
  const hrefBase = basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const items = allItems.filter((item) => {
    if (!item) return false;
    const identifier = item.id ?? item.T_No ?? item.RT_No;
    return identifier !== undefined && identifier !== null && `${identifier}`.length > 0;
  });

  return (
    <div className="overflow-y-auto max-h-[600px] pr-[10px]">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-gray-600 sticky top-0">
          <tr>
            <th className="text-left px-4 py-2">วันเวลา</th>
            <th className="text-left px-4 py-2">รายละเอียด</th>
            <th className="text-left px-4 py-2">ผู้กระทำ</th>
            <th className="text-center px-4 py-2">ดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {!items.length ? (
            <tr>
              <td colSpan={4} className="text-center py-4 text-gray-400">
                ไม่พบข้อมูล
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const id = item.id ?? item.T_No ?? item.RT_No;
              const href = hrefBase
                ? `${hrefBase}/${encodeURIComponent(id)}`
                : `/${encodeURIComponent(id)}`;
              const query = normalizedFilter === "transaction" ? "" : `?type=${encodeURIComponent(normalizedFilter)}`;
              const note = item.note ?? "-";
              const actor = item.actor || "-";
              return (
                <tr key={id} className="border-t">
                  <td className="px-4 py-2">{formatHistoryDate(item.datetime)}</td>
                  <td className="px-4 py-2">{note}</td>
                  <td className="px-4 py-2 text-gray-600">{actor}</td>
                  <td className="px-4 py-2 text-center">
                    <Link
                      href={`${href}${query}`}
                      className="px-3 py-1 text-gray-500 rounded-md text-sm hover:underline transition"
                    >
                      รายละเอียด
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
