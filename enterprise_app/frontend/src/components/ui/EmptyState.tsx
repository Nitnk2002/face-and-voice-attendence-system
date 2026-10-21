import React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-10 rounded-2xl border border-dashed border-[#D0D5DD] bg-white flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#F4F6F4] text-[#667085] flex items-center justify-center mb-4">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-bold text-[#172B4D] mb-1">{title}</h3>
      <p className="text-xs text-[#667085] max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {actionText}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {actionText}
            </button>
          )}
        </>
      )}
    </div>
  );
}
