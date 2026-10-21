"use client";

import React from "react";
import Link from "next/link";
import { Menu, ScanFace, ExternalLink } from "lucide-react";
import { UserRole } from "./Sidebar";

interface TopbarProps {
  role: UserRole;
  userName?: string;
  onMobileMenuOpen?: () => void;
  title?: string;
}

export function Topbar({
  role,
  userName = "User",
  onMobileMenuOpen,
  title,
}: TopbarProps) {
  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-[#E5E9E6] flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onMobileMenuOpen && (
          <button
            onClick={onMobileMenuOpen}
            className="md:hidden p-2 rounded-lg text-[#667085] hover:text-[#172B4D] hover:bg-[#F4F6F4]"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          {title && <span className="text-sm font-bold text-[#172B4D]">{title}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {role === "teacher" && (
          <Link
            href="/dashboard/take-attendance"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span>Launch Scanner</span>
          </Link>
        )}

        <div className="flex items-center gap-2.5 pl-3 border-l border-[#E5E9E6]">
          <div className="w-8 h-8 rounded-full bg-[#172B4D] text-white flex items-center justify-center font-bold text-xs">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[#172B4D] leading-none">{userName}</div>
            <div className="text-[10px] text-[#667085] mt-0.5 capitalize">{role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
