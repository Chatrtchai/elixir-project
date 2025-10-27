"use client";
import { useRouter } from "next/navigation";

export default function ModalWrapper({ title, children, width = "w-[520px]" }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-xl ${width}`}>
        <div className="px-5 py-4">
          <h2 className="text-lg font-semibold text-[--color-foreground]">
            {title}
          </h2>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
