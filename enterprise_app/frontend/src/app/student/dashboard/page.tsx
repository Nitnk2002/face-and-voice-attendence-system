"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock4,
  GraduationCap,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [studentId, setStudentId] = useState("");
  const [customId, setCustomId] = useState("");
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [presentSessions, setPresentSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/student/login";
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== "student") {
      // If signed in as teacher or admin, redirect
      if (payload?.role === "teacher") window.location.href = "/dashboard";
      else if (payload?.role === "admin") window.location.href = "/admin/dashboard";
      else window.location.href = "/student/login";
      return;
    }

    fetchStudentData(payload.sub);
  }, []);

  const fetchStudentData = async (userId: string) => {
    setLoading(true);
    try {
      setStudentId(userId);

      // Get student profile
      const { data: user } = await supabase
        .from("users")
        .select("id, name, email, custom_id")
        .eq("id", userId)
        .single();

      if (user) {
        setStudentName(user.name);
        setCustomId(user.custom_id || "N/A");
        localStorage.setItem("user_name", user.name);
      }

      // Get enrolled classes
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id, classes ( id, class_name, join_code )")
        .eq("student_id", userId);

      const classes = (enrollments || []).map((e: any) => e.classes).filter(Boolean);
      setEnrolledClasses(classes);

      // Get attendance records
      const { data: records } = await supabase
        .from("attendance_records")
        .select(`
          id,
          method,
          marked_at,
          attendance_sessions (
            id,
            date,
            classes ( class_name )
          )
        `)
        .eq("student_id", userId)
        .order("marked_at", { ascending: false });

      const validRecords = records || [];
      setAttendanceRecords(validRecords);
      setPresentSessions(validRecords.length);

      // Calculate total sessions across student's classes
      const classIds = classes.map((c: any) => c.id);
      if (classIds.length > 0) {
        const { count: sessionCount } = await supabase
          .from("attendance_sessions")
          .select("*", { count: "exact", head: true })
          .in("class_id", classIds);

        const total = sessionCount || 0;
        setTotalSessions(total);

        if (total > 0) {
          const pct = Math.min(100, Math.round((validRecords.length / total) * 100));
          setAttendancePercentage(pct);
        } else {
          setAttendancePercentage(100);
        }
      } else {
        setTotalSessions(0);
        setAttendancePercentage(100);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const isEligible = attendancePercentage >= 75;

  return (
    <DashboardLayout role="student" title="Student Hub">
      <PageHeader
        title={`Welcome, ${studentName}`}
        description={`Roll ID: ${customId} · Track your lecture attendance percentages and verification logs.`}
        action={
          <Link
            href="/join"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Join New Class</span>
          </Link>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Overall Attendance"
          value={`${attendancePercentage}%`}
          description={isEligible ? "Exam Eligible (≥75%)" : "Attendance Low (<75%)"}
          trend={{ value: `${attendancePercentage}%`, isPositive: isEligible }}
          variant={isEligible ? "success" : "error"}
        />
        <StatCard
          label="Present Lectures"
          value={presentSessions}
          description="Verified via face/voice"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Total Conducted"
          value={totalSessions}
          description="Classroom sessions"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Enrolled Courses"
          value={enrolledClasses.length}
          description="Active class sections"
          icon={<GraduationCap className="w-5 h-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recent Check-in Logs (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Recent Check-In Activity</h2>
              <p className="text-xs text-[#667085]">
                Your recent biometric and manual attendance check-ins.
              </p>
            </div>
            <Link
              href="/student/attendance"
              className="text-xs font-semibold text-[#176B5B] hover:underline flex items-center gap-1"
            >
              <span>Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#667085]">Loading attendance...</div>
          ) : attendanceRecords.length === 0 ? (
            <EmptyState
              title="No Attendance Records Yet"
              description="When your instructor starts a lecture, check in via camera or voice to record your presence."
              actionText="View Enrolled Classes"
              actionHref="/student/classes"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E6]">
                  {attendanceRecords.slice(0, 8).map((record) => {
                    const sess = record.attendance_sessions;
                    const cName = sess?.classes?.class_name || "Enrolled Course";
                    const dateStr = sess?.date || new Date(record.marked_at).toLocaleDateString();

                    return (
                      <tr key={record.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-[#172B4D]">{cName}</td>
                        <td className="px-4 py-3.5 text-[#667085]">{dateStr}</td>
                        <td className="px-4 py-3.5 capitalize text-[#667085]">
                          {record.method === "face"
                            ? "Face (ArcFace)"
                            : record.method === "voice"
                            ? "Voice Spectrogram"
                            : "Manual Verification"}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status="Present" size="sm" />
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[#667085]">
                          {new Date(record.marked_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Enrolled Courses & Biometric Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-3">
              Enrolled Courses
            </h3>
            {enrolledClasses.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#667085]">
                No classrooms enrolled. Join with a code from your teacher.
              </div>
            ) : (
              <div className="space-y-3">
                {enrolledClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-xl border border-[#E5E9E6] bg-[#F8F9F7]/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#172B4D]">{cls.class_name}</div>
                      <div className="text-[10px] text-[#667085] font-mono">
                        Code: {cls.join_code}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#16845B] bg-[#F4FBF7] border border-[#CEEAD6] px-2 py-0.5 rounded">
                      Enrolled
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/join"
              className="mt-4 w-full py-2.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Join Another Course</span>
            </Link>
          </div>

          {/* Biometric Status Notice */}
          <div className="p-5 rounded-2xl bg-[#E7F3EF] border border-[#CEEAD6] text-xs text-[#176B5B] leading-relaxed">
            <strong className="block font-bold text-[#12584A] mb-1">
              Biometric Profile Active
            </strong>
            Your facial embeddings and voiceprint are stored as mathematical vectors. When attending
            class, you will be recognized in under 2 seconds.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
