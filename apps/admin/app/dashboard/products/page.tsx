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

import { useMemo, useState } from "react";
import Link from "next/link";
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
  Boxes,
  TrendingUp,
  PackageX,
  CircleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddLinkButton from "@/components/admin/AddLinkButton";
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
  const [searchQuery, setSearchQuery] = useState("");

  const { products, total, isLoading } = useProducts({
    query: searchQuery,
    limit: 100,
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
    if (!selectedBranchId) {
      return { quantity: 0, available: 0, threshold: 0, hasStock: false };
    }
    const row = rows.find((r) => r.branch_id === selectedBranchId);
    return {
      quantity: row?.quantity ?? 0,
      available: row?.available_quantity ?? 0,
      threshold: row?.low_stock_threshold ?? 0,
      hasStock: !!row,
    };
  };

  // Filter products to only those with stock at the selected branch
  const visibleProducts = useMemo(() => {
    if (!selectedBranchId) return products;
    if (isLoadingInventory) return [];
    return products.filter((p: any) => {
      const rows = inventoryByProduct[p.id] || [];
      return rows.some((r) => r.branch_id === selectedBranchId);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleProducts, inventoryByProduct, selectedBranchId]);

  // ── Actions ──────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!currentProduct) return;
    try {
      await deleteProduct.mutateAsync(currentProduct.id);
      // onSuccess/onError already wired in the hook
      closeDeleteModal();
    } catch (err: any) {
      // Error toast already shown by the hook's onError
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === visibleProducts.length) {
      clearSelection();
    } else {
      selectAll(visibleProducts.map((p: any) => p.id));
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
          (result as any)?.error?.message ||
            "Some products have order history and cannot be deleted"
        );
      }
    } catch {
      showError("Delete Error", "An unexpected error occurred");
    }
  };

  const handleBulkDownloadBarcodes = async () => {
    const list = visibleProducts.filter(
      (p: any) => selectedProducts.includes(p.id) && p.barcode
    );
    if (list.length === 0) {
      showError("No Barcodes", "No selected products have barcodes assigned.");
      return;
    }
    try {
      await downloadMultipleBarcodes(
        list.map((p: any) => ({ barcode: p.barcode!, name: p.name }))
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
  const noBranchSelected = !selectedBranchId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <Store className="w-4 h-4 text-violet-500" />
            <span>
              Showing <strong>{stats.count}</strong> product
              {stats.count === 1 ? "" : "s"} at
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-100">
              {currentBranchName || "this branch"}
            </span>
          </p>
        </div>
        <AddLinkButton label="Add Product" href="/dashboard/products/create" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Products"
          value={stats.count}
          icon={<Boxes className="w-5 h-5 text-violet-500" />}
          tint="violet"
        />
        <StatCard
          label="Total Stock"
          value={stats.totalQty}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          tint="emerald"
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStock}
          icon={<CircleAlert className="w-5 h-5 text-amber-500" />}
          tint="amber"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStock}
          icon={<PackageX className="w-5 h-5 text-red-500" />}
          tint="red"
        />
      </div>

      {/* Search + Bulk actions */}
      <Card className="border border-slate-100 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products by name, SKU, barcode..."
              className="pl-10 bg-slate-50 border-slate-200 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedProducts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-lg">
              <span className="text-sm font-medium text-violet-700">
                {selectedProducts.length} selected
              </span>
              <div className="flex gap-2 ml-auto flex-wrap">
                <Button size="sm" variant="outline" onClick={handleBulkActivate} disabled={bulkOperation.isPending}>
                  Activate
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDeactivate} disabled={bulkOperation.isPending}>
                  Deactivate
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDownloadBarcodes} disabled={bulkOperation.isPending}>
                  <Download className="w-4 h-4 mr-1" />
                  Barcodes
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkOperation.isPending}>
                  <Trash2 className="w-4 h-4 mr-1" />
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
      <Card className="border border-slate-100 shadow-sm overflow-hidden">
        {isLoading || isLoadingInventory ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto" />
            <p className="text-slate-500 mt-3 text-sm">Loading products...</p>
          </div>
        ) : noBranchSelected ? (
          <div className="p-16 text-center">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Select a branch from the top-right switcher</p>
            <p className="text-slate-400 text-sm mt-1">
              Each branch has its own inventory and product list.
            </p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">
              {searchQuery
                ? `No products found for "${searchQuery}"`
                : `No products stocked at ${currentBranchName || "this branch"}`}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Add a product and assign stock to this branch to see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_160px_140px_150px_140px_120px] gap-4 items-center p-4 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <div>
                <input
                  type="checkbox"
                  checked={
                    selectedProducts.length === visibleProducts.length &&
                    visibleProducts.length > 0
                  }
                  onChange={handleSelectAll}
                  className="rounded border-slate-300"
                />
              </div>
              <div>Product</div>
              <div>Category</div>
              <div>Rent</div>
              <div>Stock at Branch</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            {visibleProducts.map((product: any) => {
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
                <div
                  key={product.id}
                  className={`grid grid-cols-[auto_1fr_120px] md:grid-cols-[auto_1fr_160px_140px_150px_140px_120px] gap-4 items-center p-4 hover:bg-violet-50/30 transition-colors ${
                    selected ? "bg-violet-50/60" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <div>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProductSelection(product.id)}
                      className="rounded border-slate-300"
                    />
                  </div>

                  {/* Product */}
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="flex items-center gap-3 min-w-0 group"
                  >
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-violet-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate font-mono">
                        {product.sku || product.slug}
                      </p>
                    </div>
                  </Link>

                  {/* Category */}
                  <div className="hidden md:block">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {product.category?.name || "Uncategorized"}
                    </span>
                  </div>

                  {/* Rent */}
                  <div className="hidden md:block text-slate-800 font-semibold">
                    {formatCurrency(product.price_per_day)}
                  </div>

                  {/* Stock at Branch */}
                  <div className="hidden md:flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-slate-800 font-bold text-lg leading-none">
                        {stock.quantity}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {stock.available} available
                      </span>
                    </div>
                    {isOut ? (
                      <Badge className="bg-red-100 text-red-700 text-[10px] border-red-200 border">
                        Out
                      </Badge>
                    ) : isLow ? (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px] border-amber-200 border">
                        Low
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-emerald-200 border">
                        In Stock
                      </Badge>
                    )}
                  </div>

                  {/* Status */}
                  <div className="hidden md:flex">
                    <Badge
                      className={
                        product.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 justify-end">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-slate-400" />
                    </Link>
                    {product.barcode && (
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => downloadBarcode(product.barcode, product.name)}
                        title="Download Barcode"
                      >
                        <Download className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    <button
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => openDeleteModal(product)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Product"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Delete "{currentProduct?.name || "this product"}"?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                This action cannot be undone. Products with existing order
                history <strong>cannot</strong> be deleted — their related
                orders must be removed first.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={closeDeleteModal}
                  disabled={deleteProduct.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleteProduct.isPending}
                >
                  {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Small Stat Card component ───────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tint: "violet" | "emerald" | "amber" | "red";
}) {
  const tints: Record<typeof tint, string> = {
    violet: "from-violet-50 to-purple-50 border-violet-100",
    emerald: "from-emerald-50 to-green-50 border-emerald-100",
    amber: "from-amber-50 to-orange-50 border-amber-100",
    red: "from-red-50 to-rose-50 border-red-100",
  };
  return (
    <Card className={`border bg-gradient-to-br ${tints[tint]} shadow-none`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
