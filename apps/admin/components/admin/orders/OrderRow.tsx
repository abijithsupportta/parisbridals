/**
 * OrderRow Component
 *
 * A single table row representing one order in the list.
 * Uses `React.memo` with a custom comparator to prevent
 * re-renders unless the order data or selection state changes.
 *
 * Performance:
 *   - Memoized with shallow comparison on id + selected state
 *   - Callbacks are stable (passed from parent via useCallback)
 *   - Status badge is a separate memoized component
 *
 * @component
 * @module components/admin/orders/OrderRow
 */

"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit,
  Trash2,
  FileText,
  XCircle,
  Calendar,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/shared-utils";
import { type OrderWithRelations, OrderStatus } from "@/domain";
import OrderStatusBadge from "./OrderStatusBadge";

interface OrderRowProps {
  order: OrderWithRelations;
  selected: boolean;
  canDelete: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
}

function OrderRowInner({
  order,
  selected,
  canDelete,
  onToggleSelect,
  onDelete,
  onCancel,
}: OrderRowProps) {
  const router = useRouter();
  const itemCount = order.items?.length || 0;

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a")
    )
      return;
    router.push(`/dashboard/orders/${order.id}`);
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${
        selected ? "bg-slate-50/80" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="px-4 py-4 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(order.id)}
          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        />
      </td>

      {/* Customer */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-600 font-bold">
            {order.customer?.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div>
            <p className="font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">
              {order.customer?.name || "Unknown Customer"}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {order.id.slice(0, 8)}
            </p>
          </div>
        </div>
      </td>

      {/* Dates */}
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {format(new Date(order.start_date), "MMM d, yyyy")}
          </div>
          <div className="text-slate-400 ml-5 flex items-center gap-1">
            to{" "}
            <span className="font-medium text-slate-600">
              {format(new Date(order.end_date), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </td>

      {/* Items */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Package className="w-4 h-4 text-slate-400" />
          <span className="font-medium">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">
            {formatCurrency(order.total_amount)}
          </span>
          {order.deposit_collected && (
            <span className="text-[10px] text-emerald-600 font-medium">
              Deposit Paid
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <div className="flex flex-col items-start gap-1">
          <OrderStatusBadge status={order.status} />
          
          {/* Show payment badge for active (non-terminal) orders */}
          {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
            (() => {
              const ps = order.payment_status;
              if (ps === 'paid') return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] py-0 px-1.5">Paid</Badge>;
              if (ps === 'partial') return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] py-0 px-1.5">Partial</Badge>;
              return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] py-0 px-1.5">Unpaid</Badge>;
            })()
          )}

          {/* Show refund-due indicator for cancelled orders with payments */}
          {order.status === OrderStatus.CANCELLED && order.amount_paid > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] py-0 px-1.5">Refund Due</Badge>
          )}

          {/* Action Needed Indicator for today's scheduled orders */}
          {order.status === OrderStatus.SCHEDULED && new Date(order.start_date) <= new Date(new Date().toDateString()) && (
            <div className="flex items-center gap-1 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Action Needed</span>
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-slate-900"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `/api/orders/${order.id}/invoice?type=final`,
                "_blank"
              );
            }}
            title="Download Invoice"
          >
            <FileText className="w-4 h-4" />
          </Button>

          {order.status === "scheduled" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-slate-400 hover:text-orange-600"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(order);
              }}
              title="Cancel Order"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}

          {(() => {
            const isEditDisabled = [
              OrderStatus.CANCELLED,
              OrderStatus.COMPLETED,
              OrderStatus.RETURNED,
              OrderStatus.ONGOING,
              OrderStatus.IN_USE,
            ].includes(order.status);

            return (
              <Button
                variant="ghost"
                size="icon"
                className={`w-8 h-8 ${
                  isEditDisabled
                    ? "text-slate-200 cursor-not-allowed"
                    : "text-slate-400 hover:text-slate-900"
                }`}
                disabled={isEditDisabled}
                asChild={!isEditDisabled}
                onClick={(e) => {
                  if (isEditDisabled) e.stopPropagation();
                }}
                title={isEditDisabled ? "Cannot edit in current status" : "Edit Order"}
              >
                {!isEditDisabled ? (
                  <Link href={`/dashboard/orders/${order.id}/edit`}>
                    <Edit className="w-4 h-4" />
                  </Link>
                ) : (
                  <span>
                    <Edit className="w-4 h-4" />
                  </span>
                )}
              </Button>
            );
          })()}

          {canDelete &&
            [
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.SCHEDULED,
              OrderStatus.CANCELLED,
            ].includes(order.status) && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(order);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
        </div>
      </td>
    </tr>
  );
}

const OrderRow = React.memo(OrderRowInner, (prev, next) => {
  return (
    prev.order.id === next.order.id &&
    prev.order.status === next.order.status &&
    prev.order.total_amount === next.order.total_amount &&
    prev.order.amount_paid === next.order.amount_paid &&
    prev.selected === next.selected &&
    prev.canDelete === next.canDelete
  );
});

OrderRow.displayName = "OrderRow";

export default OrderRow;
