"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock4,
  Users,
  ScanFace,
  FileCheck2,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SessionDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const [session, setSession] = useState<any>(null);
  const [className, setClassName] = useState<string>("Course");
  const [records, setRecords] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionDetails();

    const channel = supabase
      .channel(`session-audit-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `session_id=eq.${id}`,
        },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.student_id) {
            setRecords((prev) => {
              const copy = [...prev];
              const idx = copy.findIndex((r) => r.student_id === rec.student_id);
              if (idx !== -1) {
                copy[idx] = rec;
              } else {
                copy.push(rec);
              }
              return copy;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch session row
      const { data: sess } = await supabase
        .from("attendance_sessions")
        .select("id, class_id, date, is_active, created_at")
        .eq("id", id)
        .single();

      setSession(sess);

      if (sess) {
        // 2. Fetch class info
        const { data: cls } = await supabase
          .from("classes")
          .select("class_name")
          .eq("id", sess.class_id)
          .single();
        if (cls) setClassName(cls.class_name);

        // 3. Fetch all enrolled students
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("class_id", sess.class_id)
          .eq("status", "active");

        let studentList: any[] = [];
        if (enrollments && enrollments.length > 0) {
          const sIds = enrollments.map((e) => e.student_id);
          const { data: users } = await supabase
            .from("users")
            .select("id, name, email, custom_id")
            .in("id", sIds);
          studentList = users || [];
        }
        setEnrolledStudents(studentList);

        // 4. Fetch attendance records for this session
        const { data: recs } = await supabase
          .from("attendance_records")
          .select("id, student_id, method, marked_at")
          .eq("session_id", id);

        const recList = recs || [];
        setRecords(recList);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const markedMap: Record<string, any> = {};
  records.forEach((r) => {
    markedMap[r.student_id] = r;
  });

  const presentCount = records.length;
  const totalCount = enrolledStudents.length;
  const absentCount = Math.max(0, totalCount - presentCount);

  return (
    <DashboardLayout role="teacher" title="Session Audit">
      <PageHeader
        title={`Session: ${className}`}
        description={`Date: ${session?.date || "—"} · Conducted at ${
          session ? new Date(session.created_at).toLocaleTimeString() : "—"
        }`}
        backHref="/dashboard/sessions"
        backLabel="Back to Sessions"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/take-attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs"
            >
              <ScanFace className="w-4 h-4" />
              <span>Resume Scanner</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Present Students"
          value={presentCount}
          description="Verified biometrically"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          label="Absent / Unmarked"
          value={absentCount}
          description="Did not check in"
          icon={<Clock4 className="w-5 h-5" />}
          variant={absentCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total Class Size"
          value={totalCount}
          description="Enrolled in course"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Detailed Student Attendance Table */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        <h2 className="text-base font-bold text-[#172B4D] mb-1">Session Attendance Roster</h2>
        <p className="text-xs text-[#667085] mb-5">
          Comprehensive student log with verification method and timestamps.
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#667085]">Loading session audit...</div>
        ) : enrolledStudents.length === 0 ? (
          <EmptyState
            title="No Students in Classroom"
            description="Enroll students to review attendance records."
            actionText="Go to Classrooms"
            actionHref="/dashboard/classes"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Roll ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {enrolledStudents.map((s) => {
                  const rec = markedMap[s.id];
                  const isPresent = !!rec;

                  return (
                    <tr key={s.id} className="hover:bg-[#F8F9F7]/50">
                      <td className="px-4 py-3.5 font-semibold text-[#172B4D] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#172B4D] text-white flex items-center justify-center text-[10px] font-bold">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{s.name}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#667085]">
                        {s.custom_id || "N/A"}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={isPresent ? "Present" : "Absent"} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-[#667085] capitalize">
                        {rec?.method || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-[#667085]">
                        {rec?.marked_at
                          ? new Date(rec.marked_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
