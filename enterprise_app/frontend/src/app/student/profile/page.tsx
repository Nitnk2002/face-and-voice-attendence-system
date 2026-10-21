"use client";

import React, { useEffect, useState } from "react";
import { User, Lock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>({ name: "", email: "", roll: "" });
  const [loading, setLoading] = useState(true);

  // Change Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (payload?.sub) {
      fetchProfile(payload.sub);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data: user } = await supabase
        .from("users")
        .select("name, email, custom_id")
        .eq("id", userId)
        .single();

      if (user) {
        setProfile({
          name: user.name,
          email: user.email,
          roll: user.custom_id || "N/A",
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
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
          email: profile.email.trim(),
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Password change failed.");
      }

      setPasswordMsg("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "An error occurred.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DashboardLayout role="student" title="Student Profile">
      <PageHeader
        title="Student Profile & Privacy"
        description="Manage your account security and review institutional biometric data protection policies."
      />

      <div className="grid lg:grid-cols-12 gap-8 max-w-5xl">
        {/* Left Column: Student Details & Biometric Disclosure */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">Academic Information</h2>
                <p className="text-xs text-[#667085]">Personal identifier and enrolled credentials.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] flex justify-between">
                <span className="text-[#667085]">Full Name:</span>
                <span className="font-bold text-[#172B4D]">{profile.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] flex justify-between">
                <span className="text-[#667085]">Enrollment ID:</span>
                <span className="font-mono font-bold text-[#172B4D]">{profile.roll}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] flex justify-between">
                <span className="text-[#667085]">Institutional Email:</span>
                <span className="font-mono text-[#172B4D]">{profile.email}</span>
              </div>
            </div>
          </div>

          {/* Biometric Privacy Safeguards Card */}
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F4FBF7] text-[#16845B] flex items-center justify-center border border-[#CEEAD6]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172B4D]">Biometric Data Protection</h3>
                <span className="text-[11px] text-[#16845B] font-semibold">Protected Template</span>
              </div>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed mb-4">
              Your biometric records are stored strictly as 512-dimensional mathematical feature
              embeddings. Raw photographic and audio recordings are never shared externally or used
              for commercial purposes.
            </p>
            <div className="text-[11px] text-[#667085] p-3 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6]">
              To request permanent deletion of your biometric enrollment templates upon course
              completion, contact your course instructor or campus administrator.
            </div>
          </div>
        </div>

        {/* Right Column: Password Change */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#F8F9F7] text-[#172B4D] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Change Password</h2>
              <p className="text-xs text-[#667085]">Update your student portal credentials.</p>
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
              className="py-2.5 px-5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
