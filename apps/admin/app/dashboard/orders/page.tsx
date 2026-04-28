/**
 * Orders List Page
 *
 * Professional, high-performance datatable for managing orders.
 * Follows the exact UI/UX patterns from the products catalog.
 *
 * @module app/dashboard/orders/page
 */

"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Trash2,
  Edit,
  Eye,
  Store,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Package,
  FileText,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import {
  useOrders,
  useDeleteOrder,
  useUpdateOrder,
} from "@/hooks";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import { OrderStatus, type OrderWithRelations } from "@/domain";

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading orders...
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const canDelete = ['admin', 'super_admin', 'owner'].includes(user?.role || '');

  // Read State from URL (The Source of Truth)
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("limit") || "25", 10);
  const urlQuery = searchParams.get("query") || "";
  const statusFilter = (searchParams.get("status") || "ALL") as OrderStatus | "ALL";
  const dateFilter = searchParams.get("date_filter") || "ALL";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  const [searchInput, setSearchInput] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Centralized URL updater (Idempotent updates)
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;
    
    Object.entries(updates).forEach(([key, value]) => {
      const current = params.get(key);
      if (value === null || value === "") {
        if (current !== null) { params.delete(key); hasChanges = true; }
      } else {
        if (current !== value) { params.set(key, value); hasChanges = true; }
      }
    });

    if (hasChanges) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== urlQuery) {
        setDebouncedQuery(searchInput);
        updateParams({ query: searchInput, page: "1" });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, urlQuery, searchParams]);

  const selectedBranchId = useAppStore((s) => s.selectedBranchId);

  const { data: ordersResult, isLoading } = useOrders({
    query: debouncedQuery,
    limit: pageSize,
    page,
    branch_id: selectedBranchId || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    date_filter: dateFilter === "ALL" ? undefined : dateFilter as any,
    date_from: dateFilter === "custom" && dateFrom ? dateFrom : undefined,
    date_to: dateFilter === "custom" && dateTo ? dateTo : undefined,
  });

  const deleteOrder = useDeleteOrder();
  const { updateOrder } = useUpdateOrder();
  const { showSuccess, showError } = useAppStore();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderWithRelations | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [currentCancelOrder, setCurrentCancelOrder] = useState<OrderWithRelations | null>(null);

  const visibleOrders = ordersResult?.data || [];
  const total = ordersResult?.total || 0;
  const totalPages = ordersResult?.totalPages || 1;
  const hasNext = ordersResult?.hasNext || false;
  const hasPrev = ordersResult?.hasPrev || false;

  // Selection logic
  const isSelected = (id: string) => selectedOrders.includes(id);
  const toggleSelection = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const handleSelectAll = () => {
    if (selectedOrders.length === visibleOrders.length && visibleOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(visibleOrders.map((o) => o.id));
    }
  };
  const clearSelection = () => setSelectedOrders([]);

  // Stats (Using visible data for simple aggregations, though a real app might use a separate API)
  const stats = useMemo(() => {
    const today = new Date(new Date().toDateString());
    const scheduled = visibleOrders.filter((o) => o.status === OrderStatus.SCHEDULED).length;
    const ongoing = visibleOrders.filter((o) => o.status === OrderStatus.ONGOING).length;
    const flagged = visibleOrders.filter((o) => o.status === OrderStatus.FLAGGED || o.status === OrderStatus.LATE_RETURN).length;
    const actionNeeded = visibleOrders.filter((o) => 
      o.status === OrderStatus.SCHEDULED && new Date(o.start_date) <= today
    ).length;

    return {
      count: total,
      scheduled,
      ongoing,
      flagged,
      actionNeeded,
    };
  }, [visibleOrders, total]);

  // Actions
  const openDeleteModal = (order: OrderWithRelations) => {
    setCurrentOrder(order);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCurrentOrder(null);
  };

  const handleConfirmDelete = async () => {
    if (!currentOrder) return;
    try {
      await deleteOrder.mutateAsync(currentOrder.id);
      closeDeleteModal();
    } catch {
      // Handled in hook
    }
  };

  const openCancelModal = (order: OrderWithRelations) => {
    setCurrentCancelOrder(order);
    setIsCancelModalOpen(true);
  };
  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCurrentCancelOrder(null);
  };

  const handleConfirmCancel = async () => {
    if (!currentCancelOrder) return;
    try {
      updateOrder({ id: currentCancelOrder.id, data: { status: OrderStatus.CANCELLED } });
      closeCancelModal();
    } catch {
      // Handled in hook
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.SCHEDULED:
      case OrderStatus.CONFIRMED:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case OrderStatus.ONGOING:
      case OrderStatus.IN_USE:
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Ongoing</Badge>;
      case OrderStatus.RETURNED:
      case OrderStatus.COMPLETED:
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
      case OrderStatus.PARTIAL:
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Partial</Badge>;
      case OrderStatus.FLAGGED:
      case OrderStatus.LATE_RETURN:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Flagged</Badge>;
      case OrderStatus.CANCELLED:
        return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">{status}</Badge>;
    }
  };

  const showShimmer = isLoading;

  const filterChips = [
    { label: "All", value: "ALL" },
    { label: "Ongoing", value: OrderStatus.ONGOING },
    { label: "Scheduled", value: OrderStatus.SCHEDULED },
    { label: "Late", value: OrderStatus.LATE_RETURN },
    { label: "Partial", value: OrderStatus.PARTIAL },
    { label: "Returned", value: OrderStatus.RETURNED },
    { label: "Flagged", value: OrderStatus.FLAGGED },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <Store className="w-4 h-4 text-slate-400" />
            <span>Viewing orders for</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
              {selectedBranchId ? "Selected Branch" : "All Branches"}
            </span>
            <span>• {stats.count} total records</span>
            {stats.actionNeeded > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200 text-xs animate-pulse">
                <Clock className="w-3 h-3" />
                {stats.actionNeeded} pending start
              </span>
            )}
          </p>
        </div>
        <Button asChild className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/dashboard/orders/create">
            <Plus className="w-4 h-4" />
            Create Order
          </Link>
        </Button>
      </div>

      {/* Filters Area */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Status Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {filterChips.map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => {
                    updateParams({ status: chip.value, page: "1" });
                  }}
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
              <span className="text-sm font-medium text-slate-600 shrink-0">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => {
                  updateParams({ date_filter: e.target.value, page: "1" });
                }}
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
                    onChange={(e) => updateParams({ date_from: e.target.value, page: "1" })} 
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <Input 
                    type="date" 
                    className="h-8 text-xs w-[120px]" 
                    value={dateTo} 
                    onChange={(e) => updateParams({ date_to: e.target.value, page: "1" })} 
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
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {selectedOrders.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                  {selectedOrders.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        {showShimmer ? (
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
        ) : visibleOrders.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Orders Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchInput
                ? `No orders matched your search for "${searchInput}".`
                : "There are no orders yet in this branch."}
            </p>
            {!searchInput && (
              <Button className="mt-6 bg-slate-900 text-white hover:bg-slate-800" onClick={() => router.push("/dashboard/orders/create")}>
                Create New Order
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedOrders.length === visibleOrders.length &&
                        visibleOrders.length > 0
                      }
                      onChange={handleSelectAll}
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
                {visibleOrders.map((order) => {
                  const selected = isSelected(order.id);
                  const itemCount = order.items?.length || 0;

                  return (
                      <tr
                        key={order.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('input') || target.closest('a')) return;
                          router.push(`/dashboard/orders/${order.id}`);
                        }}
                        className={`hover:bg-slate-50 transition-colors group cursor-pointer ${
                          selected ? "bg-slate-50/80" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelection(order.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>

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

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {format(new Date(order.start_date), "MMM d, yyyy")}
                            </div>
                            <div className="text-slate-400 ml-5 flex items-center gap-1">
                              to <span className="font-medium text-slate-600">{format(new Date(order.end_date), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          </div>
                        </td>

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

                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-1">
                            {getStatusBadge(order.status)}
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

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8 text-slate-400 hover:text-slate-900" 
                              onClick={(e) => { e.stopPropagation(); window.open(`/api/orders/${order.id}/invoice?type=final`, '_blank'); }}
                              title="Download Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            
                            {order.status === 'scheduled' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 text-slate-400 hover:text-orange-600" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCancelModal(order);
                                }}
                                title="Cancel Order"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-900" asChild>
                              <Link href={`/dashboard/orders/${order.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                            
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); openDeleteModal(order); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!isLoading && visibleOrders.length > 0 && (
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
                onChange={(e) => {
                  updateParams({ limit: e.target.value, page: "1" });
                }}
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
                onClick={() => updateParams({ page: Math.max(1, page - 1).toString() })}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 border-slate-200"
                disabled={!hasNext}
                onClick={() => updateParams({ page: (page + 1).toString() })}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Order"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Confirm Deletion</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete order <span className="font-semibold text-slate-900">#{currentOrder?.id.slice(0, 8)}</span>? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={closeDeleteModal} className="border-slate-200">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteOrder.isPending}>
              {deleteOrder.isPending ? "Deleting..." : "Delete Order"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={isCancelModalOpen}
        onClose={closeCancelModal}
        title="Cancel Order"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Confirm Cancellation</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to cancel order <span className="font-semibold text-slate-900">#{currentCancelOrder?.id.slice(0, 8)}</span>?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={closeCancelModal} className="border-slate-200">Keep Order</Button>
            <Button onClick={handleConfirmCancel} className="bg-orange-600 hover:bg-orange-700 text-white">
              Cancel Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


