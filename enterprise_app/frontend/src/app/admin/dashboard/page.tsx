"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Building2,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRight,
  Plus,
  Clock4,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function AdminDashboardPage() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== "admin") {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
      return;
    }

    fetchAdminOverview();
  }, []);

  const fetchAdminOverview = async () => {
    setLoading(true);
    try {
      // 1. Fetch user counts
      const { data: users } = await supabase.from("users").select("id, name, email, role, custom_id, created_at");
      const userList = users || [];

      setTotalStudents(userList.filter((u) => u.role === "student").length);
      setTotalTeachers(userList.filter((u) => u.role === "teacher").length);
      setRecentUsers(userList.slice(0, 5));

      // 2. Fetch class count
      const { count: classCount } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true });
      setTotalClasses(classCount || 0);

      // 3. Fetch attendance count
      const { count: attCount } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true });
      setTotalRecords(attCount || 0);

      // 4. Fetch recent sessions
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, class_id, date, is_active, created_at, classes ( class_name )")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentSessions(sessions || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Admin Executive Console">
      <PageHeader
        title="Institutional System Overview"
        description="Monitor system-wide enrollment, department accounts, and attendance verification activity."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </Link>
            <Link
              href="/admin/classes/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#172B4D] hover:bg-[#0F1E36] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Classroom</span>
            </Link>
          </div>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Registered Students"
          value={totalStudents}
          description="Enrolled in system"
          icon={<Users className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          label="Faculty Members"
          value={totalTeachers}
          description="Authorized instructors"
          icon={<GraduationCap className="w-5 h-5" />}
        />
        <StatCard
          label="Classrooms & Sections"
          value={totalClasses}
          description="Active courses"
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          label="Attendance Records"
          value={totalRecords}
          description="Cryptographically logged"
          icon={<FileSpreadsheet className="w-5 h-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recent Accounts & Shortcuts (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Recent Accounts</h2>
              <p className="text-xs text-[#667085]">Recently registered faculty and student users.</p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-[#176B5B] hover:underline flex items-center gap-1"
            >
              <span>User Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#667085]">Loading users...</div>
          ) : recentUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#667085]">No users found in database.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Name</th>
                    <th className="px-3.5 py-2.5">Email</th>
                    <th className="px-3.5 py-2.5">Role</th>
                    <th className="px-3.5 py-2.5 text-right">Identifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E6]">
                  {recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8F9F7]/50">
                      <td className="px-3.5 py-3 font-semibold text-[#172B4D]">{u.name}</td>
                      <td className="px-3.5 py-3 font-mono text-[#667085]">{u.email}</td>
                      <td className="px-3.5 py-3 capitalize">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : u.role === "teacher"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-[#667085]">
                        {u.custom_id || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Recent Sessions & Audit Link (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#172B4D]">Recent Lecture Sessions</h2>
              <Link
                href="/admin/attendance"
                className="text-xs font-semibold text-[#176B5B] hover:underline"
              >
                All Logs →
              </Link>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-[#667085]">Loading sessions...</div>
            ) : recentSessions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#667085]">No sessions on record.</div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-[#E5E9E6] bg-[#F8F9F7]/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#172B4D]">
                        {s.classes?.class_name || "Classroom"}
                      </div>
                      <div className="text-[10px] text-[#667085] font-mono">
                        {s.date || new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#16845B] bg-[#F4FBF7] border border-[#CEEAD6] px-2 py-0.5 rounded">
                      Session #{s.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Institutional Compliance Card */}
          <div className="p-5 rounded-2xl bg-[#142820] text-slate-200 border border-emerald-900/60 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2DD4BF] uppercase tracking-wider mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Compliance & Security</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              All administrative role changes, course creation events, and attendance overrides are
              recorded with cryptographic SHA-256 integrity logs.
            </p>
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2DD4BF] hover:underline"
            >
              <span>Inspect Institutional Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
