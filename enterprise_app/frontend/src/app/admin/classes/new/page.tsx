"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewClassroomPage() {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("CS-" + Math.floor(100 + Math.random() * 900));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.from("classes").insert({
        class_name: className.trim(),
        join_code: joinCode.trim().toUpperCase(),
      });

      if (error) throw error;
      router.push("/admin/classes");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create classroom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="New Classroom">
      <PageHeader
        title="Create Classroom Section"
        description="Add a new academic course or lecture section and configure student join codes."
        backHref="/admin/classes"
        backLabel="Back to Classrooms"
      />

      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E5E9E6] p-7 sm:p-9 shadow-2xs">
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Classroom Course Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CS-401: Cloud Computing"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Classroom Join Code
            </label>
            <input
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] font-mono uppercase tracking-wider focus:outline-none focus:border-[#176B5B]"
            />
            <span className="text-[11px] text-[#667085] mt-1 block">
              Students will use this code on the enrollment portal to register.
            </span>
          </div>

          <div className="flex gap-3 pt-3">
            <Link
              href="/admin/classes"
              className="flex-1 py-3 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold flex items-center justify-center transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Creating..." : "Save Classroom"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
