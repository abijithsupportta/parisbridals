"use client";

import BranchSwitcher from "./BranchSwitcher";

export default function TopBar() {
  return (
    <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-end px-6 shrink-0">
      <BranchSwitcher />
    </div>
  );
}
