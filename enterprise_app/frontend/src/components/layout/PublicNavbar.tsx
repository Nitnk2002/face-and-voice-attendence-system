"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Security", href: "/security" },
    { label: "About", href: "/about" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#F8F9F7]/95 backdrop-blur-md border-b border-[#E5E9E6] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <AppLogo />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#667085]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 ${
                  isActive
                    ? "text-[#176B5B] font-semibold border-b-2 border-[#176B5B]"
                    : "hover:text-[#172B4D]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/join"
            className="text-xs font-semibold text-[#172B4D] hover:text-[#176B5B] px-3.5 py-2 rounded-lg border border-[#D0D5DD] hover:border-[#176B5B] hover:bg-white transition-all shadow-xs"
          >
            Student Portal
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-white bg-[#172B4D] hover:bg-[#176B5B] px-4 py-2 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Teacher Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/login"
            className="text-xs font-semibold text-white bg-[#172B4D] px-3 py-1.5 rounded-lg"
          >
            Login
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#172B4D] hover:bg-[#EAECE9] focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5E9E6] bg-[#F8F9F7] px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#172B4D]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md ${
                  pathname === link.href
                    ? "bg-[#E7F3EF] text-[#176B5B] font-semibold"
                    : "hover:bg-[#EAECE9]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#E5E9E6] flex flex-col gap-2">
            <Link
              href="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-sm font-semibold text-[#172B4D] py-2.5 rounded-lg border border-[#D0D5DD] bg-white"
            >
              Student Portal & Enrollment
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-sm font-semibold text-white bg-[#172B4D] py-2.5 rounded-lg"
            >
              Teacher Login
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-xs font-medium text-[#667085] py-1.5"
            >
              Admin Console →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
