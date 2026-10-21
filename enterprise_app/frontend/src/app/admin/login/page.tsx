"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { getApiUrl, formatFetchError } from "@/lib/api";
import { AppLogo } from "@/components/ui/AppLogo";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function AdminLoginPage() {
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
        throw new Error(data.detail || "Invalid administrative credentials");
      }

      const data = await res.json();
      const payload = decodeJwtPayload(data.access_token);

      if (!payload || payload.role !== "admin") {
        throw new Error("Access denied. This account does not possess institutional admin privileges.");
      }

      localStorage.setItem("admin_token", data.access_token);
      localStorage.setItem("admin_role", payload.role);
      localStorage.setItem("user_name", "System Administrator");
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(formatFetchError(err, "/api/v1/auth/login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col justify-between p-4 sm:p-6 antialiased">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between py-2">
        <AppLogo subtitle="Institutional Admin Portal" />
        <Link
          href="/"
          className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
        >
          ← Return to Homepage
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto my-8 bg-white rounded-2xl border-2 border-slate-700/30 p-7 sm:p-9 shadow-md relative">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-[#172B4D] text-white rounded-xl flex items-center justify-center mb-4 shadow-xs">
            <ShieldAlert className="w-6 h-6 text-[#2DD4BF]" />
          </div>
          <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight">
            Administrator Console
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Restricted access for authorized campus system administrators.
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
              Admin Identifier / Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="admin@school.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#172B4D] focus:ring-1 focus:ring-[#172B4D] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-10 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#172B4D] focus:ring-1 focus:ring-[#172B4D] transition-all"
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
            className="w-full py-3 rounded-xl bg-[#172B4D] hover:bg-[#0F1E36] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            <span>{loading ? "Authenticating..." : "Authorize Admin Session"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E5E9E6] text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
          >
            ← Back to Faculty Login
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#8892A4] py-2">
        Institutional Access Safeguard · All administrative access attempts are logged
      </div>
    </div>
  );
}
