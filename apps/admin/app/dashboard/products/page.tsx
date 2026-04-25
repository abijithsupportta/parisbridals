/**
 * Products List Page
 *
 * Branch-aware product listing. Responds to the top-right BranchSwitcher:
 * only products with stock at the selected branch are shown, and the stock
 * column reflects that branch's numbers.
 *
 * Performance: fetches branch_inventory once (batch) instead of N per-product.
 *
 * @module app/dashboard/products/page
 */

"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Trash2,
  Edit,
  Eye,
  Download,
  Package,
  AlertTriangle,
  Store,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import {
  useProducts,
  useDeleteProduct,
  useBulkProductOperation,
} from "@/hooks";
import { useProductStore, useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import {
  downloadBarcode,
  downloadMultipleBarcodes,
} from "@/lib/barcode";
import { type Product, type ProductWithRelations } from "@/domain";
import Image from "next/image";

interface BranchInvRow {
  id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  branch?: { id: string; name: string };
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading catalog...
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Read State from URL (The Source of Truth)
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("limit") || "25", 10);
  const urlQuery = searchParams.get("query") || "";

  // Local state only for the fast-typing input field
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

  // Debounce search input by 300ms and sync to URL
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== urlQuery) {
        setDebouncedQuery(searchInput);
        updateParams({ query: searchInput, page: "1" }); // Reset to page 1 on new search
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, urlQuery, searchParams]);

  const { products, isLoading, total, totalPages, hasNext, hasPrev } = useProducts({
    query: debouncedQuery,
    limit: pageSize,
    page,
  });

  const deleteProduct = useDeleteProduct();
  const {
    selectedProducts,
    toggleProductSelection,
    selectAll,
    clearSelection,
    isProductSelected,
    openDeleteModal,
    closeDeleteModal,
    isDeleteModalOpen,
    currentProduct,
  } = useProductStore();
  const { showSuccess, showError } = useAppStore();
  const selectedBranchId = useAppStore((s) => s.selectedBranchId);
  const bulkOperation = useBulkProductOperation();

  // ── Single batched branch-inventory fetch ────────────────────────
  const { data: inventoryRows = [], isLoading: isLoadingInventory } = useQuery<
    BranchInvRow[]
  >({
    queryKey: ["branch-inventory", "all"],
    queryFn: async () => {
      const res = await fetch("/api/branch-inventory");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) return json.data;
      return [];
    },
    staleTime: 30 * 1000,
  });

  // Index inventory by product_id once
  const inventoryByProduct = useMemo(() => {
    const map: Record<string, BranchInvRow[]> = {};
    for (const row of inventoryRows) {
      if (!map[row.product_id]) map[row.product_id] = [];
      map[row.product_id].push(row);
    }
    return map;
  }, [inventoryRows]);

  // Current branch name
  const currentBranchName = useMemo(() => {
    for (const row of inventoryRows) {
      if (row.branch_id === selectedBranchId && row.branch?.name) {
        return row.branch.name;
      }
    }
    return null;
  }, [inventoryRows, selectedBranchId]);

  // Get stock for a product at the current branch
  const getStockAtBranch = (productId: string) => {
    const rows = inventoryByProduct[productId] || [];
    const product = products.find(p => p.id === productId);
    
    if (!selectedBranchId) {
      // No branch selected — aggregate across all branches or fallback
      if (rows.length === 0) {
        return { 
          quantity: product?.quantity || 0, 
          available: product?.available_quantity || 0, 
          threshold: product?.low_stock_threshold || 0, 
          hasStock: true 
        };
      }
      const totalQty = rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalAvail = rows.reduce((sum, r) => sum + (r.available_quantity || 0), 0);
      return { quantity: totalQty, available: totalAvail, threshold: 0, hasStock: rows.length > 0 };
    }
    
    const row = rows.find((r) => r.branch_id === selectedBranchId);
    if (!row) {
      return { 
        quantity: product?.quantity || 0, 
        available: product?.available_quantity || 0, 
        threshold: product?.low_stock_threshold || 0, 
        hasStock: true 
      };
    }
    
    return {
      quantity: row.quantity ?? 0,
      available: row.available_quantity ?? 0,
      threshold: row.low_stock_threshold ?? 0,
      hasStock: true,
    };
  };

  // Filter products to only those with stock at the selected branch
  const visibleProducts = useMemo(() => {
    if (!selectedBranchId) return products;
    if (isLoadingInventory) return [];
    return products.filter((p) => {
      const rows = inventoryByProduct[p.id] || [];
      // If there are explicit inventory rows, check if selected branch is included
      if (rows.length > 0) {
        return rows.some((r) => r.branch_id === selectedBranchId);
      }
      // If no explicit rows exist yet, show the product (it uses fallback base quantities)
      return true;
    });
  }, [products, inventoryByProduct, selectedBranchId, isLoadingInventory]);

  // Stats for the selected branch
  const stats = useMemo(() => {
    let totalQty = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of visibleProducts) {
      const s = getStockAtBranch(p.id);
      totalQty += s.quantity;
      if (s.available === 0) outOfStock += 1;
      else if (s.available <= s.threshold) lowStock += 1;
    }
    return {
      count: visibleProducts.length,
      totalQty,
      lowStock,
      outOfStock,
    };
     
  }, [visibleProducts, inventoryByProduct, selectedBranchId]);

  // ── Actions ──────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!currentProduct) return;
    try {
      await deleteProduct.mutateAsync(currentProduct.id);
      // onSuccess/onError already wired in the hook
      closeDeleteModal();
    } catch {
      // Error toast already shown by the hook's onError
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === visibleProducts.length) {
      clearSelection();
    } else {
      selectAll(visibleProducts.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedProducts.length} product(s)? Products with order history cannot be deleted.`
      )
    )
      return;

    try {
      const result = await bulkOperation.performBulkOperation({
        product_ids: selectedProducts,
        operation: "delete",
      });
      if (result.success) {
        showSuccess(
          "Deleted",
          `${selectedProducts.length} product(s) deleted`
        );
        clearSelection();
      } else {
        showError(
          "Cannot Delete",
          (result as { error?: { message?: string } })?.error?.message ||
            "Some products have order history and cannot be deleted"
        );
      }
    } catch {
      showError("Delete Error", "An unexpected error occurred");
    }
  };

  const handleBulkDownloadBarcodes = async () => {
    const list = visibleProducts.filter(
      (p) => selectedProducts.includes(p.id) && p.barcode
    );
    if (list.length === 0) {
      showError("No Barcodes", "No selected products have barcodes assigned.");
      return;
    }
    try {
      await downloadMultipleBarcodes(
        list.map((p) => ({ barcode: p.barcode!, name: p.name }))
      );
      showSuccess("Success", `Downloaded ${list.length} barcodes`);
    } catch {
      showError("Download Error", "Failed to download barcodes");
    }
  };

  const handleBulkActivate = async () => {
    if (selectedProducts.length === 0) return;
    try {
      const result = await bulkOperation.performBulkOperation({
        product_ids: selectedProducts,
        operation: "activate",
      });
      if (result.success) {
        showSuccess("Activated", `${result.data?.successful?.length || 0} product(s) activated`);
        clearSelection();
      } else {
        showError("Failed", "Could not activate selected products");
      }
    } catch {
      showError("Error", "An unexpected error occurred");
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedProducts.length === 0) return;
    try {
      const result = await bulkOperation.performBulkOperation({
        product_ids: selectedProducts,
        operation: "deactivate",
      });
      if (result.success) {
        showSuccess("Deactivated", `${result.data?.successful?.length || 0} product(s) deactivated`);
        clearSelection();
      } else {
        showError("Failed", "Could not deactivate selected products");
      }
    } catch {
      showError("Error", "An unexpected error occurred");
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  const showShimmer = isLoading || isLoadingInventory;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <Store className="w-4 h-4 text-slate-400" />
            <span>
              Viewing inventory for
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
              {currentBranchName || "All Branches"}
            </span>
            <span>• {stats.count} total items</span>
          </p>
        </div>
        <Button asChild className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/dashboard/products/create">
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Catalog Size"
          value={showShimmer ? null : String(stats.count)}
          subtext="Total unique products"
        />
        <StatCard
          label="Total Inventory"
          value={showShimmer ? null : String(stats.totalQty)}
          subtext="Items physically in stock"
        />
        <StatCard
          label="Low Stock Alert"
          value={showShimmer ? null : String(stats.lowStock)}
          subtext="Items nearing depletion"
          alert={stats.lowStock > 0}
        />
        <StatCard
          label="Out of Stock"
          value={showShimmer ? null : String(stats.outOfStock)}
          subtext="Zero available quantity"
          alert={stats.outOfStock > 0}
        />
      </div>

      {/* Search + Bulk actions */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products by name, SKU, or barcode..."
              className="pl-9 border-slate-200 focus:border-slate-900"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {selectedProducts.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-slate-200" onClick={handleBulkActivate} disabled={bulkOperation.isPending}>
                  Activate
                </Button>
                <Button size="sm" variant="outline" className="border-slate-200" onClick={handleBulkDeactivate} disabled={bulkOperation.isPending}>
                  Deactivate
                </Button>
                <Button size="sm" variant="outline" className="border-slate-200 gap-1.5" onClick={handleBulkDownloadBarcodes} disabled={bulkOperation.isPending}>
                  <Download className="w-4 h-4" />
                  Barcodes
                </Button>
                <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleBulkDelete} disabled={bulkOperation.isPending}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Grid */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        {showShimmer ? (
          <div className="divide-y divide-slate-100">
            {/* Table header skeleton */}
            <div className="hidden md:grid grid-cols-[auto_1fr_160px_140px_150px_140px_120px] gap-4 p-4 bg-slate-50/50">
              <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse justify-self-end" />
            </div>
            {/* Rows skeleton */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-4 w-4 bg-slate-100 rounded animate-pulse shrink-0" />
                <div className="h-12 w-12 bg-slate-100 rounded-lg animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-slate-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Products Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchInput
                ? `No products matched your search for "${searchInput}".`
                : `There are no products stocked at ${currentBranchName || "this branch"}.`}
            </p>
            {!searchInput && (
              <Button className="mt-6 bg-slate-900 text-white hover:bg-slate-800" onClick={() => router.push("/dashboard/products/create")}>
                Add New Product
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
                        selectedProducts.length === visibleProducts.length &&
                        visibleProducts.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Pricing</th>
                  <th className="px-4 py-3">Branch Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map((product) => {
                  const stock = getStockAtBranch(product.id);
                  const primaryImage = Array.isArray(product.images) && product.images.length > 0
                    ? typeof product.images[0] === "string"
                      ? product.images[0]
                      : product.images[0]?.url
                    : null;
                  const isOut = stock.available === 0;
                  const isLow = !isOut && stock.available <= stock.threshold;
                  const selected = isProductSelected(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50 transition-colors group ${
                        selected ? "bg-slate-50/80" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <Link href={`/dashboard/products/${product.id}`} className="flex items-center gap-3">
                          {primaryImage ? (
                            <div className="relative w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
                              <Image src={primaryImage} alt={product.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {product.sku || product.slug}
                            </p>
                          </div>
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {(product as ProductWithRelations).category?.name || "Uncategorized"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">{formatCurrency(product.price_per_day)}</span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-bold text-base leading-none">
                              {stock.available}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wide">
                              / {stock.quantity} total
                            </span>
                          </div>
                          {isOut ? (
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-red-600 border-red-200 bg-red-50">
                              Out
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-amber-600 border-amber-200 bg-amber-50">
                              Low
                            </Badge>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium px-2 py-0.5 ${
                            product.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-900" asChild>
                            <Link href={`/dashboard/products/${product.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-900" asChild>
                            <Link href={`/dashboard/products/${product.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          {product.barcode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-slate-400 hover:text-slate-900"
                              onClick={() => product.barcode ? downloadBarcode(product.barcode, product.name) : undefined}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDeleteModal(product as Product)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
      {!isLoading && visibleProducts.length > 0 && (
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
            <span>products</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => updateParams({ limit: e.target.value, page: "1" })}
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
        title="Delete Product"
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
                Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{currentProduct?.name}</span>? This action cannot be undone and will remove all associated data.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={closeDeleteModal} className="border-slate-200">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Minimalist Professional Stat Card ──────────────────── */
function StatCard({
  label,
  value,
  subtext,
  alert
}: {
  label: string;
  value: string | null;
  subtext?: string;
  alert?: boolean;
}) {
  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {alert && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          )}
        </div>
        <div className="space-y-1">
          {value === null ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
          ) : (
            <p className={`text-2xl font-bold tracking-tight ${alert ? "text-red-600" : "text-slate-900"}`}>
              {value}
            </p>
          )}
          {subtext && (
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
