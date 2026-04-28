/**
 * OrderPagination Component
 *
 * Pagination controls for the orders list. Displays:
 *   - "Showing X–Y of Z orders" label
 *   - Rows-per-page selector
 *   - Page X of Y indicator
 *   - Previous / Next page buttons
 *
 * Memoized — only re-renders when pagination state changes.
 *
 * @component
 * @module components/admin/orders/OrderPagination
 */

"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function OrderPaginationInner({
  page,
  pageSize,
  total,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
  onPageSizeChange,
}: OrderPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Showing</span>
        <span className="font-semibold text-slate-900">
          {Math.min((page - 1) * pageSize + 1, total)}
        </span>
        <span>–</span>
        <span className="font-semibold text-slate-900">
          {Math.min(page * pageSize, total)}
        </span>
        <span>of</span>
        <span className="font-semibold text-slate-900">{total}</span>
        <span>orders</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          Page {page} of {totalPages || 1}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-slate-200"
            disabled={!hasPrev}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-slate-200"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const OrderPagination = React.memo(OrderPaginationInner);
OrderPagination.displayName = "OrderPagination";

export default OrderPagination;
