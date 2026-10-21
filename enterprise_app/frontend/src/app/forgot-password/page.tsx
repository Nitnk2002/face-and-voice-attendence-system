"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { getApiUrl } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(getApiUrl("/api/v1/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        throw new Error("Unable to submit recovery request. Please try again.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col justify-between p-4 sm:p-6 antialiased">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between py-2">
        <AppLogo />
        <Link
          href="/login"
          className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
        >
          ← Back to Login
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto my-8 bg-white rounded-2xl border border-[#E5E9E6] p-7 sm:p-9 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight">
            Password Recovery
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Request an administrative credential reset or password assistance.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F4FBF7] border border-[#CEEAD6] text-xs text-[#16845B] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-[#137333] mb-1">
                  Request Logged
                </strong>
                If <strong>{email}</strong> is registered in the institutional directory, an
                administrator will issue a temporary reset link or credentials.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] text-xs text-[#667085] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#8892A4] shrink-0 mt-0.5" />
              <span>
                Note: In self-hosted campus deployments, password resets must be authorized by your
                system administrator. If you already have your old password, you can change it
                directly from your profile settings.
              </span>
            </div>

            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl bg-[#172B4D] hover:bg-[#176B5B] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <span>Return to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8892A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#172B4D] placeholder:text-[#8892A4] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] text-[11px] text-[#667085] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#8892A4] shrink-0 mt-0.5" />
              <span>
                To protect institutional records, automated external password recovery emails are
                governed by campus domain policies.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Submitting..." : "Submit Recovery Request"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#E5E9E6] text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#8892A4] py-2">
        Institutional Access Safeguard · Apni Kaksha
      </div>
    </div>
  );
}
