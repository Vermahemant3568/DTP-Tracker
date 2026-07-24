"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, ChevronDown, Shield } from "lucide-react";

const USER = {
  name:     "Admin User",
  email:    "admin@dtptracker.com",
  role:     "Administrator",
  initials: "AU",
};

export default function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white pl-1.5 pr-2.5 py-1.5 hover:border-blue-300 hover:bg-blue-50/50 transition-all outline-none group shadow-sm">
          {/* Avatar */}
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-white">{USER.initials}</span>
          </div>
          {/* Name + role */}
          <div className="hidden sm:block text-left leading-none">
            <p className="text-xs font-semibold text-gray-800">{USER.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{USER.role}</p>
          </div>
          <ChevronDown size={13} className="hidden sm:block text-gray-400 group-hover:text-blue-500 transition-colors ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60">

        {/* Profile card inside dropdown */}
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100/60">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
            <span className="text-sm font-bold text-white">{USER.initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{USER.name}</p>
            <p className="text-[11px] text-gray-500 truncate">{USER.email}</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-3 py-1.5 mb-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">
            <Shield size={10} />
            {USER.role}
          </span>
        </div>

        <DropdownMenuSeparator className="my-1 bg-gray-100" />

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
          <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <User size={13} className="text-gray-500" />
          </span>
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
          <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Settings size={13} className="text-gray-500" />
          </span>
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-gray-100" />

        <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer">
          <span className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <LogOut size={13} className="text-red-400" />
          </span>
          Sign out
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
