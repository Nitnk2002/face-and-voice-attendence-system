"use client";

import React, { useEffect, useState } from "react";
import { History, CheckCircle2, Clock4, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
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

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      fetchStudentAttendance(payload.sub);
    }
  }, []);

  const fetchStudentAttendance = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Fetch student's enrolled classes
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id, classes ( id, class_name )")
        .eq("student_id", userId);

      const classList = (enrollments || []).map((e: any) => e.classes).filter(Boolean);
      setClasses(classList);

      // 2. Fetch all attendance records
      const { data: recs } = await supabase
        .from("attendance_records")
        .select(`
          id,
          method,
          marked_at,
          attendance_sessions (
            id,
            class_id,
            date,
            classes ( class_name )
          )
        `)
        .eq("student_id", userId)
        .order("marked_at", { ascending: false });

      const formatted = (recs || []).map((r: any) => ({
        id: r.id,
        method: r.method,
        markedAt: r.marked_at,
        classId: r.attendance_sessions?.class_id || "",
        className: r.attendance_sessions?.classes?.class_name || "Course",
        date: r.attendance_sessions?.date || new Date(r.marked_at).toLocaleDateString(),
      }));

      setRecords(formatted);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(
    (r) => selectedClass === "all" || r.classId === selectedClass
  );

  return (
    <DashboardLayout role="student" title="My Attendance">
      <PageHeader
        title="My Attendance Records"
        description="Complete chronological log of all lecture check-ins verified by the system."
      />

      {/* Filter Row */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#667085]">Filter by course:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-[#F8F9F7] border border-[#D0D5DD] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
          >
            <option value="all">All Enrolled Courses</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-[#667085]">
          Verified Check-Ins: <strong>{filtered.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading attendance logs...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Attendance Check-Ins Found"
            description="You have no recorded check-ins for the selected course filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Course Title</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Verification Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#172B4D]">
                      {item.className}
                    </td>
                    <td className="px-4 py-3.5 text-[#667085]">{item.date}</td>
                    <td className="px-4 py-3.5 capitalize text-[#667085]">
                      {item.method === "face"
                        ? "Facial Recognition (ArcFace)"
                        : item.method === "voice"
                        ? "Vocal Spectrogram"
                        : "Instructor Manual Verification"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status="Present" size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[#667085]">
                      {new Date(item.markedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
