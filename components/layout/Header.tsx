"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { navigation } from "@/config/navigation";
import UserMenu from "./UserMenu";

export default function Header() {
  const pathname  = usePathname();
  const current   = navigation.find((item) => item.href === pathname);
  const Icon      = current?.icon;

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 shrink-0 bg-white border-b border-gray-100 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">

      {/* ── Left: page identity ── */}
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Icon size={17} className="text-white" />
          </div>
        )}
        <div>
          <h1 className="text-[15px] font-bold text-gray-900 leading-none tracking-tight">
            {current?.title ?? "Dashboard"}
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[11px] text-gray-400">Home</span>
            {current && (
              <>
                <span className="text-[11px] text-gray-300">/</span>
                <span className="text-[11px] text-blue-500 font-medium">{current.title}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: controls ── */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <div className="relative hidden sm:flex items-center">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            className="h-9 w-52 rounded-xl border border-gray-200 bg-gray-50/80 pl-8 pr-10 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400 text-gray-700"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 shadow-sm pointer-events-none">
            ⌘K
          </kbd>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1" />

        {/* Notification bell */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all group">
          <Bell size={16} className="transition-transform group-hover:rotate-12 duration-200" />
          {/* Pulse badge */}
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
          </span>
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
