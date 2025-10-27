// src/app/(dashboard)/layout.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PRIMARY = "text-[--color-primary]";

const iconCls = "w-7 h-7 md:w-8 md:h-8";

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null); // { username, name, role }
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer
  const pathname = usePathname();
  const router = useRouter();

  // โหลด session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          redirect: "manual",
        });
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json() : null;
        if (!cancelled && res.ok && data?.user) setUser(data.user);
        else if (!cancelled) setUser(null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // จำสถานะ collapse บน desktop
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // เมนูหลักใน Sidebar ตาม Role
  const sideMenu = useMemo(() => {
    const map = {
      ADMIN: [
        { 
          href: "/admin/users", 
          label: "จัดการบัญชีผู้ใช้งาน",
          icon: "group" },
        {
          href: "/admin/history",
          label: "ประวัติการทำรายการ",
          icon: "history",
        },
      ],
      HEAD: [
        {
          href: "/head/requests",
          label: "รายการคำขอจัดซื้อ",
          icon: "shopping_cart",
        },
        {
          href: "/head/inventory",
          label: "รายการของทั้งหมด",
          icon: "inventory_2",
        },
        { href: "/head/history", 
          label: "ประวัติการทำรายการ", 
          icon: "history" 
        },
      ],
      HOUSEKEEPER: [
        {
          href: "/housekeeper/requisition",
          label: "รายการเบิกของ",
          icon: "assignment_return",
        },
        {
          href: "/housekeeper/requests",
          label: "รายการคำขอจัดซื้อ",
          icon: "shopping_bag",
        },
        {
          href: "/housekeeper/inventory",
          label: "รายการของทั้งหมด",
          icon: "inventory_2",
        },
        {
          href: "/housekeeper/history",
          label: "ประวัติการทำรายการ",
          icon: "history",
        },
      ],
      "PURCHASING DEPARTMENT": [
        {
          href: "/purchase/requests",
          label: "รายการคำขอจัดซื้อ",
          icon: "shopping_cart_checkout",
        },
        {
          href: "/purchase/inventory",
          label: "รายการของทั้งหมด",
          icon: "inventory",
        },
        {
          href: "/purchase/history",
          label: "ประวัติการทำรายการ",
          icon: "history",
        },
      ],
    };
    return map[user?.role] ?? [];
  }, [user]);

  // Tabs บนคอนเทนต์ (ตาม Role)
  const tabs = sideMenu; // ใช้ชุดเดียวกับเมนู เพื่อให้ตรง UX ของคุณ

  const isActive = (href) => pathname?.startsWith(href);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
    router.refresh();
  }

  // --- Components ---

  function Brand({ compact = false }) {
    return (
      <div className="flex items-center gap-3">
        <img
          src="/logo-color.png"
          alt="logo"
          className={`${compact ? "w-10 h-10" : "w-14 h-14"}`}
        />
        {!compact && (
          <div className="leading-tight">
            <div className={`text-lg md:text-xl font-bold ${PRIMARY}`}>
              ระบบจัดการเบิกของ
            </div>
            <div className="text-[10px] text-black/70">
              Elixir Resort Koh Yao Yai
            </div>
          </div>
        )}
      </div>
    );
  }

  function SidebarInner() {
    return (
      <div className="h-full flex flex-col">
        {/* Header (logo + toggle collapse บน desktop) */}
        <div className="flex items-center justify-between px-4 py-4">
          <Brand />
          {/* ปุ่มปิด drawer (เฉพาะ mobile) */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
            title="ปิดเมนู"
            aria-label="close drawer"
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
        </div>

        {/* Menu */}
        <nav className="mt-1 flex-1 overflow-y-auto">
          {sideMenu.map((m) => {
            const active = isActive(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setDrawerOpen(false)}
                className={[
                  "flex items-center gap-3 h-14 px-6 text-base md:text-lg font-medium",
                  active
                    ? "bg-cyan-600 text-white"
                    : "text-black hover:bg-gray-100",
                  collapsed && "md:justify-center md:px-0",
                ].join(" ")}
              >
                {/* แสดง icon จาก Google Font */}
                <span
                  className={`material-symbols-outlined ${
                    active ? "text-white" : "text-black"
                  }`}
                >
                  {m.icon}
                </span>

                {!collapsed && (
                  <span className="truncate hidden md:inline">{m.label}</span>
                )}
                <span className="truncate md:hidden">{m.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile + Logout */}
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
                  {user?.role === "HEAD"
                    ? "หัวหน้า"
                    : user?.role === "HOUSEKEEPER"
                    ? "พนักงานทำความสะอาด"
                    : user?.role === "ADMIN"
                    ? "ผู้ดูแลระบบ"
                    : user?.role === "PURCHASING DEPARTMENT"
                    ? "แผนกจัดซื้อ"
                    : ""}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="w-full h-10 rounded-md border font-bold text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
            title="ออกจากระบบ"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  // Sidebar (desktop fixed / mobile drawer)
  const Sidebar = (
    <>
      {/* Desktop */}
      <aside
        className={`hidden md:block h-screen sticky top-0 shrink-0 bg-white transition-all ${
          collapsed ? "w-[76px]" : "w-80"
        }`}
      >
        <SidebarInner />
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-0 z-40 ${
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        {/* panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-[85%] max-w-[320px] bg-white shadow-xl transition-transform ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarInner />
        </aside>
      </div>
    </>
  );

  // Tabs component (บนคอนเทนต์)
  function RoleTabs() {
    if (!tabs?.length) return null;
    return (
      <nav className="w-full overflow-x-auto">
        <ul className="flex items-center gap-2 md:gap-4 border-b">
          {tabs.map((t) => {
            const active = isActive(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={[
                    "inline-flex items-center h-11 px-3 md:px-4 whitespace-nowrap text-sm md:text-base",
                    active
                      ? "text-cyan-700 border-b-2 border-cyan-600 font-semibold"
                      : "text-gray-600 hover:text-black",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[--color-foreground]">
      {/* Topbar (เฉพาะมือถือ) */}
      <div className="md:hidden sticky top-0 z-30 bg-white">
        <div className="h-14 px-3 flex items-center justify-between">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="open sidebar"
            title="เมนู"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="40px"
              viewBox="0 -960 960 960"
              width="40px"
              fill="#0594A5"
            >
              <path d="M120-240v-66.67h720V-240H120Zm0-206.67v-66.66h720v66.66H120Zm0-206.66V-720h720v66.67H120Z" />
            </svg>
          </button>
          <Brand compact />
          <div className="w-10" />
        </div>
      </div>

      {/* Layout 2 คอลัมน์ */}
      <div className="flex">
        {Sidebar}

        <div className="flex-1 min-w-0">
          {/* เนื้อหาเพจ */}
          <main className="px-4 md:px-6 py-4">
            {loading ? (
              <div className="text-gray-500 text-sm">กำลังตรวจสอบสิทธิ์...</div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
