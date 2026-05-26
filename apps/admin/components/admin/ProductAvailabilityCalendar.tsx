/**
 * Product Availability Calendar
 *
 * Visual month-view calendar showing per-day product availability.
 * Color-coded days: green (available), yellow (partial), red (fully booked).
 * Click on a day to see booking details.
 *
 * Powered by the Sweep Line interval scheduling algorithm on the backend.
 *
 * @module components/admin/ProductAvailabilityCalendar
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Users, Package, Loader2, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isToday, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useProductAvailabilityCalendar } from "@/hooks";
import type { DayAvailability } from "@/domain/types/order";

interface Props {
  productId: string;
}

export default function ProductAvailabilityCalendar({ productId }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayAvailability | null>(null);

  // Fetch 2 months of data (current + next) for smooth navigation
  const rangeStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");

  const { data: calendarData, isLoading } = useProductAvailabilityCalendar(
    productId,
    rangeStart,
    rangeEnd,
    true
  );

  const availability = calendarData?.data;

  // Build a lookup map: date string -> DayAvailability
  const dayMap = useMemo(() => {
    const map = new Map<string, DayAvailability>();
    if (availability?.days) {
      for (const day of availability.days) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [availability]);

  // Calendar grid computation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDayData = (date: Date): DayAvailability | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dayMap.get(dateStr);
  };

  const getDayColor = (dayData?: DayAvailability, isCurrentMonth?: boolean) => {
    if (!isCurrentMonth) return "bg-slate-50 text-slate-300";
    if (!dayData) return "bg-white text-slate-700 hover:bg-slate-50";

    switch (dayData.status) {
      case "unavailable":
        return "bg-red-50 text-red-800 border-red-200 hover:bg-red-100";
      case "partial":
        return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
      case "buffer":
        return "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100";
      case "available":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
      default:
        return "bg-white text-slate-700 hover:bg-slate-50";
    }
  };

  const getDotColor = (dayData?: DayAvailability) => {
    if (!dayData || dayData.reserved === 0) return null;
    switch (dayData.status) {
      case "unavailable": return "bg-red-500";
      case "partial": return "bg-amber-500";
      case "buffer": return "bg-blue-500";
      default: return "bg-emerald-500";
    }
  };

  return (
    <div className="space-y-0">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-1 mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-slate-400 hover:text-slate-900"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h4 className="text-sm font-semibold text-slate-900">
          {format(currentMonth, "MMMM yyyy")}
        </h4>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-slate-400 hover:text-slate-900"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((date, i) => {
              const isCurrentMonth_ = isSameMonth(date, currentMonth);
              const dayData = isCurrentMonth_ ? getDayData(date) : undefined;
              const dotColor = getDotColor(dayData);
              const isSelected = selectedDay && dayData && selectedDay.date === dayData.date;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (dayData) {
                      setSelectedDay(isSelected ? null : dayData);
                    }
                  }}
                  disabled={!isCurrentMonth_}
                  className={`
                    relative flex flex-col items-center justify-center
                    h-8 rounded-md text-xs font-medium transition-all
                    border border-transparent
                    ${getDayColor(dayData, isCurrentMonth_)}
                    ${isSelected ? "ring-2 ring-slate-900 ring-offset-1" : ""}
                    ${isToday(date) && isCurrentMonth_ ? "font-bold" : ""}
                    ${isCurrentMonth_ && dayData ? "cursor-pointer" : "cursor-default"}
                  `}
                >
                  <span>{format(date, "d")}</span>
                  {dotColor && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColor}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-500">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] text-slate-500">Partial</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-slate-500">Full</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-slate-500">Buffer</span>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold text-slate-900">
                  {format(new Date(selectedDay.date + "T00:00:00"), "MMM d, yyyy")}
                </h5>
                <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs">
                  <Package className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-600">
                    <span className="font-bold text-slate-900">{selectedDay.available}</span> / {selectedDay.total} available
                  </span>
                </div>
                {selectedDay.reserved > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600">
                      <span className="font-bold text-slate-900">{selectedDay.reserved}</span> reserved
                    </span>
                  </div>
                )}
              </div>

              {selectedDay.bookings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Bookings</p>
                  {selectedDay.bookings.map((b, idx) => (
                    <div key={idx} className={`flex items-center justify-between text-xs rounded px-2 py-1.5 border ${b.isBuffer ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
                      <div>
                        <span className="font-medium text-slate-900">{b.customerName}</span>
                        <span className="text-slate-400 ml-1">×{b.quantity}</span>
                        {b.isBuffer && (
                          <span className="ml-1.5 text-[9px] font-bold text-blue-600 bg-blue-100 px-1 py-0.5 rounded">BUFFER</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {format(new Date(b.startDate + "T00:00:00"), "MMM d")} – {format(new Date(b.endDate + "T00:00:00"), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
