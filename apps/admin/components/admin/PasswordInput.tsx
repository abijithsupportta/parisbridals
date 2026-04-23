"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
  defaultValue?: string;
}

/**
 * Password input with eye toggle to show/hide password.
 * Reusable across all forms that need password fields.
 */
export default function PasswordInput({
  name,
  placeholder = "Enter password",
  required = false,
  minLength,
  className,
  defaultValue,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
