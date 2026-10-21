"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Eye,
  ScanFace,
  Mic,
  Lock,
  FileText,
  AlertTriangle,
  RotateCw,
  Server,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] font-sans antialiased flex flex-col justify-between">
      <PublicNavbar />

      <main className="flex-1 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F3EF] text-[#176B5B] text-xs font-bold tracking-wider uppercase mb-4 border border-[#176B5B]/25">
              SECURITY & ANTI-SPOOFING
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight mb-4">
              Honest, multi-layer biometric defense.
            </h1>
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              We design security architectures that actively evaluate physical signals while
              respecting technical limitations. Biometrics are probabilistic detection signals, not
              infallible locks.
            </p>
          </div>

          {/* Technical Accuracy Notice */}
          <div
            id="limitations"
            className="mb-14 p-6 rounded-2xl bg-[#FFFBF0] border border-[#FEEFC3] text-xs text-[#8A5800] leading-relaxed flex items-start gap-4 shadow-2xs"
          >
            <AlertTriangle className="w-5 h-5 text-[#B7791F] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#6D4400] text-sm block mb-1">
                Technical Disclaimer & Transparency Policy
              </strong>
              Apni Kaksha evaluates presentation-attack indicators (including screen bezel geometry,
              subpixel lattice variance, 2D FFT Moiré patterns, and acoustic replay traits). However,
              no computer vision or acoustic algorithm can guarantee 100% fraud immunity against all
              adversarial physical attacks. We engineer the platform to flag anomalies and provide
              educators with immediate manual review authority.
            </div>
          </div>

          {/* 4 Pillars of Defense */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl border border-[#E5E9E6] p-7 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#172B4D] mb-2">
                1. Visual Presentation-Attack Signals
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed mb-4">
                When a student checks in, the system analyzes raw camera frames across multiple
                optical heuristics:
              </p>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Screen Bezel Detection:</strong> Canny edge & Hough line transforms to
                    detect smartphone/tablet frames.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>2D FFT Moiré Frequency:</strong> Fourier domain analysis identifying
                    high-frequency LCD pixel lattices.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Specular Glare:</strong> Highlight density checks to catch reflections
                    off protective screen glass.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E9E6] p-7 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center mb-4">
                <ScanFace className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#172B4D] mb-2">
                2. Normalized ArcFace 512-D Matching
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed mb-4">
                Facial vectors are extracted using deep convolutional embeddings rather than brittle
                landmark coordinates:
              </p>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>InsightFace Architecture:</strong> Pre-trained ResNet backbones mapping
                    facial traits to a 512-dimensional hypersphere.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Cosine Thresholding:</strong> Matches require similarity above 0.70,
                    preventing ambiguous identity overlap.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Mathematical Vectors:</strong> Raw photos are transformed into floating
                    point arrays and never shared in unhashed formats.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E9E6] p-7 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center mb-4">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#172B4D] mb-2">
                3. Voiceprint & Replay Detection
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed mb-4">
                Microphone audio is processed through 16kHz Web Audio API buffers for acoustic
                fingerprinting:
              </p>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Spectral Energy Analysis:</strong> Evaluates formant bands and pitch
                    contours against enrolled student templates.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Loudspeaker Replay Defense:</strong> Identifies bandpass clipping and
                    resonator distortion typical of mobile speakers.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Duration Validation:</strong> Clips under 1 second or excessive silence
                    are immediately rejected.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E9E6] p-7 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#172B4D] mb-2">
                4. Access Controls & Cryptographic Trails
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed mb-4">
                Institutional integrity requires role separation and verifiable audit logs:
              </p>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Role-Based Access:</strong> Faculty can only access assigned classrooms;
                    students can only inspect their own attendance history.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Session Isolation:</strong> Verification events require an active
                    classroom session ID.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B5B]" />
                  <span>
                    <strong>Permanent Audit Records:</strong> Every attendance modification by a
                    teacher logs actor, timestamp, and previous status.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Ethics & Governance Sections */}
          <div className="bg-white rounded-3xl border border-[#E5E9E6] p-8 sm:p-12 mb-16">
            <h2 className="text-2xl font-bold text-[#172B4D] mb-8">
              Privacy, Consent & Student Rights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div id="consent" className="space-y-2">
                <div className="text-xs font-bold text-[#176B5B] uppercase tracking-wider">
                  01. Explicit Consent
                </div>
                <h3 className="text-sm font-bold text-[#172B4D]">Informed Enrollment</h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Students are provided with a clear explanation of what biometric data is captured
                  before providing webcam or microphone permissions.
                </p>
              </div>

              <div id="fallback" className="space-y-2">
                <div className="text-xs font-bold text-[#176B5B] uppercase tracking-wider">
                  02. Non-Biometric Alternative
                </div>
                <h3 className="text-sm font-bold text-[#172B4D]">Manual Roll-Call Policy</h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Any student who cannot or chooses not to use biometric verification can be marked
                  present through standard manual teacher verification without academic penalty.
                </p>
              </div>

              <div id="retention" className="space-y-2">
                <div className="text-xs font-bold text-[#176B5B] uppercase tracking-wider">
                  03. Retention & Deletion
                </div>
                <h3 className="text-sm font-bold text-[#172B4D]">Right to Erasure</h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Upon completion of an academic semester or graduation, student biometric profiles
                  can be permanently purged from database records upon institutional request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
