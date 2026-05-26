/**
 * OrderListTable Component
 *
 * High-performance datatable for rendering orders.
 * Uses memoized OrderRow components to prevent full-table re-renders
 * when only selection state or individual rows change.
 *
 * Features:
 *   - Select all / deselect all
 *   - Shimmer skeleton loading state
 *   - Empty state with CTA
 *   - Each row is independently memoized via React.memo
 *
 * @component
 * @module components/admin/orders/OrderListTable
 */

"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type OrderWithRelations } from "@/domain";
import OrderRow from "./OrderRow";

interface OrderListTableProps {
  orders: OrderWithRelations[];
  isLoading: boolean;
  searchQuery: string;
  selectedOrders: string[];
  canDelete: boolean;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onDelete: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
}

/** Shimmer skeleton for the loading state — static component, zero re-renders. */
const TableSkeleton = React.memo(function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {/* Table header skeleton */}
      <div className="hidden md:grid grid-cols-[auto_1fr_140px_160px_120px_100px_120px] gap-4 p-4 bg-slate-50/50">
        <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse justify-self-end" />
      </div>
      {/* Rows skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-4 w-4 bg-slate-100 rounded animate-pulse shrink-0" />
          <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-1/4 bg-slate-50 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
});

/** Empty state shown when no orders match the current filters. */
const EmptyState = React.memo(function EmptyState({
  searchQuery,
}: {
  searchQuery: string;
}) {
  const router = useRouter();
  return (
    <div className="p-16 text-center">
      <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        No Orders Found
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        {searchQuery
          ? `No orders matched your search for "${searchQuery}".`
          : "There are no orders yet in this branch."}
      </p>
      {!searchQuery && (
        <Button
          className="mt-6 bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => router.push("/dashboard/orders/create")}
        >
          Create New Order
        </Button>
      )}
    </div>
  );
});

function OrderListTableInner({
  orders,
  isLoading,
  searchQuery,
  selectedOrders,
  canDelete,
  onSelectAll,
  onToggleSelect,
  onDelete,
  onCancel,
}: OrderListTableProps) {
  const isSelected = useCallback(
    (id: string) => selectedOrders.includes(id),
    [selectedOrders]
  );

  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        <TableSkeleton />
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        <EmptyState searchQuery={searchQuery} />
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    selectedOrders.length === orders.length && orders.length > 0
                  }
                  onChange={onSelectAll}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                selected={isSelected(order.id)}
                canDelete={canDelete}
                onToggleSelect={onToggleSelect}
                onDelete={onDelete}
                onCancel={onCancel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const OrderListTable = React.memo(OrderListTableInner);
OrderListTable.displayName = "OrderListTable";

export default OrderListTable;
