"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, CalendarCheck, Clock4, ScanFace, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // 1. Fetch sessions with class info
      const { data: sList } = await supabase
        .from("attendance_sessions")
        .select("id, class_id, date, is_active, created_at")
        .order("created_at", { ascending: false });

      const list = sList || [];

      // Fetch class names and record counts
      const enriched = await Promise.all(
        list.map(async (sess: any) => {
          const { data: cls } = await supabase
            .from("classes")
            .select("class_name, join_code")
            .eq("id", sess.class_id)
            .single();

          const { count } = await supabase
            .from("attendance_records")
            .select("*", { count: "exact", head: true })
            .eq("session_id", sess.id);

          return {
            ...sess,
            className: cls?.class_name || "General Course",
            joinCode: cls?.join_code || "—",
            presentCount: count || 0,
          };
        })
      );

      setSessions(enriched);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="teacher" title="Attendance Sessions">
      <PageHeader
        title="Attendance Sessions"
        description="Review active lecture check-ins, past attendance logs, and finalized session archives."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/sessions/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Session</span>
            </Link>
            <Link
              href="/dashboard/take-attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <ScanFace className="w-4 h-4" />
              <span>Open Scanner</span>
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#172B4D]">Session History</h2>
          <span className="text-xs text-[#667085]">
            Total Recorded Sessions: <strong>{sessions.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No Attendance Sessions Found"
            description="Start a new classroom session to record attendance with face and voice verification."
            actionText="Create New Session"
            actionHref="/dashboard/sessions/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Classroom</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Present Count</th>
                  <th className="px-4 py-3">Created Timestamp</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {sessions.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#172B4D]">
                      <div>{item.className}</div>
                      <span className="text-[10px] text-[#8892A4] font-mono">
                        Code: {item.joinCode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#172B4D]">
                      {item.date || new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={item.is_active ? "Active" : "Completed"}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#16845B]">
                      {item.presentCount} verified
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/dashboard/sessions/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B5B] hover:underline"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
