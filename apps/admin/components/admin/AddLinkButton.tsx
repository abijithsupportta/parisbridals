"use client";

import Link from "next/link";
import AddButton from "./AddButton";

interface AddLinkButtonProps {
  label: string;
  href: string;
  disabled?: boolean;
  className?: string;
}

/**
 * AddButton wrapper with Next.js Link for server components
 */
export default function AddLinkButton({ label, href, disabled = false, className }: AddLinkButtonProps) {
  return (
    <Link href={href}>
      <AddButton label={label} onClick={() => {}} disabled={disabled} className={className} />
    </Link>
  );
}
