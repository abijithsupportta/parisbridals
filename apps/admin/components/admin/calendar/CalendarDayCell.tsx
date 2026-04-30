/**
 * CalendarDayCell
 *
 * A single day cell in the month grid.
 * Shows day number, density dot, and up to 2 event preview chips.
 *
 * @component
 */

"use client";

import { useMemo } from "react";
import { format, isToday, isSameMonth } from "date-fns";
import { OrderStatus, type DaySummary } from "@/domain";

interface CalendarDayCellProps {
  date: Date;
  currentMonth: Date;
  summary?: DaySummary;
  isSelected: boolean;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  [OrderStatus.ONGOING]: "bg-purple-500",
  [OrderStatus.IN_USE]: "bg-purple-500",
  [OrderStatus.SCHEDULED]: "bg-blue-500",
  [OrderStatus.CONFIRMED]: "bg-blue-500",
  [OrderStatus.LATE_RETURN]: "bg-red-500",
  [OrderStatus.FLAGGED]: "bg-red-500",
  [OrderStatus.RETURNED]: "bg-emerald-500",
  [OrderStatus.COMPLETED]: "bg-emerald-500",
  [OrderStatus.PARTIAL]: "bg-amber-500",
  [OrderStatus.CANCELLED]: "bg-slate-400",
  [OrderStatus.PENDING]: "bg-slate-400",
};

const statusTextColors: Record<string, string> = {
  [OrderStatus.ONGOING]: "text-purple-700 bg-purple-50",
  [OrderStatus.IN_USE]: "text-purple-700 bg-purple-50",
  [OrderStatus.SCHEDULED]: "text-blue-700 bg-blue-50",
  [OrderStatus.CONFIRMED]: "text-blue-700 bg-blue-50",
  [OrderStatus.LATE_RETURN]: "text-red-700 bg-red-50",
  [OrderStatus.FLAGGED]: "text-red-700 bg-red-50",
  [OrderStatus.RETURNED]: "text-emerald-700 bg-emerald-50",
  [OrderStatus.COMPLETED]: "text-emerald-700 bg-emerald-50",
  [OrderStatus.PARTIAL]: "text-amber-700 bg-amber-50",
  [OrderStatus.CANCELLED]: "text-slate-600 bg-slate-50",
  [OrderStatus.PENDING]: "text-slate-600 bg-slate-50",
};

export default function CalendarDayCell({
  date,
  currentMonth,
  summary,
  isSelected,
  onClick,
}: CalendarDayCellProps) {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isCurrentDay = isToday(date);
  const dayNum = format(date, "d");
  const totalOrders = summary?.totalOrders || 0;

  // Show up to 2 events, sorted by status priority (late > ongoing > scheduled > rest)
  const previewEvents = useMemo(() => {
    if (!summary?.events.length) return [];
    const priorityOrder = [
      OrderStatus.LATE_RETURN,
      OrderStatus.FLAGGED,
      OrderStatus.ONGOING,
      OrderStatus.IN_USE,
      OrderStatus.SCHEDULED,
      OrderStatus.CONFIRMED,
    ];
    const sorted = [...summary.events].sort((a, b) => {
      const ai = priorityOrder.indexOf(a.status);
      const bi = priorityOrder.indexOf(b.status);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    // Dedupe by orderId
    const seen = new Set<string>();
    const deduped = sorted.filter((e) => {
      if (seen.has(e.orderId)) return false;
      seen.add(e.orderId);
      return true;
    });
    return deduped.slice(0, 2);
  }, [summary]);

  const overflow = totalOrders - previewEvents.length;

  if (!isCurrentMonth) {
    return (
      <div className="p-1.5 bg-slate-50/50 border-b border-r border-slate-100 overflow-hidden">
        <span className="text-xs text-slate-300 font-medium">{dayNum}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 text-left transition-all border-b border-r border-slate-100 group flex flex-col overflow-hidden
        ${isSelected
          ? "bg-slate-900/[0.03] ring-2 ring-inset ring-slate-900"
          : "bg-white hover:bg-slate-50"
        }
        ${isCurrentDay ? "relative" : ""}
      `}
    >
      {/* Day number row */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold leading-none
            ${isCurrentDay
              ? "w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center"
              : "text-slate-700"
            }
          `}
        >
          {dayNum}
        </span>
        {totalOrders > 0 && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
              ${totalOrders >= 5 ? "bg-red-100 text-red-700" :
                totalOrders >= 3 ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600"
              }
            `}
          >
            {totalOrders}
          </span>
        )}
      </div>

      {/* Event preview chips */}
      <div className="space-y-0.5">
        {previewEvents.map((event) => (
          <div
            key={event.orderId}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${
              statusTextColors[event.status] || "text-slate-600 bg-slate-50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                statusColors[event.status] || "bg-slate-400"
              }`}
            />
            <span className="truncate">{event.customerName}</span>
          </div>
        ))}
        {overflow > 0 && (
          <p className="text-[10px] text-slate-400 font-medium pl-1 group-hover:text-slate-600 transition-colors">
            +{overflow} more
          </p>
        )}
      </div>

      {/* Bottom indicators */}
      {(summary?.startingCount || summary?.endingCount || summary?.hasLateReturns) && (
        <div className="flex items-center gap-1 mt-auto pt-0.5">
          {summary.startingCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${summary.startingCount} starting`} />
          )}
          {summary.endingCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`${summary.endingCount} ending`} />
          )}
          {summary.hasLateReturns && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Late returns" />
          )}
        </div>
      )}
    </button>
  );
}
