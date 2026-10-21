import React from "react";

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Pending"
  | "Flagged"
  | "Review"
  | "Verified"
  | "Active"
  | "Inactive";

interface StatusBadgeProps {
  status: AttendanceStatus | string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className = "", size = "md" }: StatusBadgeProps) {
  const norm = (status || "").toLowerCase();

  let styles = "bg-[#F0F2F5] text-[#475569] border-[#D0D5DD]";

  if (norm === "present" || norm === "verified" || norm === "active") {
    styles = "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]";
  } else if (norm === "absent" || norm === "inactive") {
    styles = "bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]";
  } else if (norm === "pending") {
    styles = "bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]";
  } else if (norm === "flagged" || norm === "review") {
    styles = "bg-[#FFF4E5] text-[#C05621] border-[#FBD38D]";
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${sizeClasses} ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {status}
    </span>
  );
}
