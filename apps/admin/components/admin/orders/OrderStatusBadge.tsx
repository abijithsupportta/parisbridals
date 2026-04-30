/**
 * OrderStatusBadge Component
 *
 * Pure presentational component that renders a styled status badge
 * for an order's current status. Uses `React.memo` to prevent
 * unnecessary re-renders — the badge only re-renders when the
 * `status` prop changes.
 *
 * @component
 * @param {Object} props
 * @param {OrderStatus} props.status - The order status enum value
 *
 * @example
 * <OrderStatusBadge status={OrderStatus.ONGOING} />
 *
 * @module components/admin/orders/OrderStatusBadge
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/domain";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  [OrderStatus.SCHEDULED]: {
    label: "Scheduled",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [OrderStatus.CONFIRMED]: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [OrderStatus.ONGOING]: {
    label: "Ongoing",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  [OrderStatus.IN_USE]: {
    label: "In Use",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  [OrderStatus.RETURNED]: {
    label: "Returned",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [OrderStatus.COMPLETED]: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [OrderStatus.PARTIAL]: {
    label: "Partial",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [OrderStatus.FLAGGED]: {
    label: "Flagged",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [OrderStatus.LATE_RETURN]: {
    label: "Late",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  [OrderStatus.PENDING]: {
    label: "Pending",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  [OrderStatus.DELIVERED]: {
    label: "Delivered",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
};

const DEFAULT_CONFIG = {
  label: "Unknown",
  className: "bg-slate-100 text-slate-600 border-slate-200",
};

function OrderStatusBadgeInner({ status }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { ...DEFAULT_CONFIG, label: status };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

const OrderStatusBadge = React.memo(OrderStatusBadgeInner);
OrderStatusBadge.displayName = "OrderStatusBadge";

export default OrderStatusBadge;
