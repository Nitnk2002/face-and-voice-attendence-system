"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";

export default function JoinSuccessPage() {
  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col justify-between p-4 sm:p-6 antialiased">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <AppLogo subtitle="Enrollment Status" />
        <Link
          href="/"
          className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
        >
          ← Return to Homepage
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto my-8 bg-white rounded-2xl border border-[#CEEAD6] p-8 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-[#F4FBF7] text-[#16845B] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#CEEAD6] shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-[#172B4D] tracking-tight mb-2">
          Biometric Profile Active
        </h1>
        <p className="text-xs text-[#667085] leading-relaxed mb-6">
          Your facial recognition template and vocal acoustic parameters have been securely
          registered for your classroom sessions.
        </p>

        <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] text-left text-xs mb-8 space-y-2">
          <div className="flex justify-between">
            <span className="text-[#667085]">Status:</span>
            <span className="font-bold text-[#16845B]">Active & Enrolled</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#667085]">Next Step:</span>
            <span className="text-[#172B4D]">Check in during lecture</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/student/login"
            className="w-full py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <span>Sign In to Student Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/"
            className="w-full py-2.5 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#8892A4] py-2">
        Apni Kaksha · Multi-Modal Biometric Attendance System
      </div>
    </div>
  );
}
