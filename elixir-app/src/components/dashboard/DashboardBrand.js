"use client";

export default function DashboardBrand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-color.png"
        alt="logo"
        className={compact ? "w-10 h-10" : "w-14 h-14"}
      />
      {!compact && (
        <div className="leading-tight">
          <div className="text-lg md:text-xl font-bold text-[--color-primary]">
            ระบบจัดการเบิกของ
          </div>
          <div className="text-[10px] text-black/70">Elixir Resort Koh Yao Yai</div>
        </div>
      )}
    </div>
  );
}
