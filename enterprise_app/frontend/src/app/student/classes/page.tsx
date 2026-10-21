"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Plus, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      fetchEnrolledClasses(payload.sub);
    }
  }, []);

  const fetchEnrolledClasses = async (userId: string) => {
    setLoading(true);
    try {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          id,
          class_id,
          created_at,
          classes (
            id,
            class_name,
            join_code
          )
        `)
        .eq("student_id", userId);

      const list = (enrollments || []).map((e: any) => ({
        id: e.classes?.id,
        enrollmentId: e.id,
        className: e.classes?.class_name || "Course",
        joinCode: e.classes?.join_code || "—",
      }));

      setClasses(list);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="student" title="My Classrooms">
      <PageHeader
        title="Enrolled Courses"
        description="Classrooms where your biometric profile is active for lecture attendance."
        action={
          <Link
            href="/join"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </Link>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-[#667085]">Loading enrolled courses...</div>
      ) : classes.length === 0 ? (
        <EmptyState
          title="No Classrooms Enrolled"
          description="You are not currently registered in any classrooms. Ask your instructor for the course join code."
          actionText="Join a Classroom"
          actionHref="/join"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center font-bold text-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#176B5B] bg-[#E7F3EF] px-2.5 py-1 rounded-md">
                    {cls.joinCode}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#172B4D] mb-1">{cls.className}</h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-4">
                  Enrolled student with facial recognition and vocal parameters verified.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5E9E6] flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16845B]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Biometrics Active</span>
                </span>

                <Link
                  href="/student/attendance"
                  className="text-xs font-semibold text-[#176B5B] hover:underline flex items-center gap-1"
                >
                  <span>My Attendance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
