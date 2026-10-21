"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, ArrowRight, ArrowLeft, Clock, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewSessionPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setFetching(true);
    try {
      const { data } = await supabase.from("classes").select("id, class_name, join_code");
      const list = data || [];
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
        setSessionTitle(`Regular Lecture — ${list[0].class_name}`);
      }
    } catch {
      // Fallback
    } finally {
      setFetching(false);
    }
  };

  const handleClassChange = (cid: string) => {
    setSelectedClassId(cid);
    const cls = classes.find((c) => c.id === cid);
    if (cls) {
      setSessionTitle(`Regular Lecture — ${cls.class_name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert({
          class_id: selectedClassId,
          date: sessionDate,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect directly to the live attendance scanner
      router.push("/dashboard/take-attendance");
    } catch {
      alert("Could not start session.");
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <DashboardLayout role="teacher" title="New Session">
      <PageHeader
        title="Create Attendance Session"
        description="Launch an active roll-call period to enable live camera and voice biometric check-ins."
        backHref="/dashboard/sessions"
        backLabel="Back to Sessions"
      />

      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E5E9E6] p-7 sm:p-9 shadow-2xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#172B4D]">Session Parameters</h2>
            <p className="text-xs text-[#667085]">
              Configure the target course and date for this check-in session.
            </p>
          </div>
        </div>

        {fetching ? (
          <div className="py-8 text-center text-xs text-[#667085]">Loading courses...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Target Classroom
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                required
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} (Code: {c.join_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Session Description / Period
              </label>
              <input
                type="text"
                required
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Period 2 — Operating Systems"
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Session Date
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              />
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] text-xs space-y-1.5 mt-4">
              <span className="font-bold text-[#172B4D] block mb-1">Session Summary Preview:</span>
              <div className="flex justify-between">
                <span className="text-[#667085]">Class:</span>
                <span className="font-semibold text-[#172B4D]">{selectedClass?.class_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Join Code:</span>
                <span className="font-mono text-[#176B5B] font-bold">{selectedClass?.join_code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Biometric Kiosk:</span>
                <span className="text-[#16845B] font-semibold">Enabled upon launch</span>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Link
                href="/dashboard/sessions"
                className="flex-1 py-3 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold flex items-center justify-center transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !selectedClassId}
                className="flex-1 py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? "Launching..." : "Start Active Session"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
