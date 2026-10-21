"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, UserRole } from "./Sidebar";
import { Topbar } from "./Topbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  title?: string;
}

export function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Academic User");

  useEffect(() => {
    // Attempt to read current user name or email from localStorage
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("user_name");
      const storedEmail = localStorage.getItem("user_email");
      if (storedName) {
        setUserName(storedName);
      } else if (storedEmail) {
        setUserName(storedEmail.split("@")[0]);
      } else if (role === "admin") {
        setUserName("System Admin");
      } else if (role === "student") {
        setUserName("Student");
      } else {
        setUserName("Faculty Member");
      }
    }
  }, [role]);

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col md:flex-row antialiased">
      {/* Sidebar */}
      <Sidebar
        role={role}
        userName={userName}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          role={role}
          userName={userName}
          onMobileMenuOpen={() => setMobileOpen(true)}
          title={title}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
