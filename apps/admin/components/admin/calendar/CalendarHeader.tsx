/**
 * CalendarHeader
 *
 * Month navigation bar with prev/next, today button, and branch badge.
 * Matches the header patterns from orders/products pages.
 *
 * @component
 */

"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  branchName: string;
  isFetching: boolean;
}

export default function CalendarHeader({
  monthLabel,
  onPrev,
  onNext,
  onToday,
  branchName,
  isFetching,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Calendar
        </h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span>Viewing bookings for</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
            {branchName || "Select a branch"}
          </span>
          {isFetching && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium animate-pulse">
              Syncing…
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="border-slate-200 text-slate-600 hover:text-slate-900 font-medium"
        >
          Today
        </Button>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-slate-900 rounded-r-none"
            onClick={onPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-3 text-sm font-semibold text-slate-900 min-w-[140px] text-center select-none">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-slate-900 rounded-l-none"
            onClick={onNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
