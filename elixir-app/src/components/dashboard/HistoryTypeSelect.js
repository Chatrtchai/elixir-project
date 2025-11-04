// src/components/dashboard/HistoryTypeSelect.js
"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HISTORY_TYPE_LABELS } from "@/lib/history";

export default function HistoryTypeSelect({ value, options }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const items = useMemo(() => {
    return Array.from(options || []).map((opt) => ({
      value: opt,
      label: HISTORY_TYPE_LABELS[opt] || opt,
    }));
  }, [options]);

  return (
    <select
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        const params = new URLSearchParams(searchParams);
        if (nextValue === "transaction") params.delete("type");
        else params.set("type", nextValue);

        const query = params.toString();
        startTransition(() => {
          router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
          });
        });
      }}
      className="border rounded-md px-3 py-1 text-sm disabled:opacity-70"
      disabled={pending}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
