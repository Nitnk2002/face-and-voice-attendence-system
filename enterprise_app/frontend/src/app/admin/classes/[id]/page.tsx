"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditClassroomPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchClassData();
  }, [id]);

  const fetchClassData = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name, join_code")
        .eq("id", id)
        .single();

      if (error || !data) throw error;
      setClassName(data.class_name);
      setJoinCode(data.join_code);
    } catch {
      setErrorMsg("Failed to load classroom details.");
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase
        .from("classes")
        .update({
          class_name: className.trim(),
          join_code: joinCode.trim().toUpperCase(),
        })
        .eq("id", id);

      if (error) throw error;

      setSuccessMsg("Classroom updated successfully.");
      setTimeout(() => {
        router.push("/admin/classes");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not update classroom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Edit Classroom">
      <PageHeader
        title="Edit Classroom Section"
        description="Modify classroom titles, enrollment codes, and section configurations."
        backHref="/admin/classes"
        backLabel="Back to Classrooms"
      />

      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E5E9E6] p-7 sm:p-9 shadow-2xs">
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#F4FBF7] border border-[#CEEAD6] text-xs text-[#16845B] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {fetching ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading classroom...</div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Classroom Course Name
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
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
                <span>{loading ? "Saving..." : "Save Changes"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
