"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable Add Button — used across Branches, Staff, Products, etc.
 * Gradient violet background with icon + label, hover glow effect.
 */
export default function AddButton({ label, onClick, disabled = false, className }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
        "bg-gradient-to-r from-violet-600 to-purple-600",
        "text-white text-sm font-semibold",
        "shadow-lg shadow-violet-500/25",
        "hover:shadow-xl hover:shadow-violet-500/30 hover:from-violet-500 hover:to-purple-500",
        "active:scale-[0.97]",
        "transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:active:scale-100",
        className
      )}
    >
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/20 group-hover:bg-white/30 transition-colors">
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
      {label}
    </button>
  );
}
