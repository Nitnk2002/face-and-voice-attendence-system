import React from "react";
import Link from "next/link";
import { Fingerprint } from "lucide-react";

interface AppLogoProps {
  href?: string;
  subtitle?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AppLogo({
  href = "/",
  subtitle = "Biometric Attendance",
  className = "",
  size = "md",
}: AppLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-11 h-11 rounded-2xl",
  };

  const lucideSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      <div
        className={`${iconSizes[size]} bg-[#172B4D] text-white flex items-center justify-center shadow-xs group-hover:bg-[#176B5B] transition-colors`}
      >
        <Fingerprint className={`${lucideSizes[size]} text-white`} strokeWidth={2.2} />
      </div>
      <div className="flex flex-col">
        <span className={`font-bold ${textSizes[size]} tracking-tight text-[#172B4D] leading-none`}>
          Apni Kaksha
        </span>
        {subtitle && (
          <span className="text-[11px] font-medium text-[#667085] tracking-wide mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
