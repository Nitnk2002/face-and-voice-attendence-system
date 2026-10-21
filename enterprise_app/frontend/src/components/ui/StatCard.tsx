import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "error";
}

export function StatCard({
  label,
  value,
  description,
  icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "border-[#E5E9E6] bg-white",
    success: "border-[#CEEAD6] bg-[#F4FBF7]",
    warning: "border-[#FEEFC3] bg-[#FEFBF0]",
    error: "border-[#FAD2CF] bg-[#FDF4F4]",
  };

  const valueColors = {
    default: "text-[#172B4D]",
    success: "text-[#16845B]",
    warning: "text-[#B7791F]",
    error: "text-[#C2413B]",
  };

  return (
    <div className={`p-5 rounded-xl border ${variantStyles[variant]} shadow-xs`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#667085] uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-[#667085]">{icon}</div>}
      </div>
      <div className={`text-2xl sm:text-3xl font-bold ${valueColors[variant]} tracking-tight`}>
        {value}
      </div>
      {(description || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-[#667085]">
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive ? "text-[#16845B]" : "text-[#C2413B]"
              }`}
            >
              {trend.value}
            </span>
          )}
          {description && <span>{description}</span>}
        </div>
      )}
    </div>
  );
}
