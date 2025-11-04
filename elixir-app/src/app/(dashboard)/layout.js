// src/app/(dashboard)/layout.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardBrand from "@/components/dashboard/DashboardBrand";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

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
          icon: "group",
        },
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
        { href: "/head/history", label: "ประวัติการทำรายการ", icon: "history" },
      ],
      HOUSEKEEPER: [
        {
          href: "/housekeeper/inventory",
          label: "รายการของทั้งหมด",
          icon: "inventory_2",
        },
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
    const items = map[user?.role] ?? [];
    return items.map((item) => ({
      ...item,
      active: pathname?.startsWith(item.href),
    }));
  }, [user, pathname]);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
    router.refresh();
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
          <DashboardBrand compact />
          <div className="w-10" />
        </div>
      </div>

      {/* Layout 2 คอลัมน์ */}
      <div className="flex">
        <DashboardSidebar
          collapsed={collapsed}
          drawerOpen={drawerOpen}
          menuItems={sideMenu}
          onDrawerOpenChange={setDrawerOpen}
          onLogout={onLogout}
          user={user}
        />

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
