"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ScanFace,
  Users,
  CalendarCheck,
  Plus,
  ArrowRight,
  Clock4,
  Layers,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TeacherDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [classId, setClassId] = useState<string>("");
  const [className, setClassName] = useState<string>("Loading...");
  const [classList, setClassList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Class Modal
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 1. Initial Load: Fetch all classes & listen to Supabase realtime
  useEffect(() => {
    fetchClassList();

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.student_id) {
            setStudents((prev) => {
              const copy = [...prev];
              const idx = copy.findIndex((s) => s.id === rec.student_id);
              if (idx !== -1 && copy[idx].status !== "Present") {
                copy[idx] = {
                  ...copy[idx],
                  status: "Present",
                  time: rec.marked_at
                    ? new Date(rec.marked_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                };
                setPresentCount((c) => c + 1);
              }
              return copy.sort((a, b) => {
                if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
                return a.name.localeCompare(b.name);
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClassList = async (selectCid?: string) => {
    setLoading(true);
    try {
      const { data: classes } = await supabase
        .from("classes")
        .select("id, class_name, join_code, teacher_id");

      const list = classes || [];
      setClassList(list);

      if (list.length > 0) {
        const targetClass = selectCid
          ? list.find((c: any) => c.id === selectCid) || list[0]
          : list[0];
        setClassId(targetClass.id);
        setClassName(targetClass.class_name);
        await fetchStudentsForClass(targetClass.id);
      } else {
        setClassName("No active classrooms");
        setStudents([]);
        setTotalStudents(0);
        setPresentCount(0);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForClass = async (cid: string) => {
    try {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", cid);

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        setTotalStudents(0);
        setPresentCount(0);
        return;
      }

      const sIds = enrollments.map((e) => e.student_id);
      const { data: userData } = await supabase
        .from("users")
        .select("id, name, email, custom_id")
        .in("id", sIds);

      // Check current day's active session
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("class_id", cid)
        .order("created_at", { ascending: false })
        .limit(1);

      let markedMap: Record<string, string> = {};
      if (sessions && sessions.length > 0) {
        const { data: records } = await supabase
          .from("attendance_records")
          .select("student_id, marked_at")
          .eq("session_id", sessions[0].id);

        if (records) {
          records.forEach((r) => {
            markedMap[r.student_id] = new Date(r.marked_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          });
        }
      }

      const formatted = (userData || []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        customId: u.custom_id || "N/A",
        status: markedMap[u.id] ? "Present" : "Pending",
        time: markedMap[u.id] || "—",
      }));

      formatted.sort((a, b) => {
        if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setStudents(formatted);
      setTotalStudents(formatted.length);
      setPresentCount(Object.keys(markedMap).length);
    } catch {
      // Fallback
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsCreating(true);
    try {
      const code = "CS-" + Math.floor(100 + Math.random() * 900);
      const { data, error } = await supabase
        .from("classes")
        .insert({
          class_name: newClassName.trim(),
          join_code: code,
        })
        .select()
        .single();

      if (error) throw error;

      setIsCreateClassOpen(false);
      setNewClassName("");
      if (data) {
        await fetchClassList(data.id);
      }
    } catch {
      alert("Could not create classroom.");
    } finally {
      setIsCreating(false);
    }
  };

  const attendanceRate =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <DashboardLayout role="teacher" title="Faculty Dashboard">
      {/* Page Header */}
      <PageHeader
        title="Classroom Overview"
        description="Monitor real-time student check-ins, launch live kiosks, and manage active sessions."
        action={
          <div className="flex items-center gap-2.5">
            {/* Classroom Switcher Dropdown */}
            {classList.length > 0 && (
              <select
                value={classId}
                onChange={(e) => {
                  const target = classList.find((c) => c.id === e.target.value);
                  if (target) {
                    setClassId(target.id);
                    setClassName(target.class_name);
                    fetchStudentsForClass(target.id);
                  }
                }}
                className="bg-white border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
              >
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.join_code})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setIsCreateClassOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Class</span>
            </button>

            <Link
              href="/dashboard/take-attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <ScanFace className="w-4 h-4" />
              <span>Launch Live Scanner</span>
            </Link>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Present Today"
          value={presentCount}
          description="Verified via face & voice"
          icon={<Users className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          label="Enrolled Students"
          value={totalStudents}
          description={`In ${className}`}
          icon={<Layers className="w-5 h-5" />}
        />
        <StatCard
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          description="Of registered class roster"
          trend={{ value: `${attendanceRate}%`, isPositive: attendanceRate >= 75 }}
        />
        <StatCard
          label="Pending Check-Ins"
          value={totalStudents - presentCount}
          description="Awaiting biometric scan"
          icon={<Clock4 className="w-5 h-5" />}
          variant={totalStudents - presentCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Roster & Quick Actions Grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Main Student Roster Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">{className} — Live Roster</h2>
              <p className="text-xs text-[#667085]">
                Real-time synchronized student attendance for current lecture.
              </p>
            </div>
            <Link
              href="/dashboard/students"
              className="text-xs font-semibold text-[#176B5B] hover:underline flex items-center gap-1"
            >
              <span>Manage Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              Loading student roster...
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title="No Students Enrolled"
              description={`Students can join this course using code: ${
                classList.find((c) => c.id === classId)?.join_code || "N/A"
              }`}
              actionText="Open Enrollment Portal"
              actionHref="/join"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Roll / ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Logged Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E6]">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-[#172B4D] flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#172B4D] text-white flex items-center justify-center text-[10px] font-bold">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{student.name}</div>
                          <div className="text-[10px] text-[#8892A4] font-normal font-mono">
                            {student.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#667085]">{student.customId}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={student.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-[#667085]">
                        {student.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar: Shortcuts & Session Status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Class Info Box */}
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-3">
              Classroom Join Information
            </h3>
            <div className="p-4 rounded-xl bg-[#E7F3EF] border border-[#CEEAD6] text-center mb-4">
              <span className="text-[11px] font-medium text-[#176B5B] block mb-1">
                Student Self-Enrollment Code
              </span>
              <div className="text-2xl font-mono font-extrabold text-[#176B5B] tracking-widest">
                {classList.find((c) => c.id === classId)?.join_code || "NONE"}
              </div>
            </div>
            <p className="text-[11px] text-[#667085] leading-relaxed mb-4">
              Direct students to <strong>/join</strong> to complete their facial capture and voice
              registration.
            </p>
            <Link
              href="/dashboard/sessions/new"
              className="w-full py-2.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] flex items-center justify-center gap-1.5 transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Create New Session</span>
            </Link>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-[#172B4D] text-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2DD4BF] uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Live Attendance Kiosk</span>
            </div>
            <h3 className="text-base font-bold mb-2">Ready to take roll call?</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Position your laptop or kiosk camera at the classroom entrance. ArcFace and vocal
              spectral matching check students automatically in seconds.
            </p>
            <Link
              href="/dashboard/take-attendance"
              className="w-full py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <ScanFace className="w-4 h-4" />
              <span>Start Camera Scanner</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D0D5DD] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-[#172B4D] mb-1">Create New Classroom</h3>
            <p className="text-xs text-[#667085] mb-5">
              Enter the course name or section. A unique join code will be generated.
            </p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Classroom Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS304: Distributed Systems"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#667085] hover:bg-[#F8F9F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold"
                >
                  {isCreating ? "Creating..." : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
