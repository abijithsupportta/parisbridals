/**
 * OrderFilters Component
 *
 * Filter bar for the orders list page. Contains:
 *   - Status filter chips (All, Ongoing, Scheduled, Late, etc.)
 *   - Date range filter (presets + custom range)
 *   - Search input with debounced callback
 *   - Bulk selection info bar
 *
 * Memoized to prevent re-rendering when the table data changes
 * but filter state remains the same.
 *
 * @component
 * @module components/admin/orders/OrderFilters
 */

"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatus } from "@/domain";

/** Pre-defined status filter options */
const FILTER_CHIPS = [
  { label: "All", value: "ALL" },
  { label: "Ongoing", value: OrderStatus.ONGOING },
  { label: "Scheduled", value: OrderStatus.SCHEDULED },
  { label: "Late", value: OrderStatus.LATE_RETURN },
  { label: "Partial", value: OrderStatus.PARTIAL },
  { label: "Returned", value: OrderStatus.RETURNED },
  { label: "Completed", value: OrderStatus.COMPLETED },
  { label: "Cancelled", value: OrderStatus.CANCELLED },
  { label: "Flagged", value: OrderStatus.FLAGGED },
] as const;

interface OrderFiltersProps {
  statusFilter: string;
  dateFilter: string;
  dateFrom: string;
  dateTo: string;
  initialQuery: string;
  selectedCount: number;
  onStatusChange: (status: string) => void;
  onDateFilterChange: (filter: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onSearchChange: (query: string) => void;
  onClearSelection: () => void;
}

function OrderFiltersInner({
  statusFilter,
  dateFilter,
  dateFrom,
  dateTo,
  initialQuery,
  selectedCount,
  onStatusChange,
  onDateFilterChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onClearSelection,
}: OrderFiltersProps) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  // Sync external query changes (e.g. URL navigation)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSearchInput(initialQuery);
  }, [initialQuery]);

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== initialQuery) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, initialQuery, onSearchChange]);

  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    []
  );

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => onStatusChange(chip.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  statusFilter === chip.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
            <span className="text-sm font-medium text-slate-600 shrink-0">
              Date:
            </span>
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 shrink-0"
            >
              <option value="ALL">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="date"
                  className="h-8 text-xs w-[120px]"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                />
                <span className="text-slate-400 text-xs">to</span>
                <Input
                  type="date"
                  className="h-8 text-xs w-[120px]"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search orders by customer or ID..."
              className="pl-9 border-slate-200 focus:border-slate-900"
              value={searchInput}
              onChange={handleSearchInput}
            />
          </div>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {selectedCount} selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onClearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const OrderFilters = React.memo(OrderFiltersInner);
OrderFilters.displayName = "OrderFilters";

export default OrderFilters;
