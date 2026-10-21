"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ScanFace,
  Mic,
  ShieldCheck,
  CheckCircle2,
  Clock4,
  ArrowRight,
  Users,
  GraduationCap,
  Building2,
  AlertTriangle,
  Activity,
  Sparkles,
  Eye,
  UserCheck,
  ShieldAlert,
  Lock,
  RotateCw,
  FileText,
  Server,
  ExternalLink,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function HomePage() {
  const [activeSimulatedStudent, setActiveSimulatedStudent] = useState(0);

  const sampleStudents = [
    {
      name: "Aarav Patel",
      roll: "CS21B042",
      faceScore: 98.4,
      voiceScore: 94.2,
      antiSpoof: "Clean (Texture & FFT Normal)",
      status: "Verified",
      time: "09:42:15 AM",
      avatar: "AP",
    },
    {
      name: "Priya Sharma",
      roll: "CS21B089",
      faceScore: 97.1,
      voiceScore: 92.8,
      antiSpoof: "Clean (No Bezel Edge)",
      status: "Verified",
      time: "09:42:38 AM",
      avatar: "PS",
    },
    {
      name: "Rohan Verma",
      roll: "CS21B104",
      faceScore: 95.6,
      voiceScore: 90.4,
      antiSpoof: "Clean (RGB Lattice Normal)",
      status: "Verified",
      time: "09:43:02 AM",
      avatar: "RV",
    },
    {
      name: "Simran Kaur",
      roll: "CS21B112",
      faceScore: 78.2,
      voiceScore: 81.0,
      antiSpoof: "Flagged (High Screen Reflection)",
      status: "Review",
      time: "09:43:40 AM",
      avatar: "SK",
    },
  ];

  const currentStudent = sampleStudents[activeSimulatedStudent];

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] selection:bg-[#176B5B]/20 selection:text-[#172B4D] font-sans antialiased flex flex-col justify-between">
      {/* SECTION 1: Shared Public Navigation */}
      <PublicNavbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* SECTION 2: Hero Section (Two-Column Layout) */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline, Copy & CTAs */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F3EF] text-[#176B5B] text-xs font-bold tracking-wider uppercase mb-5 border border-[#176B5B]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B] animate-pulse"></span>
                SMART ATTENDANCE · BUILT FOR EDUCATION
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-[#172B4D] tracking-tight leading-[1.12] mb-6">
                Attendance that knows it’s{" "}
                <span className="relative whitespace-nowrap">
                  <span className="text-[#176B5B]">really you</span>
                  <svg
                    className="absolute -bottom-1 left-0 w-full text-[#176B5B]/30 h-2"
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,15 Q50,0 100,15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                  </svg>
                </span>
                .
              </h1>

              {/* Supporting Paragraph */}
              <p className="text-base sm:text-lg text-[#667085] leading-relaxed mb-8 max-w-xl">
                Make classroom attendance faster, smarter, and more secure with facial
                recognition, voice verification, and multi-layer anti-spoofing checks.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto mb-8">
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#172B4D] hover:bg-[#176B5B] text-white text-sm font-semibold transition-all shadow-xs"
                >
                  <span>Explore the Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F2F4F2] text-[#172B4D] text-sm font-semibold transition-all shadow-2xs"
                >
                  <span>See How It Works</span>
                </Link>
              </div>

              {/* 3 Concise Trust Points */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-[#E5E9E6] w-full text-xs font-medium text-[#475569]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Face + voice verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>Anti-spoofing defense</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0">
                    <Clock4 className="w-3.5 h-3.5" />
                  </div>
                  <span>Live classroom sync</span>
                </div>
              </div>
            </div>

            {/* Right Column: Realistic HTML/CSS Product Preview Mockup */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl border border-[#D0D5DD] shadow-lg overflow-hidden transition-all hover:shadow-xl">
                {/* Mock Application Chrome Bar */}
                <div className="bg-[#172B4D] px-4 py-3 flex items-center justify-between text-white border-b border-[#0F1E36]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                    <span className="ml-2 text-xs font-mono text-slate-300">
                      Apni Kaksha · Session Console
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#176B5B]/30 text-[#2DD4BF] border border-[#2DD4BF]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-ping"></span>
                      LIVE SESSION
                    </span>
                  </div>
                </div>

                {/* Session Context Header */}
                <div className="p-4 bg-[#F8F9F7] border-b border-[#E5E9E6] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D]">
                      CS302: Operating Systems Architecture
                    </h3>
                    <p className="text-xs text-[#667085]">
                      Lecture Hall 4B · Prof. K. Sharma · 09:30 – 10:45 AM
                    </p>
                  </div>
                  {/* Attendance Counts */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                      24 Present
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">
                      2 Pending
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]">
                      1 Flagged
                    </span>
                  </div>
                </div>

                {/* Active Verification Panel (Interactive Mock) */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#176B5B]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                        Verification Telemetry
                      </span>
                    </div>
                    <span className="text-[11px] text-[#667085] font-mono">
                      Event #{activeSimulatedStudent + 1} of 4
                    </span>
                  </div>

                  {/* Student Card Under Review */}
                  <div className="bg-[#F8F9F7] rounded-xl p-3.5 border border-[#E5E9E6] mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#172B4D] text-white flex items-center justify-center font-bold text-xs">
                          {currentStudent.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#172B4D]">
                            {currentStudent.name}
                          </div>
                          <div className="text-xs text-[#667085] font-mono">
                            {currentStudent.roll} · Logged at {currentStudent.time}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                          currentStudent.status === "Verified"
                            ? "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]"
                            : "bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]"
                        }`}
                      >
                        {currentStudent.status}
                      </span>
                    </div>

                    {/* 3 Metric Breakdown Bars */}
                    <div className="mt-3.5 pt-3 border-t border-[#E5E9E6] space-y-2.5">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[#475569] flex items-center gap-1.5">
                            <ScanFace className="w-3.5 h-3.5 text-[#176B5B]" />
                            Face Match (ArcFace 512-D)
                          </span>
                          <span className="font-mono font-bold text-[#172B4D]">
                            {currentStudent.faceScore}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              currentStudent.faceScore > 85 ? "bg-[#176B5B]" : "bg-[#B7791F]"
                            }`}
                            style={{ width: `${currentStudent.faceScore}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[#475569] flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-[#176B5B]" />
                            Voiceprint (16kHz Acoustic)
                          </span>
                          <span className="font-mono font-bold text-[#172B4D]">
                            {currentStudent.voiceScore}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              currentStudent.voiceScore > 85 ? "bg-[#176B5B]" : "bg-[#B7791F]"
                            }`}
                            style={{ width: `${currentStudent.voiceScore}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[#475569] flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#176B5B]" />
                            Anti-Spoofing Signal
                          </span>
                          <span
                            className={`font-mono font-semibold text-[11px] ${
                              currentStudent.status === "Verified"
                                ? "text-[#137333]"
                                : "text-[#B06000]"
                            }`}
                          >
                            {currentStudent.antiSpoof}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Carousel Selector */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#667085]">
                      Cycle through simulated check-ins:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sampleStudents.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSimulatedStudent(idx)}
                          className={`w-6 h-6 rounded text-xs font-semibold transition-all ${
                            activeSimulatedStudent === idx
                              ? "bg-[#172B4D] text-white"
                              : "bg-[#EAECE9] text-[#667085] hover:bg-[#DCDFD9]"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Demo Data Disclaimer */}
                <div className="px-4 py-2.5 bg-[#F1F3F5] border-t border-[#E5E9E6] text-[11px] text-[#667085] text-center flex items-center justify-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#667085]"></span>
                  <span>Simulated classroom session · Illustrative interface demo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: Credibility Strip */}
        {/* ========================================================================= */}
        <section className="border-y border-[#E5E9E6] bg-white/70 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0 border border-[#CEEAD6]">
                  <ScanFace className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                    Face Recognition
                  </div>
                  <div className="text-[11px] text-[#667085]">ArcFace 512-D Embeddings</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0 border border-[#CEEAD6]">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                    Voice Verification
                  </div>
                  <div className="text-[11px] text-[#667085]">16kHz Acoustic Spectrograms</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0 border border-[#CEEAD6]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                    Anti-Spoofing Checks
                  </div>
                  <div className="text-[11px] text-[#667085]">Screen & Replay Detection</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center shrink-0 border border-[#CEEAD6]">
                  <Clock4 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                    Real-Time Attendance
                  </div>
                  <div className="text-[11px] text-[#667085]">Sub-Second Verification</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: The Problem and the Solution */}
        {/* ========================================================================= */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-bold tracking-widest uppercase text-[#176B5B]">
              Reclaiming Educational Time
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172B4D] tracking-tight mt-2 mb-4">
              Less time taking attendance. More time teaching.
            </h2>
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              Every day in colleges and schools, educators lose 10 to 15 minutes of instructional time
              calling out names while proxies compromise grading integrity. Apni Kaksha replaces
              paper registers with automated verification.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* The 3 Everyday Problems */}
            <div className="lg:col-span-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#667085] px-1">
                The Friction of Traditional Roll Calls
              </div>

              <div className="p-5 rounded-xl border border-[#E5E9E6] bg-white shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <span className="font-mono text-sm font-bold text-[#B7791F] bg-[#FEF7E0] w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                    01
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D] mb-1">
                      Manual roll calls interrupt lesson flow
                    </h3>
                    <p className="text-xs text-[#667085] leading-relaxed">
                      Calling out 60 to 100 names wastes 15–20% of an instruction hour. Teachers
                      start late, lose student engagement, and scramble to complete syllabi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-[#E5E9E6] bg-white shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <span className="font-mono text-sm font-bold text-[#B7791F] bg-[#FEF7E0] w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                    02
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D] mb-1">
                      Proxy attendance undermines academic integrity
                    </h3>
                    <p className="text-xs text-[#667085] leading-relaxed">
                      Paper signatures and simple shared QR codes are easily passed between peers,
                      creating false attendance records and unearned credits.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-[#E5E9E6] bg-white shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <span className="font-mono text-sm font-bold text-[#B7791F] bg-[#FEF7E0] w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                    03
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D] mb-1">
                      Paper registers make reporting cumbersome
                    </h3>
                    <p className="text-xs text-[#667085] leading-relaxed">
                      Manual transcription into institutional spreadsheets is slow and error-prone.
                      Department chairs receive attendance audits weeks behind schedule.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* The Solution */}
            <div className="lg:col-span-6 bg-[#172B4D] text-white p-7 rounded-2xl flex flex-col justify-between shadow-md">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#176B5B]/30 text-[#2DD4BF] text-xs font-semibold mb-4 border border-[#2DD4BF]/25">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The Modernized Solution</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                  Session-based, multi-modal verification in seconds.
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Apni Kaksha creates isolated, timestamped attendance sessions where physical
                  presence is verified through biometric consensus rather than honor codes.
                </p>

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#176B5B] text-white flex items-center justify-center text-xs shrink-0 font-bold">
                      ✓
                    </div>
                    <span className="text-xs text-slate-200">
                      <strong>Instant Roll Closure:</strong> Teacher opens session, camera checks
                      attendees in under 3 seconds per student.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#176B5B] text-white flex items-center justify-center text-xs shrink-0 font-bold">
                      ✓
                    </div>
                    <span className="text-xs text-slate-200">
                      <strong>Dual Biometric Assurance:</strong> Requires facial cosine match
                      plus acoustic vocal feature resonance.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#176B5B] text-white flex items-center justify-center text-xs shrink-0 font-bold">
                      ✓
                    </div>
                    <span className="text-xs text-slate-200">
                      <strong>Automated Institutional Records:</strong> Sessions sync directly
                      to administrative logs with full audit trails.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>Zero paper registers</span>
                <span>Cryptographic audit trail</span>
                <span>Immediate sync</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: Security and Anti-Spoofing (#142820 Dark Security) */}
        {/* ========================================================================= */}
        <section id="security" className="py-20 bg-[#142820] text-slate-200 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176B5B]/30 text-[#2DD4BF] text-xs font-bold tracking-widest uppercase mb-4 border border-[#2DD4BF]/25">
                <ShieldAlert className="w-3.5 h-3.5" />
                DEFENSE-IN-DEPTH ARCHITECTURE
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
                Built to question what the camera sees.
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                Attendance verification goes beyond recognizing a face. Apni Kaksha combines
                biometric matching with presentation-attack detection signals to help identify
                suspicious check-ins, phone screens, and replay recordings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-[#1C362B] border border-emerald-900/60 rounded-xl p-5 hover:border-[#2DD4BF]/50 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#176B5B]/30 text-[#2DD4BF] flex items-center justify-center mb-4">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">
                  Visual Presentation-Attack Signals
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Evaluates subtle visual artifacts including subpixel RGB grid variance, high-frequency
                  2D FFT Moiré patterns, screen glass specular glare, and bezel contours.
                </p>
              </div>

              <div className="bg-[#1C362B] border border-emerald-900/60 rounded-xl p-5 hover:border-[#2DD4BF]/50 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#176B5B]/30 text-[#2DD4BF] flex items-center justify-center mb-4">
                  <ScanFace className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Facial ArcFace Matching</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Computes 512-dimensional normalized deep feature vectors using InsightFace ArcFace.
                  Matches are evaluated by cosine similarity thresholds against enrolled references.
                </p>
              </div>

              <div className="bg-[#1C362B] border border-emerald-900/60 rounded-xl p-5 hover:border-[#2DD4BF]/50 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#176B5B]/30 text-[#2DD4BF] flex items-center justify-center mb-4">
                  <Mic className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Voice Feature Verification</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Extracts 16kHz acoustic spectral properties and pitch consistency from spoken
                  prompts, helping distinguish live phonation from loudspeaker replay distortion.
                </p>
              </div>

              <div className="bg-[#1C362B] border border-emerald-900/60 rounded-xl p-5 hover:border-[#2DD4BF]/50 transition-all">
                <div className="w-9 h-9 rounded-lg bg-[#176B5B]/30 text-[#2DD4BF] flex items-center justify-center mb-4">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Verification Human Review</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Avoids treating matches as infallible. Borderline scores or anomalous signals
                  trigger an immediate warning flag for instructor confirmation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0E1B15] border border-emerald-900/80 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#EAB308] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Technical Integrity Note:</strong> Biometric
                matching and anti-spoofing are deployed as multi-layer statistical detection
                signals, not infallible guarantees. No single algorithm distinguishes every real
                face from every adversarial presentation. Apni Kaksha empowers human educators
                with final review authority rather than relying on uncertified black-box claims.
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: Role Portals */}
        {/* ========================================================================= */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-[#176B5B]">
              Tailored Portals
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#172B4D] tracking-tight mt-2 mb-3">
              Purpose-built for every campus stakeholder
            </h2>
            <p className="text-sm text-[#667085]">
              Clear role boundaries ensure seamless classroom execution and institutional oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Faculty */}
            <div className="rounded-2xl border border-[#D0D5DD] bg-white p-7 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-[#172B4D] text-white flex items-center justify-center mb-5">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#176B5B]">
                  Faculty Suite
                </span>
                <h3 className="text-xl font-bold text-[#172B4D] mt-1 mb-3">For Teachers</h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-6">
                  Manage live attendance sessions with zero classroom friction. Review real-time
                  student matches and retain manual override controls.
                </p>
                <ul className="space-y-2.5 text-xs text-[#475569] mb-8">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                    <span>One-click session launch with auto timestamps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                    <span>Real-time face + voice match telemetry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                    <span>Classroom percentage trend summaries</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#172B4D] hover:bg-[#176B5B] text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Teacher Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Students */}
            <div className="rounded-2xl border-2 border-[#176B5B] bg-[#F4FBF7] p-7 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 bg-[#176B5B] text-white text-[10px] font-bold px-3 py-0.5 rounded-full tracking-wider uppercase">
                Student Self-Service
              </div>
              <div>
                <div className="w-11 h-11 rounded-xl bg-[#176B5B] text-white flex items-center justify-center mb-5">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#176B5B]">
                  Student Hub
                </span>
                <h3 className="text-xl font-bold text-[#172B4D] mt-1 mb-3">For Students</h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-6">
                  Join enrolled classrooms using unique course codes. Complete face and voice
                  registration with self-replay checks to ensure accuracy.
                </p>
                <ul className="space-y-2.5 text-xs text-[#475569] mb-8">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                    <span>Join courses with simple classroom codes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                    <span>In-app audio playback verification before submit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                    <span>Personal attendance calendar & status history</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/join"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Student Portal & Enrollment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Administrators */}
            <div className="rounded-2xl border border-[#D0D5DD] bg-white p-7 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-[#172B4D] border border-slate-300 flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                  Institutional Oversight
                </span>
                <h3 className="text-xl font-bold text-[#172B4D] mt-1 mb-3">For Administrators</h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-6">
                  Maintain campus-wide governance, department hierarchies, user accounts, and
                  institutional attendance compliance archives.
                </p>
                <ul className="space-y-2.5 text-xs text-[#475569] mb-8">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Manage user accounts, teachers, and departments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Export institutional CSV & audit logs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Role-based access controls (RBAC)</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#D0D5DD] bg-white hover:bg-slate-50 text-[#172B4D] text-xs font-bold transition-all shadow-xs"
              >
                <span>Admin Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 7: Final CTA */}
        {/* ========================================================================= */}
        <section className="py-20 bg-[#172B4D] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176B5B]/30 text-[#2DD4BF] text-xs font-bold tracking-widest uppercase mb-6 border border-[#2DD4BF]/25">
              MODERNIZE YOUR CLASSROOM
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5">
              Make every classroom check-in count.
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Streamline attendance, safeguard academic integrity, and give educators back valuable
              teaching hours.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-sm font-bold transition-all shadow-md"
              >
                <span>Access Teacher Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm font-bold transition-all"
              >
                <span>Student Enrollment</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 8: Shared Public Footer */}
      <PublicFooter />
    </div>
  );
}
