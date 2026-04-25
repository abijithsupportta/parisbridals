"use client";

import { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores";
import { useCalendarOrders } from "@/hooks";
import CalendarGrid from "@/components/admin/CalendarGrid";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const selectedBranchId = useAppStore((state) => state.selectedBranchId);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const dateParams = useMemo(() => {
    // Need to fetch from the start of the first week to the end of the last week to cover the grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      branch_id: selectedBranchId || undefined,
    };
  }, [currentDate, selectedBranchId]);

  const { data: calendarData, isLoading } = useCalendarOrders(dateParams, {
    enabled: !!selectedBranchId,
  });

  const orders = calendarData?.data || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Booking Calendar</h2>
          <p className="text-muted-foreground mt-1">
            View all scheduled and active orders by day for the selected branch.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center min-w-[160px] justify-center px-4 py-2 border rounded-md bg-card font-medium">
            <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
            {format(currentDate, "MMMM yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="ml-2" onClick={today}>
            Today
          </Button>
        </div>
      </div>

      {!selectedBranchId ? (
        <div className="flex items-center justify-center p-12 border rounded-md bg-card/50 text-slate-500">
          Please select a branch from the top menu to view the calendar.
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-24 border rounded-md bg-card/50 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading bookings...
        </div>
      ) : (
        <CalendarGrid currentDate={currentDate} orders={orders} />
      )}
    </div>
  );
}
