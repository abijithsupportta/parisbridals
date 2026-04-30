/**
 * CalendarGrid
 *
 * 7-column month grid (Sun-Sat). Fills all available vertical space.
 * Rows use CSS grid 1fr to distribute height evenly.
 *
 * @component
 */

"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
} from "date-fns";
import type { DaySummary } from "@/domain";
import CalendarDayCell from "./CalendarDayCell";

interface CalendarGridProps {
  currentMonth: Date;
  daySummaryMap: Map<string, DaySummary>;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  isLoading: boolean;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({
  currentMonth,
  daySummaryMap,
  selectedDate,
  onSelectDate,
  isLoading,
}: CalendarGridProps) {
  // Build calendar days array
  const { calendarDays, weekCount } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return { calendarDays: days, weekCount: days.length / 7 };
  }, [currentMonth]);

  const rowStyle = `grid-rows-[repeat(${weekCount},1fr)]`;

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 shrink-0">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
            >
              {wd}
            </div>
          ))}
        </div>
        {/* Skeleton grid — fills remaining space */}
        <div className={`flex-1 min-h-0 grid grid-cols-7 ${rowStyle}`}>
          {Array.from({ length: weekCount * 7 }).map((_, i) => (
            <div
              key={i}
              className="p-1.5 border-b border-r border-slate-100"
            >
              <div className="h-3 w-3 bg-slate-100 rounded animate-pulse mb-1.5" />
              <div className="h-2.5 w-12 bg-slate-50 rounded animate-pulse mb-1" />
              <div className="h-2.5 w-8 bg-slate-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 shrink-0">
        {weekDays.map((wd) => (
          <div
            key={wd}
            className="py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells — fills remaining height with equal rows */}
      <div className={`flex-1 min-h-0 grid grid-cols-7 ${rowStyle}`}>
        {calendarDays.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const summary = daySummaryMap.get(dateStr);

          return (
            <CalendarDayCell
              key={dateStr}
              date={date}
              currentMonth={currentMonth}
              summary={summary}
              isSelected={selectedDate === dateStr}
              onClick={() => onSelectDate(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}
