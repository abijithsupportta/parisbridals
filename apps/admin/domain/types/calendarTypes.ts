/**
 * Calendar Domain Types
 *
 * Types for the calendar view — flattened order events and per-day summaries.
 *
 * @module domain/types/calendarTypes
 */

import { OrderStatus } from './order';

/** Flattened order for rendering on the calendar grid */
export interface CalendarEvent {
  orderId: string;
  customerName: string;
  customerPhone: string;
  startDate: string;        // yyyy-MM-dd
  endDate: string;          // yyyy-MM-dd
  eventDate: string;        // yyyy-MM-dd
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  itemNames: string[];      // first 3 product names
  branchName: string;
  depositCollected: boolean;
}

/** Aggregated stats for a single calendar cell */
export interface DaySummary {
  date: string;             // yyyy-MM-dd
  events: CalendarEvent[];
  startingCount: number;    // orders starting this day
  endingCount: number;      // orders ending this day
  ongoingCount: number;     // orders spanning this day (not starting or ending)
  totalOrders: number;      // all orders touching this day
  totalRevenue: number;     // sum of total_amount for orders starting this day
  hasLateReturns: boolean;
  hasActionNeeded: boolean; // scheduled orders past start_date
}

/** Month stats for the stats bar */
export interface CalendarMonthStats {
  ongoingToday: number;
  scheduledThisMonth: number;
  endingToday: number;
  lateReturns: number;
  totalRevenue: number;
}
