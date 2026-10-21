"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { AppLogo } from "@/components/ui/AppLogo";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
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
      if (isLogin) {
        // OAuth2 password form request
        const params = new URLSearchParams();
        params.append("username", email);
        params.append("password", password);

        const res = await fetch(getApiUrl("/api/v1/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Invalid email or password");
        }

        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_email", email);

        if (data.role === "student") {
          router.push("/student/dashboard");
        } else if (data.role === "admin") {
          localStorage.setItem("admin_token", data.access_token);
          localStorage.setItem("admin_role", "admin");
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        // Teacher / Faculty Sign-up
        const res = await fetch(getApiUrl("/api/v1/auth/signup"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name || "Faculty Member",
            email,
            password,
            role: "teacher",
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Registration failed. Email may already be in use.");
        }

        setIsLogin(true);
        setError("");
        alert("Account created successfully. Please sign in with your credentials.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col justify-between p-4 sm:p-6 antialiased">
      {/* Top Header */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between py-2">
        <AppLogo />
        <Link
          href="/"
          className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
        >
          ← Return to Homepage
        </Link>
      </div>

      {/* Centered Auth Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-white rounded-2xl border border-[#E5E9E6] p-7 sm:p-9 shadow-sm">
        {/* Toggle Mode */}
        <div className="flex p-1 bg-[#F4F6F4] rounded-xl mb-6 border border-[#E5E9E6]">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isLogin ? "bg-white text-[#172B4D] shadow-2xs" : "text-[#667085] hover:text-[#172B4D]"
            }`}
          >
            Faculty Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isLogin
                ? "bg-white text-[#172B4D] shadow-2xs"
                : "text-[#667085] hover:text-[#172B4D]"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight">
            {isLogin ? "Welcome back" : "Register faculty account"}
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            {isLogin
              ? "Access your assigned courses and live attendance kiosk."
              : "Set up a new instructor profile to begin managing sessions."}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Prof. Kavita Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="teacher@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#172B4D]">Password</label>
              {isLogin && (
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-[#176B5B] hover:underline"
                >
                  Forgot password?
                </Link>
              )}
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
            className="w-full py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Processing..." : isLogin ? "Sign In to Dashboard" : "Register Account"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E5E9E6] text-center space-y-2">
          <p className="text-[11px] text-[#667085]">
            Looking for other portals?
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold">
            <Link href="/join" className="text-[#176B5B] hover:underline">
              Student Enrollment
            </Link>
            <span className="text-[#D0D5DD]">•</span>
            <Link href="/student/login" className="text-[#176B5B] hover:underline">
              Student Sign In
            </Link>
            <span className="text-[#D0D5DD]">•</span>
            <Link href="/admin/login" className="text-[#667085] hover:text-[#172B4D]">
              Admin Console
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center text-[11px] text-[#8892A4] py-2">
        Apni Kaksha Biometric Platform · Secured with ArcFace & 16kHz Vocal Analysis
      </div>
    </div>
  );
}
