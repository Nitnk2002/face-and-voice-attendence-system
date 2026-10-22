"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ScanFace,
  CalendarCheck,
  History,
  BarChart3,
  Settings,
  ShieldAlert,
  LogOut,
  Layers,
  FileSpreadsheet,
  Building2,
  UserCheck,
  X,
} from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";

export type UserRole = "teacher" | "student" | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SidebarProps {
  role: UserRole;
  userName?: string;
  userEmail?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onLogout?: () => void;
}

export function Sidebar({
  role,
  userName = "User",
  userEmail = "",
  mobileOpen = false,
  onMobileClose,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  const teacherNav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      label: "Take Attendance",
      href: "/dashboard/take-attendance",
      icon: <ScanFace className="w-4 h-4" />,
      badge: "Live",
    },
    { label: "Classrooms", href: "/dashboard/classes", icon: <Layers className="w-4 h-4" /> },
    { label: "Sessions", href: "/dashboard/sessions", icon: <CalendarCheck className="w-4 h-4" /> },
    { label: "Students", href: "/dashboard/students", icon: <Users className="w-4 h-4" /> },
    { label: "Attendance Logs", href: "/dashboard/attendance", icon: <History className="w-4 h-4" /> },
    { label: "Reports", href: "/dashboard/reports", icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const studentNav: NavItem[] = [
    { label: "Dashboard", href: "/student/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "My Attendance", href: "/student/attendance", icon: <History className="w-4 h-4" /> },
    { label: "My Classes", href: "/student/classes", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "My Profile", href: "/student/profile", icon: <UserCheck className="w-4 h-4" /> },
  ];

  const adminNav: NavItem[] = [
    { label: "Admin Console", href: "/admin/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "User Directory", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "Classrooms", href: "/admin/classes", icon: <Building2 className="w-4 h-4" /> },
    { label: "System Attendance", href: "/admin/attendance", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: <ShieldAlert className="w-4 h-4" /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const currentNav = role === "admin" ? adminNav : role === "student" ? studentNav : teacherNav;

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.clear();
      window.location.href = role === "admin" ? "/admin/login" : "/login";
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E9E6]">
      {/* Sidebar Header */}
      <div className="h-16 px-6 border-b border-[#E5E9E6] flex items-center justify-between">
        <AppLogo
          href={role === "admin" ? "/admin/dashboard" : role === "student" ? "/student/dashboard" : "/dashboard"}
          subtitle={role === "admin" ? "Admin Portal" : role === "student" ? "Student Hub" : "Faculty Suite"}
          size="sm"
        />
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-[#667085] hover:text-[#172B4D] hover:bg-[#F4F6F4]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Section */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <div className="text-[10px] font-bold text-[#8892A4] uppercase tracking-wider px-3 mb-2">
          {role === "admin" ? "Administration" : role === "student" ? "Academic Portal" : "Classroom Management"}
        </div>
        {currentNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[#E7F3EF] text-[#176B5B] shadow-2xs"
                  : "text-[#667085] hover:text-[#172B4D] hover:bg-[#F8F9F7]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-[#176B5B]" : "text-[#8892A4]"}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#176B5B] text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Card & Logout Footer */}
      <div className="p-4 border-t border-[#E5E9E6] bg-[#F8F9F7]/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#172B4D] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#172B4D] truncate">{userName}</div>
              <div className="text-[10px] text-[#667085] truncate capitalize">{role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#667085] hover:text-[#C2413B] hover:bg-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs" onClick={onMobileClose} />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
