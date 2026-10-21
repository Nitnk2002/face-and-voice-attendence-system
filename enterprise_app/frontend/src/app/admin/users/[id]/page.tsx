"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [customId, setCustomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, custom_id")
        .eq("id", id)
        .single();

      if (error || !data) throw error;
      setName(data.name);
      setEmail(data.email);
      setRole(data.role);
      setCustomId(data.custom_id || "");
    } catch {
      setErrorMsg("Failed to load user information.");
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
        .from("users")
        .update({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          custom_id: customId.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      setSuccessMsg("User account updated successfully.");
      setTimeout(() => {
        router.push("/admin/users");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not update user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Edit User">
      <PageHeader
        title="Edit User Profile"
        description="Update account details, role permissions, and institutional identifiers."
        backHref="/admin/users"
        backLabel="Back to User Directory"
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
          <div className="py-12 text-center text-xs text-[#667085]">Loading user data...</div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
              >
                <option value="student">Student</option>
                <option value="teacher">Faculty / Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Institutional ID / Roll
              </label>
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] font-mono focus:outline-none focus:border-[#176B5B]"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <Link
                href="/admin/users"
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
