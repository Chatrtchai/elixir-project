"use client";

import Link from "next/link";
import DashboardBrand from "./DashboardBrand";

const ROLE_LABELS = {
  HEAD: "หัวหน้า",
  HOUSEKEEPER: "พนักงานทำความสะอาด",
  ADMIN: "ผู้ดูแลระบบ",
  "PURCHASING DEPARTMENT": "แผนกจัดซื้อ",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || "";
}

function SidebarContent({
  collapsed,
  menuItems,
  onLogout,
  user,
  showCloseButton = false,
  onClose,
}) {
  const handleNavigate = () => {
    if (onClose) onClose();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <DashboardBrand />
        {showCloseButton && (
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
            title="ปิดเมนู"
            aria-label="close drawer"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="40px"
              viewBox="0 -960 960 960"
              width="40px"
              fill="#0594A5"
            >
              <path d="m251.33-204.67-46.66-46.66L433.33-480 204.67-708.67l46.66-46.66L480-526.67l228.67-228.66 46.66 46.66L526.67-480l228.66 228.67-46.66 46.66L480-433.33 251.33-204.67Z" />
            </svg>
          </button>
        )}
      </div>

      <nav className="mt-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavigate}
            className={[
              "flex items-center gap-3 h-14 px-6 text-base md:text-lg font-medium",
              item.active
                ? "bg-cyan-600 text-white"
                : "text-black hover:bg-gray-100",
              collapsed && "md:justify-center md:px-0",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className={`material-symbols-outlined ${
                item.active ? "text-white" : "text-black"
              }`}
            >
              {item.icon}
            </span>

            {!collapsed && (
              <span className="truncate hidden md:inline">{item.label}</span>
            )}
            <span className="truncate md:hidden">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="/logo-color.png"
            alt=""
            className="w-10 h-10 md:w-[54px] md:h-[54px] rounded-full object-cover"
          />
          {!collapsed && (
            <div className="min-w-0 hidden md:block">
              <div className="text-base md:text-lg font-medium truncate">
                {user?.name || user?.username || "-"}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {getRoleLabel(user?.role)}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className="w-full h-10 rounded-md border font-bold text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
          title="ออกจากระบบ"
          type="button"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

export default function DashboardSidebar({
  collapsed = false,
  drawerOpen = false,
  menuItems = [],
  onDrawerOpenChange,
  onLogout,
  user,
}) {
  const itemsWithState = menuItems.map((item) => ({
    ...item,
    active: Boolean(item.active),
  }));

  const closeDrawer = () => {
    if (onDrawerOpenChange) onDrawerOpenChange(false);
  };

  return (
    <>
      <aside
        className={`hidden md:block h-screen sticky top-0 shrink-0 bg-white transition-all ${
          collapsed ? "w-[76px]" : "w-80"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          menuItems={itemsWithState}
          onLogout={onLogout}
          user={user}
        />
      </aside>

      <div
        className={`md:hidden fixed inset-0 z-40 ${
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeDrawer}
        />
        <aside
          className={`absolute top-0 left-0 h-full w-[85%] max-w-[320px] bg-white shadow-xl transition-transform ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent
            collapsed={false}
            menuItems={itemsWithState}
            onLogout={onLogout}
            onClose={closeDrawer}
            showCloseButton
            user={user}
          />
        </aside>
      </div>
    </>
  );
}
