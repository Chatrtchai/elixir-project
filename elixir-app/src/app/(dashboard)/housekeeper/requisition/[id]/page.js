// src\app\(dashboard)\housekeeper\requisition\[id]\page.js

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModalWrapper from "@/components/modal/ModalWrapper";

export default function WithdrawDetailModal() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/withdraws/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    })();
  }, [id]);

  if (!data) return null;

  return (
    <ModalWrapper title={`รายละเอียดใบเบิก #${id}`} width="w-[600px]">
      <div className="space-y-4 text-sm">
        <Row
          label="วันที่สร้าง"
          value={new Date(data.WL_DateTime).toLocaleString("th-TH")}
        />
        <Row
          label="สถานะ"
          value={data.WL_Is_Finished ? "เสร็จสิ้นแล้ว" : "กำลังดำเนินการ"}
        />

        <div>
          <div className="text-gray-600 mb-1 font-medium">รายละเอียด</div>
          <ul className="list-disc list-inside space-y-1">
            {(data.details || []).map((d) => {
              const returnedAll =
                d.WD_Amount_Left === 0 || d.WD_Return_Left === d.WD_Amount;
              const returnedSome = d.WD_Return_Left > 0 && !returnedAll;

              return (
                <li key={d.WD_Id}>
                  {d.I_Name} — เบิก {d.WD_Amount} ชิ้น
                  {returnedSome && (
                    <span className="text-gray-500">
                      {" "}
                      (คืนแล้ว {d.WD_Return_Left})
                    </span>
                  )}
                  {returnedAll && <span className="text-red-500"> (หมด)</span>}
                </li>
              );
            })}
          </ul>
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

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <div className="w-28 text-gray-500">{label}:</div>
      <div className="flex-1">{value}</div>
    </div>
  );
}

