"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { getApiUrl, formatFetchError } from "@/lib/api";
import { AppLogo } from "@/components/ui/AppLogo";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const res = await fetch(getApiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid student credentials");
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_email", email);

      router.push("/student/dashboard");
    } catch (err: any) {
      setError(formatFetchError(err, "/api/v1/auth/login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col justify-between p-4 sm:p-6 antialiased">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between py-2">
        <AppLogo subtitle="Student Academic Portal" />
        <Link
          href="/"
          className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
        >
          ← Return to Homepage
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto my-8 bg-white rounded-2xl border border-[#CEEAD6] p-7 sm:p-9 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-[#E7F3EF] text-[#176B5B] rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight">
            Student Sign In
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Access your attendance percentage, class schedules, and records.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="student@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#172B4D]">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-[#176B5B] hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-10 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892A4] hover:text-[#172B4D] focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            <span>{loading ? "Authenticating..." : "Sign In as Student"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E5E9E6] text-center space-y-2">
          <p className="text-xs text-[#667085]">
            New to a classroom?{" "}
            <Link href="/join" className="font-semibold text-[#176B5B] hover:underline">
              Enroll with Course Code →
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#8892A4] py-2">
        Student Biometric Attendance · Apni Kaksha
      </div>
    </div>
  );
}
