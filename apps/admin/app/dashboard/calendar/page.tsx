/**
 * Calendar Page
 *
 * Full-page Google Calendar-like month view showing all rental orders.
 * Uses the global branch selector for branch-scoped data.
 *
 * VIEWPORT-FILLING: This page fills exactly 100% of available space.
 * No page-level scrolling — only the detail panel content scrolls.
 *
 * @module app/dashboard/calendar/page
 */

"use client";

import { useState, useCallback } from "react";
import { useCalendarView, useSimpleBranches as useBranches } from "@/hooks";
import { useAppStore } from "@/stores";
import {
  CalendarHeader,
  CalendarStats,
  CalendarGrid,
  CalendarDayDetail,
  CalendarLegend,
} from "@/components/admin/calendar";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  const selectedBranchId = useAppStore((s) => s.selectedBranchId);
  const { branches } = useBranches();

  const activeBranch = branches.find((b: any) => b.id === selectedBranchId);
  const branchName = activeBranch?.name || "All Branches";

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendar = useCalendarView(selectedBranchId);

  const handleSelectDate = useCallback(
    (dateStr: string) => {
      setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const selectedSummary = selectedDate
    ? calendar.daySummaryMap.get(selectedDate) || null
    : null;

  // No branch selected — show prompt
  if (!selectedBranchId) {
    return (
      <div className="h-[calc(100vh-3.5rem)] -m-8 p-8 overflow-hidden flex flex-col">
        <div className="shrink-0">
          <CalendarHeader
            monthLabel={calendar.monthLabel}
            onPrev={calendar.goToPrevMonth}
            onNext={calendar.goToNextMonth}
            onToday={calendar.goToToday}
            branchName={branchName}
            isFetching={false}
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-16 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Select a Branch
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Choose a branch from the top navigation to view its booking
              calendar. The calendar shows all active and scheduled orders for
              the selected branch.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] -m-8 p-8 overflow-hidden flex flex-col">
      {/* Header — fixed */}
      <div className="shrink-0">
        <CalendarHeader
          monthLabel={calendar.monthLabel}
          onPrev={calendar.goToPrevMonth}
          onNext={calendar.goToNextMonth}
          onToday={calendar.goToToday}
          branchName={branchName}
          isFetching={calendar.isFetching}
        />
      </div>

      {/* Stats — fixed */}
      <div className="shrink-0 mt-3">
        <CalendarStats
          stats={calendar.monthStats}
          isLoading={calendar.isLoading}
        />
      </div>

      {/* Main content: fills ALL remaining vertical space */}
      <div
        className={`flex-1 min-h-0 mt-3 grid gap-3 ${
          selectedDate
            ? "grid-cols-1 lg:grid-cols-[1fr_340px]"
            : "grid-cols-1"
        }`}
      >
        {/* Calendar Grid — fills column, no internal scroll */}
        <div className="min-h-0 flex flex-col">
          <CalendarGrid
            currentMonth={calendar.currentMonth}
            daySummaryMap={calendar.daySummaryMap}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            isLoading={calendar.isLoading}
          />
          <div className="shrink-0">
            <CalendarLegend />
          </div>
        </div>

        {/* Day Detail Panel — fills column, scrollable inside */}
        {selectedDate && (
          <div className="min-h-0 h-full overflow-hidden">
            <CalendarDayDetail
              summary={selectedSummary}
              onClose={handleCloseDetail}
            />
          </div>
        )}
      </div>
    </div>
  );
}
