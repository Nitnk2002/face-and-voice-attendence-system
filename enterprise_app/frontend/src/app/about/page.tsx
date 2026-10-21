"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck, HeartHandshake, Eye } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function AboutPage() {
  const principles = [
    {
      icon: <GraduationCap className="w-5 h-5 text-[#176B5B]" />,
      title: "Educators First",
      description:
        "Every minute saved taking roll call is a minute returned to teaching, discussion, and mentoring. Software should reduce administrative friction, not add complexity.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#176B5B]" />,
      title: "Scientific Integrity",
      description:
        "We never claim 100% infallible security or magical AI accuracy. We engineer transparent detection signals, provide confidence thresholds, and keep humans in the loop.",
    },
    {
      icon: <HeartHandshake className="w-5 h-5 text-[#176B5B]" />,
      title: "Respect for Student Privacy",
      description:
        "Biometric data must never become surveillance data. Enrolled templates are stored as mathematical embeddings and students always retain the right to manual check-in alternatives.",
    },
    {
      icon: <Eye className="w-5 h-5 text-[#176B5B]" />,
      title: "Open Accountability",
      description:
        "Attendance records represent official academic milestones. Every verification and teacher modification is recorded with transparent audit histories.",
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
              ABOUT APNI KAKSHA
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight mb-4">
              Modernizing classroom roll calls with responsible AI.
            </h1>
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              Apni Kaksha was built to solve a pervasive problem across educational institutions:
              the disruption, proxy attendance, and administrative overhead of manual paper roll
              calls.
            </p>
          </div>

          {/* Core Mission */}
          <div className="bg-white rounded-3xl border border-[#E5E9E6] p-8 sm:p-12 mb-16 shadow-2xs">
            <h2 className="text-2xl font-bold text-[#172B4D] mb-4">The Educational Challenge</h2>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed mb-6">
              In universities and high schools worldwide, attendance is a legal and academic
              prerequisite for course credit. Yet, instructors typically lose 10 to 15 minutes of every
              lecture manually calling roll. Meanwhile, paper sign-in sheets and shared digital forms
              are routinely exploited through buddy-punching and proxy attendance.
            </p>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              Apni Kaksha addresses this bottleneck through multi-modal biometrics: cross-referencing
              facial recognition embeddings (ArcFace 512-D) and 16kHz vocal spectrograms while
              actively analyzing presentation-attack signals to prevent screen replays.
            </p>
          </div>

          {/* Design & Engineering Principles */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-[#172B4D] mb-8">
              Guiding Engineering Principles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {principles.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#172B4D] mb-1">{item.title}</h3>
                      <p className="text-xs text-[#667085] leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Callout */}
          <div className="bg-[#172B4D] text-white rounded-3xl p-8 sm:p-10 text-center max-w-3xl mx-auto shadow-sm">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">
              Get Started with Apni Kaksha
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto mb-6 leading-relaxed">
              Experience the platform in action from faculty roll closure to student self-enrollment.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Teacher Login
              </Link>
              <Link
                href="/join"
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold transition-colors"
              >
                Student Enrollment
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
