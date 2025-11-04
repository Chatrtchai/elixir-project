import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import { getInventoryItems } from "@/lib/dashboard-data";
import Link from "next/link";

export const revalidate = 10;

export default async function HeadInventoryPage({ searchParams }) {
  const q = String(searchParams?.q || "").trim();
  const rows = await getInventoryItems(q);

  return (
    <div className="p-6 space-y-6">
      <DashboardPageHeader title="รายการของทั้งหมด" />

      <form className="flex gap-2" action="" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อของ"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]"
        />
        <button
          type="submit"
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          ค้นหา
        </button>
        {q && (
          <Link
            href="/head/inventory"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            ล้าง
          </Link>
        )}
      </form>

      <div className="overflow-x-auto max-h-[600px] pr-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2">ชื่อรายการ</th>
              <th className="text-left px-4 py-2">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.I_Id} className="border-t">
                <td className="px-4 py-2">{r.I_Name}</td>
                <td className="px-4 py-2">{r.I_Quantity}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={2}>
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
