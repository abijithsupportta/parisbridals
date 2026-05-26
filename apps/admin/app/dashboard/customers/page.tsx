/**
 * Customers List Page
 *
 * Client-side page with debounced search, server-side pagination,
 * optimistic deletes, and Add/Edit/View actions — identical patterns
 * to the Products list page.
 *
 * @module app/dashboard/customers/page
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  Phone,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Modal from "@/components/admin/Modal";
import { useCustomers, useDeleteCustomer } from "@/hooks";
import { useAppStore } from "@/stores";
import { type Customer } from "@/domain";

export default function CustomersPage() {
  const router = useRouter();

  // ── Search + Pagination state ──────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ── Data fetching ──────────────────────────────────────────────────
  const {
    customers,
    isLoading,
    total,
    totalPages,
    hasNext,
    hasPrev,
  } = useCustomers({
    query: debouncedQuery,
    limit: pageSize,
    page,
  });

  const deleteCustomer = useDeleteCustomer();
  const { showSuccess, showError } = useAppStore();

  // ── Delete modal ───────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const handleOpenDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    deleteCustomer.deleteCustomer(customerToDelete);
    setDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{total} total customers</span>
          </p>
        </div>
        <Button asChild className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/dashboard/customers/create">
            <Plus className="w-4 h-4" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="pl-9 border-slate-200 focus:border-slate-900"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {/* Shimmer rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              {debouncedQuery ? "No customers found" : "No customers yet"}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {debouncedQuery
                ? "Try adjusting your search query"
                : "Add your first customer to get started"}
            </p>
            {!debouncedQuery && (
              <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 gap-2">
                <Link href="/dashboard/customers/create">
                  <Plus className="w-4 h-4" />
                  Add Customer
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      ID Type
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer: Customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* Name + avatar */}
                      <td className="p-4">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="flex items-center gap-3 group/link"
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                            {customer.photo_url ? (
                              <img
                                src={customer.photo_url}
                                alt={customer.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-500">
                                {customer.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-900 group-hover/link:text-slate-700 transition-colors">
                            {customer.name}
                          </span>
                        </Link>
                      </td>

                      {/* Phone */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {customer.phone}
                        </div>
                        {customer.alt_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 ml-5">
                            {customer.alt_phone}
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td className="p-4 text-sm text-slate-600">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {customer.email}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* ID Type */}
                      <td className="p-4">
                        {customer.id_type ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                            {customer.id_type}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Date added */}
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(customer.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-500 hover:text-slate-900"
                            onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-500 hover:text-slate-900"
                            onClick={() => router.push(`/dashboard/customers/${customer.id}/edit`)}
                            title="Edit customer"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-500 hover:text-red-600"
                            onClick={() => handleOpenDelete(customer)}
                            title="Delete customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {customers.map((customer: Customer) => (
                <div key={customer.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                        {customer.photo_url ? (
                          <img
                            src={customer.photo_url}
                            alt={customer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-500">
                            {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.phone}</p>
                        {customer.alt_phone && (
                          <p className="text-xs text-slate-400">{customer.alt_phone}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => router.push(`/dashboard/customers/${customer.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleOpenDelete(customer)}
                      >
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Showing</span>
            <span className="font-semibold text-slate-900">
              {(page - 1) * pageSize + 1}
            </span>
            <span>to</span>
            <span className="font-semibold text-slate-900">
              {Math.min(page * pageSize, total)}
            </span>
            <span>of</span>
            <span className="font-semibold text-slate-900">{total}</span>
            <span>customers</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page indicator */}
            <span className="text-xs text-slate-500 hidden sm:inline">
              Page {page} of {totalPages || 1}
            </span>

            {/* Prev / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 border-slate-200"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 border-slate-200"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Customer"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Confirm Deletion
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-slate-900">
                  {customerToDelete?.name}
                </span>
                ? This will also remove their photos and ID documents. This action
                cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCustomer.isLoading}
            >
              {deleteCustomer.isLoading ? "Deleting..." : "Delete Customer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
