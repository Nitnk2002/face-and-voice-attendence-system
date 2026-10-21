"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [customId, setCustomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Create user via backend auth API
      const res = await fetch(getApiUrl("/api/v1/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          role: role,
          custom_id: customId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create user account.");
      }

      setSuccessMsg(`User ${name} successfully registered.`);
      setTimeout(() => {
        router.push("/admin/users");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Create User">
      <PageHeader
        title="Add Campus User"
        description="Register a new student, teacher, or administrative user with designated credentials."
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Account Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  role === "student"
                    ? "bg-[#E7F3EF] border-[#176B5B] text-[#176B5B]"
                    : "border-[#D0D5DD] bg-white text-[#667085]"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  role === "teacher"
                    ? "bg-[#E7F3EF] border-[#176B5B] text-[#176B5B]"
                    : "border-[#D0D5DD] bg-white text-[#667085]"
                }`}
              >
                Faculty / Teacher
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  role === "admin"
                    ? "bg-[#E7F3EF] border-[#176B5B] text-[#176B5B]"
                    : "border-[#D0D5DD] bg-white text-[#667085]"
                }`}
              >
                Administrator
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Ramesh Gupta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="user@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Initial Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              {role === "student" ? "Roll / Student ID" : "Employee / Staff ID"}
            </label>
            <input
              type="text"
              placeholder={role === "student" ? "e.g. CS21B042" : "e.g. FAC-089"}
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] font-mono focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
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
              <span>{loading ? "Creating..." : "Save User Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
