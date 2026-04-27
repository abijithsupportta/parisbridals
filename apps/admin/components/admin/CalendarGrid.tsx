"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { OrderWithRelations } from "@/domain/types/order";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface CalendarGridProps {
  currentDate: Date;
  orders: OrderWithRelations[];
}

export default function CalendarGrid({ currentDate, orders }: CalendarGridProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: OrderWithRelations[] } | null>(null);

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Pre-compute orders per day for fast rendering
  const getOrdersForDay = (day: Date) => {
    const start = startOfDay(day);
    const end = endOfDay(day);
    return orders.filter((order) => {
      const orderStart = parseISO(order.start_date);
      const orderEnd = parseISO(order.end_date);
      return isWithinInterval(day, { start: startOfDay(orderStart), end: endOfDay(orderEnd) });
    });
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {dayNames.map((day) => (
            <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {daysInMonth.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dayOrders = getOrdersForDay(day);
            const totalItems = dayOrders.reduce((sum, order) => sum + order.items.reduce((acc, item) => acc + item.quantity, 0), 0);

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  if (dayOrders.length > 0) {
                    setSelectedDay({ date: day, orders: dayOrders });
                  }
                }}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b relative group transition-colors",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isToday && "bg-primary/5",
                  dayOrders.length > 0 && "cursor-pointer hover:bg-muted/50",
                  (i + 1) % 7 === 0 && "border-r-0"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayOrders.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {dayOrders.length} {dayOrders.length === 1 ? "Order" : "Orders"}
                    </Badge>
                  )}
                </div>

                {/* Day Content */}
                <div className="flex flex-col gap-1 mt-2">
                  {dayOrders.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-muted-foreground font-medium">
                        {totalItems} Items Booked
                      </div>
                      {/* Show preview of first 2 orders */}
                      {dayOrders.slice(0, 2).map((order) => (
                        <div key={order.id} className="text-[11px] truncate bg-muted/80 rounded px-1.5 py-1 text-slate-700 dark:text-slate-300">
                          {order.customer?.name || "Unknown"}
                        </div>
                      ))}
                      {dayOrders.length > 2 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          + {dayOrders.length - 2} more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-transparent select-none">-</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={`Bookings for ${selectedDay ? format(selectedDay.date, "MMMM do, yyyy") : ""}`}
        maxWidth="max-w-2xl"
      >
        <div className="h-[60vh] pr-4 overflow-y-auto">
          <div className="flex flex-col gap-4 py-2">
            {selectedDay?.orders.map((order) => (
              <Card key={order.id} className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{order.customer?.name}</h4>
                    <p className="text-sm text-muted-foreground">{order.customer?.phone}</p>
                  </div>
                  <Badge variant={order.status === 'ongoing' || order.status === 'in_use' ? 'default' : 'secondary'}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-sm font-medium mb-2">Items</p>
                  <ul className="text-sm space-y-1">
                    {order.items.map((item: any) => (
                      <li key={item.id} className="flex justify-between">
                        <span className="truncate pr-4">{item.quantity}x {(item as any).product?.name || 'Unknown Product'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                  <div>
                    {format(parseISO(order.start_date), "MMM d")} - {format(parseISO(order.end_date), "MMM d")}
                  </div>
                  <div className="flex items-center text-primary font-medium hover:underline">
                    <Eye className="w-4 h-4 mr-1" />
                    View Order
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
