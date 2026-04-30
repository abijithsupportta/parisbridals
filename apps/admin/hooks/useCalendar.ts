/**
 * Calendar Hooks
 *
 * TanStack Query hooks for the calendar view.
 * Transforms raw OrderWithRelations[] into CalendarEvent[] and DaySummary map.
 *
 * @module hooks/useCalendar
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
} from 'date-fns';
import { OrderStatus, type OrderWithRelations, type CalendarEvent, type DaySummary, type CalendarMonthStats } from '@/domain';

// ── API helper ────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Raw data hook ─────────────────────────────────────────────────────
interface CalendarFetchParams {
  branch_id?: string;
  start_date: string;
  end_date: string;
}

export function useCalendarOrders(params: CalendarFetchParams, options?: { enabled?: boolean }) {
  return useQuery<{ success: boolean; data: OrderWithRelations[] }>({
    queryKey: ['calendar', params.branch_id, params.start_date, params.end_date],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.append('start_date', params.start_date);
      searchParams.append('end_date', params.end_date);
      if (params.branch_id) searchParams.append('branch_id', params.branch_id);
      return apiFetch(`/api/calendar?${searchParams.toString()}`);
    },
    enabled: options?.enabled !== false && !!params.branch_id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });
}

// ── Transform helpers ─────────────────────────────────────────────────
function orderToCalendarEvent(order: OrderWithRelations): CalendarEvent {
  const items = order.items || [];
  return {
    orderId: order.id,
    customerName: order.customer?.name || 'Unknown',
    customerPhone: order.customer?.phone || '',
    startDate: order.start_date,
    endDate: order.end_date,
    eventDate: order.event_date,
    status: order.status,
    totalAmount: order.total_amount,
    itemCount: items.length,
    itemNames: items.slice(0, 3).map((i: any) => i.product?.name || 'Unknown'),
    branchName: order.branch?.name || '',
    depositCollected: !!order.deposit_collected,
  };
}

function buildDaySummaryMap(events: CalendarEvent[], startDate: Date, endDate: Date): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Initialize all days in the range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = format(current, 'yyyy-MM-dd');
    map.set(dateStr, {
      date: dateStr,
      events: [],
      startingCount: 0,
      endingCount: 0,
      ongoingCount: 0,
      totalOrders: 0,
      totalRevenue: 0,
      hasLateReturns: false,
      hasActionNeeded: false,
    });
    current.setDate(current.getDate() + 1);
  }

  // Distribute events across days
  for (const event of events) {
    const evStart = parseISO(event.startDate);
    const evEnd = parseISO(event.endDate);
    const day = new Date(startDate);

    while (day <= endDate) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const summary = map.get(dateStr);

      if (summary && day >= evStart && day <= evEnd) {
        summary.events.push(event);
        summary.totalOrders++;

        if (isSameDay(day, evStart)) {
          summary.startingCount++;
          summary.totalRevenue += event.totalAmount;
        } else if (isSameDay(day, evEnd)) {
          summary.endingCount++;
        } else {
          summary.ongoingCount++;
        }

        if (event.status === OrderStatus.LATE_RETURN || event.status === OrderStatus.FLAGGED) {
          summary.hasLateReturns = true;
        }

        if (event.status === OrderStatus.SCHEDULED && event.startDate <= today) {
          summary.hasActionNeeded = true;
        }
      }

      day.setDate(day.getDate() + 1);
    }
  }

  return map;
}

// ── Navigation hook ───────────────────────────────────────────────────
export function useCalendarNavigation() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const goToPrevMonth = useCallback(() => setCurrentMonth(prev => subMonths(prev, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth(prev => addMonths(prev, 1)), []);
  const goToToday = useCallback(() => setCurrentMonth(new Date()), []);
  const goToMonth = useCallback((date: Date) => setCurrentMonth(date), []);

  return {
    currentMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    goToMonth,
    monthLabel: format(currentMonth, 'MMMM yyyy'),
  };
}

// ── Main composite hook ───────────────────────────────────────────────
export function useCalendarView(branchId: string) {
  const nav = useCalendarNavigation();

  // Fetch range: current month ± 1 month for smooth navigation
  const fetchStart = format(startOfMonth(subMonths(nav.currentMonth, 1)), 'yyyy-MM-dd');
  const fetchEnd = format(endOfMonth(addMonths(nav.currentMonth, 1)), 'yyyy-MM-dd');

  const { data, isLoading, isFetching, error } = useCalendarOrders(
    { branch_id: branchId, start_date: fetchStart, end_date: fetchEnd },
    { enabled: !!branchId }
  );

  const orders = data?.data || [];

  // Transform orders → CalendarEvent[]
  const events = useMemo(() => orders.map(orderToCalendarEvent), [orders]);

  // Build day summary map for the current month view
  const viewStart = startOfMonth(nav.currentMonth);
  const viewEnd = endOfMonth(nav.currentMonth);

  const daySummaryMap = useMemo(
    () => buildDaySummaryMap(events, viewStart, viewEnd),
    [events, viewStart, viewEnd]
  );

  // Compute month-level stats
  const monthStats = useMemo<CalendarMonthStats>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySummary = daySummaryMap.get(today);

    let scheduledThisMonth = 0;
    let lateReturns = 0;
    const seenScheduled = new Set<string>();
    const seenLate = new Set<string>();

    for (const [, summary] of daySummaryMap) {
      for (const ev of summary.events) {
        if (
          (ev.status === OrderStatus.SCHEDULED || ev.status === OrderStatus.CONFIRMED) &&
          !seenScheduled.has(ev.orderId)
        ) {
          seenScheduled.add(ev.orderId);
          scheduledThisMonth++;
        }
        if (
          (ev.status === OrderStatus.LATE_RETURN || ev.status === OrderStatus.FLAGGED) &&
          !seenLate.has(ev.orderId)
        ) {
          seenLate.add(ev.orderId);
          lateReturns++;
        }
      }
    }

    return {
      ongoingToday: todaySummary?.totalOrders || 0,
      scheduledThisMonth,
      endingToday: todaySummary?.endingCount || 0,
      lateReturns,
      totalRevenue: Array.from(daySummaryMap.values()).reduce((s, d) => s + d.totalRevenue, 0),
    };
  }, [daySummaryMap]);

  return {
    ...nav,
    events,
    daySummaryMap,
    monthStats,
    isLoading,
    isFetching,
    error,
    branchId,
  };
}
