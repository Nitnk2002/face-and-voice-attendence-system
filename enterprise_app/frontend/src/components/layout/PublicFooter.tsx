import React from "react";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

export function PublicFooter() {
  return (
    <footer className="bg-[#142820] text-slate-300 py-16 border-t border-[#1F3D32] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <AppLogo subtitle="Face & Voice Biometrics" />
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mt-3">
              Enterprise multi-modal biometric attendance platform powered by ArcFace deep
              embeddings, 16kHz acoustic vocal analysis, and active presentation-attack defense.
            </p>
            <div className="text-[11px] text-[#A3B899] font-mono">
              Status: Operational · Local LAN & Cloud Architecture
            </div>
          </div>

          {/* Column 1: Application Portals */}
          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">
              Portals
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Teacher Login
                </Link>
              </li>
              <li>
                <Link href="/join" className="hover:text-white transition-colors">
                  Student Enrollment
                </Link>
              </li>
              <li>
                <Link href="/student/login" className="hover:text-white transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition-colors">
                  Admin Console
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/take-attendance"
                  className="hover:text-white transition-colors"
                >
                  Live Kiosk Scanner
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Architecture */}
          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">
              Platform
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Platform Features
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-white transition-colors">
                  Anti-Spoofing Security
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About the Platform
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Security & Governance */}
          <div>
            <div className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">
              Governance
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/security#consent" className="hover:text-white transition-colors">
                  Biometric Consent Policy
                </Link>
              </li>
              <li>
                <Link href="/security#fallback" className="hover:text-white transition-colors">
                  Non-Biometric Alternative
                </Link>
              </li>
              <li>
                <Link href="/security#retention" className="hover:text-white transition-colors">
                  Data Retention & Erasure
                </Link>
              </li>
              <li>
                <Link href="/security#limitations" className="hover:text-white transition-colors">
                  Technical Limitations
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Architecture Note */}
        <div className="pt-8 border-t border-[#1F3D32] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} Apni Kaksha — Face & Voice Attendance System. Built for
            educational and institutional excellence.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>ArcFace 512-D</span>
            <span>•</span>
            <span>16kHz Voiceprint</span>
            <span>•</span>
            <span>Anti-Spoofing V2</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
