"use client";

import React from "react";
import Link from "next/link";
import {
  ScanFace,
  Mic,
  CalendarCheck,
  Activity,
  Users,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function FeaturesPage() {
  const features = [
    {
      icon: <ScanFace className="w-6 h-6 text-[#176B5B]" />,
      title: "Facial Recognition Engine",
      subtitle: "ArcFace 512-D Deep Vectors",
      description:
        "Extracts normalized deep facial embeddings using InsightFace architectures. Features are compared using cosine similarity thresholds with sub-second response times.",
      tag: "Biometric Core",
    },
    {
      icon: <Mic className="w-6 h-6 text-[#176B5B]" />,
      title: "Voiceprint Verification",
      subtitle: "16kHz Acoustic Spectrograms",
      description:
        "Analyzes harmonic resonance, fundamental frequency, and formant distributions from microphone audio to authenticate spoken student check-ins.",
      tag: "Acoustic AI",
    },
    {
      icon: <CalendarCheck className="w-6 h-6 text-[#176B5B]" />,
      title: "Session-Based Management",
      subtitle: "Dynamic Timestamps & Periods",
      description:
        "Teachers launch isolated classroom sessions tied to real timetables. Attendance is recorded with precision timestamps and automatic duplicate rejection.",
      tag: "Workflow",
    },
    {
      icon: <Activity className="w-6 h-6 text-[#176B5B]" />,
      title: "Real-Time Dashboard Stream",
      subtitle: "Instant Telemetry & Feedback",
      description:
        "Attendance records broadcast instantly across the instructor kiosk and web console using reactive subscriptions, updating presence counts live.",
      tag: "Reactive Sync",
    },
    {
      icon: <Users className="w-6 h-6 text-[#176B5B]" />,
      title: "Self-Guided Student Enrollment",
      subtitle: "Browser-Based Registration",
      description:
        "Students join classes using enrollment codes. An interactive browser workflow captures reference facial portraits and 3-second audio clips with self-replay validation.",
      tag: "Onboarding",
    },
    {
      icon: <Building2 className="w-6 h-6 text-[#176B5B]" />,
      title: "Administrative Governance",
      subtitle: "Role-Based Access Controls",
      description:
        "Provides campus administrators with tools to manage instructors, courses, student directories, and institutional compliance standards.",
      tag: "Administration",
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-[#176B5B]" />,
      title: "Attendance Audits & Reports",
      subtitle: "Class Trends & Percentages",
      description:
        "Generates weekly and monthly attendance breakdowns, highlighting chronic absentees and verifying student eligibility for final examinations.",
      tag: "Analytics",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#176B5B]" />,
      title: "Multi-Layer Anti-Spoofing",
      subtitle: "Presentation-Attack Signals",
      description:
        "Assesses bezel contours, 2D FFT Moiré patterns, specular screen glare, and acoustic replay traits to alert instructors of potential presentation attacks.",
      tag: "Security",
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
              PLATFORM CAPABILITIES
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight mb-4">
              Engineered for precision and classroom speed.
            </h1>
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              Explore the technical capabilities powering Apni Kaksha — from deep biometric vector
              embeddings to real-time institutional synchronizations.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs hover:shadow-sm hover:border-[#176B5B] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F4FBF7] border border-[#CEEAD6] flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-bold text-[#667085] bg-[#F4F6F4] px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#172B4D] mb-1">{item.title}</h3>
                  <div className="text-xs font-semibold text-[#176B5B] mb-2">{item.subtitle}</div>
                  <p className="text-xs text-[#667085] leading-relaxed mb-4">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Technical Interface Banner */}
          <div className="bg-[#172B4D] text-white rounded-3xl p-8 sm:p-12 shadow-lg mb-16">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-bold uppercase tracking-widest text-[#2DD4BF]">
                  MULTI-MODAL CONSENSUS
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold mt-2 mb-4 tracking-tight">
                  Dual-biometric verification prevents false positives.
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Single-biometric systems often suffer from environmental vulnerabilities like
                  dim lighting or ambient noise. Apni Kaksha pairs facial embeddings with acoustic
                  vocal properties to guarantee high confidence verification.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                    <span>Cross-validated scoring eliminates single points of failure</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                    <span>Sub-2 second total verification time per attending student</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 bg-[#0F1E36] p-6 rounded-2xl border border-slate-700 font-mono text-xs">
                <div className="text-[#2DD4BF] font-bold mb-3 text-[11px] uppercase tracking-wider">
                  Biometric Telemetry Matrix
                </div>
                <div className="space-y-2.5 text-slate-300">
                  <div className="flex justify-between pb-1.5 border-b border-slate-800">
                    <span>Face ArcFace Similarity</span>
                    <span className="text-white font-bold">&gt; 0.70 Threshold</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-800">
                    <span>Voice Acoustic Cosine</span>
                    <span className="text-white font-bold">&gt; 0.70 Threshold</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-slate-800">
                    <span>Subpixel Screen Lattice</span>
                    <span className="text-[#2DD4BF] font-bold">Passed</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Override Fallback</span>
                    <span className="text-white font-bold">Always Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Strip */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#172B4D] mb-2">Ready to see it in action?</h3>
            <p className="text-xs text-[#667085] mb-6">
              Launch a live session or enroll students in less than 2 minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-[#172B4D] hover:bg-[#176B5B] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Sign In as Teacher
              </Link>
              <Link
                href="/join"
                className="px-6 py-3 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F2F4F2] text-[#172B4D] text-xs font-semibold shadow-2xs transition-colors"
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
