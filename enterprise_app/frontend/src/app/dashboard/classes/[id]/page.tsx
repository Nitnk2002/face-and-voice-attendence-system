"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  ScanFace,
  Plus,
  ArrowLeft,
  Clock4,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClassDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassData();
  }, [id]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      // 1. Fetch class details
      const { data: cls } = await supabase
        .from("classes")
        .select("id, class_name, join_code, created_at")
        .eq("id", id)
        .single();

      setClassInfo(cls);

      // 2. Fetch enrolled students
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", id)
        .eq("status", "active");

      if (enrollments && enrollments.length > 0) {
        const sIds = enrollments.map((e) => e.student_id);
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email, custom_id")
          .in("id", sIds);

        setStudents(users || []);
      } else {
        setStudents([]);
      }

      // 3. Fetch past sessions
      const { data: sessList } = await supabase
        .from("attendance_sessions")
        .select("id, date, is_active, created_at")
        .eq("class_id", id)
        .order("created_at", { ascending: false });

      setSessions(sessList || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="teacher" title="Classroom Details">
      <PageHeader
        title={classInfo?.class_name || "Classroom"}
        description={`Join Code: ${classInfo?.join_code || "..."} · Enrolled Roster & Session History`}
        backHref="/dashboard/classes"
        backLabel="Back to Classrooms"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/sessions/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </Link>
            <Link
              href="/dashboard/take-attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs"
            >
              <ScanFace className="w-4 h-4" />
              <span>Open Scanner</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Enrolled Students"
          value={students.length}
          description="Registered with face/voice prints"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Total Sessions"
          value={sessions.length}
          description="Conducted attendance sessions"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Enrollment Code"
          value={classInfo?.join_code || "—"}
          description="Share with students for /join"
          icon={<ScanFace className="w-5 h-5" />}
          variant="success"
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Enrolled Students Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <h2 className="text-base font-bold text-[#172B4D] mb-1">Enrolled Roster</h2>
          <p className="text-xs text-[#667085] mb-5">
            Students who completed biometric registration for this class.
          </p>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#667085]">Loading students...</div>
          ) : students.length === 0 ? (
            <EmptyState
              title="No Students Yet"
              description={`Students can enroll using join code: ${classInfo?.join_code || ""}`}
              actionText="Open Enrollment Link"
              actionHref="/join"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Name</th>
                    <th className="px-3.5 py-2.5">Roll / ID</th>
                    <th className="px-3.5 py-2.5">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E6]">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8F9F7]/50">
                      <td className="px-3.5 py-3 font-semibold text-[#172B4D] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#172B4D] text-white flex items-center justify-center text-[10px] font-bold">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{s.name}</span>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[#667085]">
                        {s.custom_id || "N/A"}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[#667085]">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sessions History Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <h2 className="text-base font-bold text-[#172B4D] mb-1">Past Sessions</h2>
          <p className="text-xs text-[#667085] mb-5">
            Attendance sessions recorded for this course.
          </p>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#667085]">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No Sessions Recorded"
              description="Start a new lecture session to record student presence."
              actionText="Create Session"
              actionHref="/dashboard/sessions/new"
            />
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl border border-[#E5E9E6] bg-[#F8F9F7]/60 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#172B4D]">
                      Session · {new Date(sess.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-[11px] text-[#667085] font-mono">
                      {new Date(sess.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/sessions/${sess.id}`}
                    className="text-xs font-semibold text-[#176B5B] hover:underline flex items-center gap-1"
                  >
                    <span>View Audit</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
