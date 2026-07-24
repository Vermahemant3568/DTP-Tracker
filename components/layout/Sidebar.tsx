"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/config/navigation";
import { Zap } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-[260px] flex flex-col flex-shrink-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-700/50 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Zap size={16} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight leading-none">DTP Tracker</p>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Production Suite</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Menu</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              {/* Active left glow bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-blue-300 shadow-sm shadow-blue-300/60" />
              )}

              <Icon
                size={17}
                className={`shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              <span className="truncate">{item.title}</span>

              {/* Active dot */}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-300 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 py-4 border-t border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/40 border border-slate-700/60">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Admin</p>
            <p className="text-[10px] text-slate-500 truncate">admin@dtptracker.com</p>
          </div>
        </div>
      </div>

    </aside>
  );
}
