/**
 * CalendarDayDetail
 *
 * Side panel showing all orders for a selected day.
 * Grouped into Starting / Ongoing / Ending sections.
 * Matches the card patterns from order detail pages.
 *
 * @component
 */

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  X,
  Package,
  Calendar,
  CalendarCheck,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatus, type DaySummary, type CalendarEvent } from "@/domain";

interface CalendarDayDetailProps {
  summary: DaySummary | null;
  onClose: () => void;
}

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case OrderStatus.SCHEDULED:
    case OrderStatus.CONFIRMED:
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0"
        >
          Scheduled
        </Badge>
      );
    case OrderStatus.ONGOING:
    case OrderStatus.IN_USE:
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0"
        >
          Ongoing
        </Badge>
      );
    case OrderStatus.RETURNED:
    case OrderStatus.COMPLETED:
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
        >
          Completed
        </Badge>
      );
    case OrderStatus.PARTIAL:
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0"
        >
          Partial
        </Badge>
      );
    case OrderStatus.FLAGGED:
    case OrderStatus.LATE_RETURN:
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0"
        >
          {status === OrderStatus.LATE_RETURN ? "Late" : "Flagged"}
        </Badge>
      );
    case OrderStatus.CANCELLED:
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0"
        >
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0"
        >
          {status}
        </Badge>
      );
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function EventCard({ event }: { event: CalendarEvent; type: string }) {
  return (
    <Link
      href={`/dashboard/orders/${event.orderId}`}
      className="block p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 hover:bg-slate-50/50 transition-all group"
    >
      {/* Top row: avatar + name + status */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-600 font-bold">
          {event.customerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-600 transition-colors truncate">
            {event.customerName}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            ID: {event.orderId.slice(0, 8)}
          </p>
        </div>
        {getStatusBadge(event.status)}
      </div>

      {/* Detail rows — matching order table columns */}
      <div className="space-y-1.5 text-xs">
        {/* Dates */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {format(parseISO(event.startDate), "MMM d, yyyy")}
          </div>
          <div className="text-slate-400 ml-5 flex items-center gap-1">
            to{" "}
            <span className="font-medium text-slate-600">
              {format(parseISO(event.endDate), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <Package className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">
            {event.itemCount} item{event.itemCount !== 1 ? "s" : ""}
          </span>
          {event.itemNames.length > 0 && (
            <span className="text-slate-400 truncate">
              · {event.itemNames.join(", ")}
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900">
            {formatCurrency(event.totalAmount)}
          </span>
          {event.depositCollected && (
            <span className="text-[10px] text-emerald-600 font-medium">
              Deposit Paid
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EventSection({
  title,
  icon: Icon,
  events,
  type,
  color,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  events: CalendarEvent[];
  type: string;
  color: string;
}) {
  if (events.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {title} ({events.length})
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <EventCard key={event.orderId} event={event} type={type} />
        ))}
      </div>
    </div>
  );
}

export default function CalendarDayDetail({
  summary,
  onClose,
}: CalendarDayDetailProps) {
  const { starting, ongoing, ending } = useMemo(() => {
    if (!summary) return { starting: [], ongoing: [], ending: [] };

    const dateStr = summary.date;
    const seen = new Set<string>();
    const starting: CalendarEvent[] = [];
    const ending: CalendarEvent[] = [];
    const ongoing: CalendarEvent[] = [];

    for (const event of summary.events) {
      if (seen.has(event.orderId)) continue;
      seen.add(event.orderId);

      if (event.startDate === dateStr) {
        starting.push(event);
      } else if (event.endDate === dateStr) {
        ending.push(event);
      } else {
        ongoing.push(event);
      }
    }

    return { starting, ongoing, ending };
  }, [summary]);

  if (!summary) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 text-center">
        <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          Select a day to see booking details
        </p>
      </div>
    );
  }

  const dateLabel = format(parseISO(summary.date), "EEEE, MMMM d, yyyy");
  const uniqueOrders = new Set(summary.events.map((e) => e.orderId)).size;
  const totalRevenue = summary.events
    .filter((e) => e.startDate === summary.date)
    .reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col max-h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{dateLabel}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {uniqueOrders} order{uniqueOrders !== 1 ? "s" : ""}
            {totalRevenue > 0 && ` · ${formatCurrency(totalRevenue)} starting`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-slate-400 hover:text-slate-900"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {uniqueOrders === 0 ? (
          <div className="py-8 text-center">
            <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No bookings on this day</p>
          </div>
        ) : (
          <>
            <EventSection
              title="Starting"
              icon={ArrowDownRight}
              events={starting}
              type="starting"
              color="text-emerald-600"
            />
            <EventSection
              title="Ongoing"
              icon={Clock}
              events={ongoing}
              type="ongoing"
              color="text-purple-600"
            />
            <EventSection
              title="Ending"
              icon={ArrowUpRight}
              events={ending}
              type="ending"
              color="text-amber-600"
            />
          </>
        )}
      </div>
    </div>
  );
}
