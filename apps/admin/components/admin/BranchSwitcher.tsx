"use client";

import { Building2, ChevronDown, Check, Lock } from "lucide-react";
import { useAppStore } from "@/stores";
import { useBranches } from "@/hooks";
import { usePermissions } from "@/hooks";
import { useState, useRef, useEffect } from "react";
import type { BranchWithStaffCount } from "@/domain/types/branch";

export default function BranchSwitcher() {
  const { branches } = useBranches();
  const selectedBranchId = useAppStore((s) => s.selectedBranchId);
  const setSelectedBranchId = useAppStore((s) => s.setSelectedBranchId);
  const { can, isStaff } = usePermissions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-select the first (or main) branch if no valid branch is selected.
  // "all" is no longer a valid option.
  useEffect(() => {
    if (branches.length === 0) return;
    const valid = branches.find((b: BranchWithStaffCount) => b.id === selectedBranchId);
    if (!valid) {
      const main = branches.find((b: BranchWithStaffCount) => b.is_main) || branches[0];
      setSelectedBranchId(main.id);
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  const canSwitch = can("switch_branches");
  const selected = branches.find((b: BranchWithStaffCount) => b.id === selectedBranchId);
  const label = selected?.name || "Select Branch";

  // Staff can't switch — show locked indicator
  if (isStaff) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium text-slate-500">{selected?.name || "My Branch"}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => canSwitch && setOpen(!open)}
        disabled={!canSwitch}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Building2 className="w-4 h-4 text-violet-500" />
        <span className="font-medium text-slate-700 max-w-[150px] truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && canSwitch && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Switch Branch</p>
          </div>

          {/* Individual branches */}
          {branches.map((branch: BranchWithStaffCount) => (
            <button
              key={branch.id}
              onClick={() => { setSelectedBranchId(branch.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                selectedBranchId === branch.id ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium">{branch.name}</span>
                {branch.is_main && (
                  <span className="ml-1.5 text-[9px] font-bold uppercase text-violet-500 bg-violet-50 px-1 py-0.5 rounded">Main</span>
                )}
              </div>
              {selectedBranchId === branch.id && <Check className="w-4 h-4 text-violet-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
