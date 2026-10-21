import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function SearchInput({ className = "", ...props }: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#667085] absolute left-3 pointer-events-none" />
      <input
        type="text"
        className="w-full bg-white border border-[#D0D5DD] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#172B4D] placeholder:text-[#667085] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all shadow-2xs"
        {...props}
      />
    </div>
  );
}
