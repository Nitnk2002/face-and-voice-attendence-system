"use client";

import React, { useEffect, useState } from "react";
import { Lock, User, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Change Password State
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetchClassData();
    const storedEmail = localStorage.getItem("user_email");
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const fetchClassData = async () => {
    try {
      const { data: classes } = await supabase.from("classes").select("*").limit(1);
      if (classes && classes.length > 0) {
        setClassId(classes[0].id);
        setClassName(classes[0].class_name);
        setJoinCode(classes[0].join_code);
      }
    } catch {
      // Fallback
    }
  };

  const handleUpdateClassName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage("");
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("classes")
        .update({ class_name: className })
        .eq("id", classId);

      if (error) throw error;
      setMessage("Classroom title updated successfully.");
    } catch {
      setErrorMsg("Failed to update classroom.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMsg("");
    setPasswordError("");

    try {
      const res = await fetch(getApiUrl("/api/v1/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Password change failed.");
      }

      setPasswordMsg("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "An error occurred.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout role="teacher" title="Settings & Profile">
      <PageHeader
        title="Faculty Settings"
        description="Manage your classroom configuration, join codes, and personal security preferences."
      />

      <div className="grid lg:grid-cols-12 gap-8 max-w-5xl">
        {/* Left Column: Classroom Configuration (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Active Classroom</h2>
              <p className="text-xs text-[#667085]">Edit course title and inspect join codes.</p>
            </div>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-[#F4FBF7] border border-[#CEEAD6] text-xs text-[#16845B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateClassName} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Classroom Name
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Current Join Code
              </label>
              <div className="p-3 bg-[#F8F9F7] rounded-xl border border-[#E5E9E6] font-mono text-sm font-bold text-[#176B5B]">
                {joinCode || "No Active Code"}
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="py-2.5 px-5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? "Saving..." : "Save Classroom Changes"}
            </button>
          </form>
        </div>

        {/* Right Column: Security & Password Change (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#F8F9F7] text-[#172B4D] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Security Credentials</h2>
              <p className="text-xs text-[#667085]">Update your account access password.</p>
            </div>
          </div>

          {passwordMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#F4FBF7] border border-[#CEEAD6] text-xs text-[#16845B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordMsg}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@institution.edu"
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="py-2.5 px-5 rounded-xl bg-[#172B4D] hover:bg-[#0F1E36] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
