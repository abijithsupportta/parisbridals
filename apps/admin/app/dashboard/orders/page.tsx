/**
 * Orders List Page
 *
 * High-performance, componentized order management page.
 * Follows the same architectural pattern as the Category module:
 *   - Thin page orchestrator
 *   - Extracted, memoized child components
 *   - URL-driven state (single source of truth)
 *   - Stable callbacks via useCallback
 *
 * Component tree:
 *   OrdersPage (Suspense boundary)
 *     └─ OrdersContent (orchestrator — URL state, data fetching)
 *          ├─ OrderFilters   (status chips, date, search, selection bar)
 *          ├─ OrderListTable  (skeleton / empty / table with OrderRow×N)
 *          ├─ OrderPagination (page controls)
 *          ├─ OrderDeleteModal
 *          └─ OrderCancelModal
 *
 * @module app/dashboard/orders/page
 */

"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useOrders,
  useDeleteOrder,
  useUpdateOrder,
} from "@/hooks";
import { useAppStore } from "@/stores";
import { OrderStatus, type OrderWithRelations } from "@/domain";
import {
  OrderFilters,
  OrderListTable,
  OrderPagination,
  OrderDeleteModal,
  OrderCancelModal,
} from "@/components/admin/orders";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading orders...
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const canDelete = ["admin", "super_admin", "owner"].includes(
    user?.role || ""
  );
  const selectedBranchId = useAppStore((s) => s.selectedBranchId);

  // ── URL-driven state (single source of truth) ──────────────────────────
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("limit") || "25", 10);
  const urlQuery = searchParams.get("query") || "";
  const statusFilter =
    (searchParams.get("status") || "ALL") as OrderStatus | "ALL";
  const dateFilter = searchParams.get("date_filter") || "ALL";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  // ── Centralised URL updater (idempotent) ───────────────────────────────
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      let hasChanges = false;

      Object.entries(updates).forEach(([key, value]) => {
        const current = params.get(key);
        if (value === null || value === "") {
          if (current !== null) {
            params.delete(key);
            hasChanges = true;
          }
        } else {
          if (current !== value) {
            params.set(key, value);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [searchParams, pathname, router]
  );

  // ── Data fetching via TanStack Query ───────────────────────────────────
  const { data: ordersResult, isLoading } = useOrders({
    query: urlQuery,
    limit: pageSize,
    page,
    branch_id: selectedBranchId || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    date_filter:
      dateFilter === "ALL"
        ? undefined
        : (dateFilter as "today" | "yesterday" | "this_week" | "this_month" | "custom"),
    date_from: dateFilter === "custom" && dateFrom ? dateFrom : undefined,
    date_to: dateFilter === "custom" && dateTo ? dateTo : undefined,
  });

  const deleteOrder = useDeleteOrder();
  const { updateOrder } = useUpdateOrder();

  // ── Derived data (memoized) ────────────────────────────────────────────
  const visibleOrders = useMemo(
    () => ordersResult?.data || [],
    [ordersResult?.data]
  );
  const total = ordersResult?.total || 0;
  const totalPages = ordersResult?.totalPages || 1;
  const hasNext = ordersResult?.hasNext || false;
  const hasPrev = ordersResult?.hasPrev || false;

  // ── Selection state ────────────────────────────────────────────────────
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const handleSelectAll = useCallback(() => {
    setSelectedOrders((prev) => {
      if (prev.length === visibleOrders.length && visibleOrders.length > 0) {
        return [];
      }
      return visibleOrders.map((o) => o.id);
    });
  }, [visibleOrders]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedOrders([]), []);

  // ── Modal state ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<OrderWithRelations | null>(
    null
  );
  const [cancelTarget, setCancelTarget] = useState<OrderWithRelations | null>(
    null
  );

  const openDeleteModal = useCallback(
    (order: OrderWithRelations) => setDeleteTarget(order),
    []
  );
  const closeDeleteModal = useCallback(() => setDeleteTarget(null), []);

  const openCancelModal = useCallback(
    (order: OrderWithRelations) => setCancelTarget(order),
    []
  );
  const closeCancelModal = useCallback(() => setCancelTarget(null), []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteOrder.mutateAsync(deleteTarget.id);
      closeDeleteModal();
    } catch {
      // Handled in hook
    }
  }, [deleteTarget, deleteOrder, closeDeleteModal]);

  const handleConfirmCancel = useCallback(() => {
    if (!cancelTarget) return;
    try {
      updateOrder({
        id: cancelTarget.id,
        data: { status: OrderStatus.CANCELLED },
      });
      closeCancelModal();
    } catch {
      // Handled in hook
    }
  }, [cancelTarget, updateOrder, closeCancelModal]);

  // ── Filter callbacks (stable references) ───────────────────────────────
  const handleStatusChange = useCallback(
    (status: string) => updateParams({ status, page: "1" }),
    [updateParams]
  );

  const handleDateFilterChange = useCallback(
    (filter: string) => updateParams({ date_filter: filter, page: "1" }),
    [updateParams]
  );

  const handleDateFromChange = useCallback(
    (date: string) => updateParams({ date_from: date, page: "1" }),
    [updateParams]
  );

  const handleDateToChange = useCallback(
    (date: string) => updateParams({ date_to: date, page: "1" }),
    [updateParams]
  );

  const handleSearchChange = useCallback(
    (query: string) => updateParams({ query, page: "1" }),
    [updateParams]
  );

  const handlePageChange = useCallback(
    (p: number) => updateParams({ page: p.toString() }),
    [updateParams]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => updateParams({ limit: size.toString(), page: "1" }),
    [updateParams]
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <Store className="w-4 h-4 text-slate-400" />
            <span>Viewing orders for</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
              {selectedBranchId ? "Selected Branch" : "All Branches"}
            </span>
            <span>• {total} total records</span>
          </p>
        </div>
        <Button asChild className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/dashboard/orders/create">
            <Plus className="w-4 h-4" />
            Create Order
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <OrderFilters
        statusFilter={statusFilter}
        dateFilter={dateFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        initialQuery={urlQuery}
        selectedCount={selectedOrders.length}
        onStatusChange={handleStatusChange}
        onDateFilterChange={handleDateFilterChange}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onSearchChange={handleSearchChange}
        onClearSelection={clearSelection}
      />

      {/* Table */}
      <OrderListTable
        orders={visibleOrders}
        isLoading={isLoading}
        searchQuery={urlQuery}
        selectedOrders={selectedOrders}
        canDelete={canDelete}
        onSelectAll={handleSelectAll}
        onToggleSelect={handleToggleSelect}
        onDelete={openDeleteModal}
        onCancel={openCancelModal}
      />

      {/* Pagination */}
      {!isLoading && visibleOrders.length > 0 && (
        <OrderPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          hasNext={hasNext}
          hasPrev={hasPrev}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Modals */}
      <OrderDeleteModal
        open={deleteTarget !== null}
        order={deleteTarget}
        isPending={deleteOrder.isPending}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      <OrderCancelModal
        open={cancelTarget !== null}
        order={cancelTarget}
        onClose={closeCancelModal}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
