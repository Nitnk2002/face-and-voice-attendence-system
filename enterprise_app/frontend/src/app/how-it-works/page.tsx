"use client";

import React from "react";
import Link from "next/link";
import {
  UserPlus,
  Camera,
  CalendarCheck,
  ScanFace,
  UserCheck,
  FileCheck2,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      icon: <UserPlus className="w-5 h-5 text-[#176B5B]" />,
      title: "Register & Join Classroom",
      role: "Student",
      description:
        "Students access the platform via their mobile browser or laptop using a unique classroom join code provided by their instructor.",
    },
    {
      number: "02",
      icon: <Camera className="w-5 h-5 text-[#176B5B]" />,
      title: "Capture Face & Voice Samples",
      role: "Student",
      description:
        "Students capture a front-facing portrait and record a 3 to 5 second audio clip. An in-browser playback allows them to confirm audio clarity before submitting.",
    },
    {
      number: "03",
      icon: <CalendarCheck className="w-5 h-5 text-[#176B5B]" />,
      title: "Create Attendance Session",
      role: "Teacher",
      description:
        "At the start of lecture, the instructor starts an attendance session with 1 click. The system tags the session with date, period, and classroom metadata.",
    },
    {
      number: "04",
      icon: <ScanFace className="w-5 h-5 text-[#176B5B]" />,
      title: "Perform Biometric Verification",
      role: "Kiosk / System",
      description:
        "Students present themselves to the classroom kiosk or instructor device. ArcFace deep embeddings and acoustic spectra are cross-referenced in sub-seconds.",
    },
    {
      number: "05",
      icon: <UserCheck className="w-5 h-5 text-[#176B5B]" />,
      title: "Review Uncertain Matches",
      role: "Teacher",
      description:
        "Any low-confidence scores, screen reflection alerts, or lighting anomalies trigger an immediate review prompt, giving teachers manual verification power.",
    },
    {
      number: "06",
      icon: <FileCheck2 className="w-5 h-5 text-[#176B5B]" />,
      title: "Finalize & Seal Session",
      role: "Teacher",
      description:
        "Once verified, the teacher closes the roll. Attendance records are cryptographically timestamped and committed to the institutional database.",
    },
    {
      number: "07",
      icon: <BarChart3 className="w-5 h-5 text-[#176B5B]" />,
      title: "Review Attendance Reports",
      role: "Teacher & Admin",
      description:
        "Both faculty and campus deans inspect class-level attendance averages, student-specific percentages, and export CSV compliance logs.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] font-sans antialiased flex flex-col justify-between">
      <PublicNavbar />

      <main className="flex-1 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F3EF] text-[#176B5B] text-xs font-bold tracking-wider uppercase mb-4 border border-[#176B5B]/25">
              END-TO-END WORKFLOW
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight mb-4">
              From enrollment to final reporting.
            </h1>
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              Understand the complete sequence of how students enroll, attend lectures, and how
              educators verify attendance with zero paperwork.
            </p>
          </div>

          {/* Connected Process Flow */}
          <div className="space-y-6 max-w-4xl mx-auto mb-20">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs hover:shadow-sm hover:border-[#176B5B] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-base font-extrabold text-[#176B5B] bg-[#E7F3EF] w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                    {step.number}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-[#172B4D]">{step.title}</h3>
                      <span className="text-[10px] font-bold text-[#667085] bg-[#F4F6F4] px-2 py-0.5 rounded uppercase">
                        {step.role}
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] leading-relaxed max-w-xl">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] flex items-center justify-center shrink-0 self-end sm:self-center">
                  {step.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Callout */}
          <div className="bg-[#172B4D] text-white rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-md">
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Ready to test the workflow?</h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto mb-8 leading-relaxed">
              Explore the student onboarding portal or log in as faculty to launch a demo lecture
              session.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/join"
                className="px-6 py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Try Student Enrollment
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold transition-colors"
              >
                Teacher Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
