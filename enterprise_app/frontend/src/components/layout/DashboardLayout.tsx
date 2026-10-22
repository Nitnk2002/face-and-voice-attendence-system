"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, UserRole } from "./Sidebar";
import { Topbar } from "./Topbar";
import { refreshSessionToken } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  title?: string;
}

export function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Academic User");

  // Multi-browser session renewal heartbeat
  useEffect(() => {
    const checkAndRenewSession = async () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("access_token") || localStorage.getItem("admin_token");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        const now = Date.now();
        // If token expires within 15 minutes (or already expired within grace), renew it
        if (payload?.exp && (payload.exp * 1000 - now < 15 * 60 * 1000)) {
          await refreshSessionToken();
        }
      } catch {
        // Token parsing error; ignore
      }
    };

    checkAndRenewSession();
    const interval = setInterval(checkAndRenewSession, 5 * 60 * 1000); // Check every 5 minutes

    const handleFocus = () => {
      checkAndRenewSession();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

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
