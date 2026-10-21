"use client";

import React, { useEffect, useState } from "react";
import { Download, Filter, Search, Calendar, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: classList } = await supabase.from("classes").select("id, class_name");
      setClasses(classList || []);

      // Fetch attendance records with student info
      const { data: recs } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, method, marked_at")
        .order("marked_at", { ascending: false })
        .limit(100);

      const list = recs || [];

      // Join with student users & sessions
      const enriched = await Promise.all(
        list.map(async (r: any) => {
          const { data: u } = await supabase
            .from("users")
            .select("name, custom_id, email")
            .eq("id", r.student_id)
            .single();

          const { data: sess } = await supabase
            .from("attendance_sessions")
            .select("class_id, date")
            .eq("id", r.session_id)
            .single();

          let cName = "Course";
          if (sess) {
            const match = (classList || []).find((c: any) => c.id === sess.class_id);
            if (match) cName = match.class_name;
          }

          return {
            ...r,
            studentName: u?.name || "Student",
            roll: u?.custom_id || "N/A",
            className: cName,
            classId: sess?.class_id || "",
            date: sess?.date || new Date(r.marked_at).toLocaleDateString(),
          };
        })
      );

      setRecords(enriched);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ["Record ID", "Student Name", "Roll ID", "Class", "Method", "Date", "Timestamp"];
    const rows = filtered.map((r) => [
      r.id,
      r.studentName,
      r.roll,
      r.className,
      r.method,
      r.date,
      new Date(r.marked_at).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = records.filter((r) => {
    const matchesClass = selectedClass === "all" || r.classId === selectedClass;
    const matchesSearch =
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.roll.toLowerCase().includes(search.toLowerCase()) ||
      r.className.toLowerCase().includes(search.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <DashboardLayout role="teacher" title="Attendance History">
      <PageHeader
        title="Attendance Logs"
        description="Historical log of biometric check-ins across courses with export capabilities."
        action={
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* Filter Row */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <SearchInput
            placeholder="Search student or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-[#F8F9F7] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
          >
            <option value="all">All Classrooms</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-[#667085]">
          Showing <strong>{filtered.length}</strong> recorded check-ins
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading attendance logs...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Attendance Logs Found"
            description="No check-ins match your current search and classroom filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Roll ID</th>
                  <th className="px-4 py-3">Classroom</th>
                  <th className="px-4 py-3">Verification Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#172B4D]">
                      {r.studentName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">{r.roll}</td>
                    <td className="px-4 py-3.5 text-[#172B4D]">{r.className}</td>
                    <td className="px-4 py-3.5 capitalize text-[#667085]">
                      {r.method === "face"
                        ? "Facial (ArcFace)"
                        : r.method === "voice"
                        ? "Vocal Spectrogram"
                        : "Manual Override"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status="Present" size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[#667085]">
                      {new Date(r.marked_at).toLocaleDateString()} ·{" "}
                      {new Date(r.marked_at).toLocaleTimeString([], {
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
