"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, Package, Tag, Box, AlertTriangle, Store,
  XCircle, Barcode, Image as ImageIcon, Clock, IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import { useProduct, useDeleteProduct } from "@/hooks";
import { useProductStore, useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import { downloadBarcode } from "@/lib/barcode";
import Image from "next/image";

interface BranchInventoryRow {
  id: string;
  branch_id: string;
  quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  branch?: { id: string; name: string };
}

interface OrderItemRow {
  id: string;
  order_id: string;
  quantity: number;
  price_per_day: number;
  total_price: number;
  subtotal: number;
  created_at: string;
  order?: {
    id: string;
    status: string;
    rental_start_date: string;
    rental_end_date: string;
    total_amount: number;
    created_at: string;
    customer?: { id: string; name: string; phone?: string };
    branch?: { id: string; name: string };
  };
}

interface ProductAnalytics {
  totalOrders: number;
  totalUnitsRented: number;
  totalRevenue: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  uniqueCustomers: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { product, isLoading } = useProduct(productId);
  const deleteProduct = useDeleteProduct();
  const { showError, showSuccess } = useAppStore();

  const [branchInventory, setBranchInventory] = useState<BranchInventoryRow[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const {
    openDeleteModal,
    closeDeleteModal,
    isDeleteModalOpen,
    currentProduct,
  } = useProductStore();

  useEffect(() => {
    if (!productId) return;
    const loadInventory = async () => {
      setIsLoadingInventory(true);
      try {
        const res = await fetch(`/api/branch-inventory?product_id=${productId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBranchInventory(json.data);
        }
      } catch (err) {
        console.error('Failed to load branch inventory:', err);
      } finally {
        setIsLoadingInventory(false);
      }
    };
    const loadAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        const res = await fetch(`/api/products/${productId}/orders`);
        const json = await res.json();
        if (json.success && json.data) {
          setOrderItems(json.data.items || []);
          setAnalytics(json.data.analytics || null);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };
    loadInventory();
    loadAnalytics();
  }, [productId]);

  const handleDelete = async () => {
    if (!currentProduct) return;
    try {
      const result = await deleteProduct.mutateAsync(currentProduct.id) as any;
      if (result?.success) {
        showSuccess("Product deleted successfully");
        router.push("/dashboard/products");
      }
    } catch (err) {
      console.error(err);
    } finally {
      closeDeleteModal();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Package className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">Product Not Found</h3>
          <p className="mb-4 text-sm text-slate-500">This product may have been deleted or the URL is incorrect.</p>
          <Button onClick={() => router.push("/dashboard/products")}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const primaryImage = product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url;
  const totalQty = product.quantity || 0;
  const availQty = product.available_quantity || 0;
  const rentedQty = totalQty - availQty;
  const stockPct = totalQty > 0 ? (rentedQty / totalQty) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/products")}
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
              <Badge className={product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
              {product.is_featured && (
                <Badge className="bg-purple-100 text-purple-700">Featured</Badge>
              )}
            </div>
            <p className="text-slate-500 mt-0.5 text-sm">
              {product.category?.name || "Uncategorized"} · {product.sku || "No SKU"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {product.barcode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadBarcode(product.barcode!, product.name)}
              className="gap-1.5"
            >
              <Barcode className="h-4 w-4" />
              <span className="hidden sm:inline">Barcode</span>
            </Button>
          )}
          <Button size="sm" onClick={() => router.push(`/dashboard/products/${product.id}/edit`)} className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDeleteModal(product)}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime Revenue"
          value={isLoadingAnalytics ? null : formatCurrency(analytics?.totalRevenue || 0)}
          icon={<IndianRupee className="w-5 h-5 text-emerald-500" />}
          tint="emerald"
        />
        <StatCard
          label="Active Rentals"
          value={isLoadingAnalytics ? null : String(analytics?.activeOrders || 0)}
          icon={<Clock className="w-5 h-5 text-violet-500" />}
          tint="violet"
          dot={!!analytics?.activeOrders}
        />
        <StatCard
          label="Times Rented"
          value={isLoadingAnalytics ? null : String(analytics?.totalUnitsRented || 0)}
          icon={<Package className="w-5 h-5 text-amber-500" />}
          tint="amber"
        />
        <StatCard
          label="Available"
          value={isLoadingAnalytics ? null : `${availQty} / ${totalQty}`}
          icon={<Box className="w-5 h-5 text-red-500" />}
          tint={availQty === 0 ? "red" : "emerald"}
          progressBar={{ pct: stockPct, danger: availQty === 0 }}
        />
      </div>

      {/* ── Main Content Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Product info + Orders */}
        <div className="lg:col-span-2 space-y-6">

          {/* Product Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <div className="sm:w-56 shrink-0 bg-slate-50 flex items-center justify-center p-6 border-b sm:border-b-0 sm:border-r border-slate-100">
                  {primaryImage ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={primaryImage} alt={product.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-violet-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rental Price</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(product.price_per_day)}
                      <span className="text-sm font-normal text-slate-400 ml-1">/day</span>
                    </p>
                  </div>

                  {product.description && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Period</th>
                    <th className="text-left px-4 py-3">Branch</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingAnalytics ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500 mx-auto" />
                      </td>
                    </tr>
                  ) : orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No orders yet for this product.
                      </td>
                    </tr>
                  ) : (
                    orderItems.slice(0, 10).map((item) => {
                      const order = item.order;
                      if (!order) return null;

                      const statusMap: Record<string, string> = {
                        pending: "bg-amber-100 text-amber-700",
                        confirmed: "bg-blue-100 text-blue-700",
                        ongoing: "bg-emerald-100 text-emerald-700",
                        returned: "bg-slate-100 text-slate-700",
                        cancelled: "bg-red-100 text-red-700",
                      };

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-violet-50/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-medium">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{order.customer?.name || "Unknown"}</div>
                            {order.customer?.phone && (
                              <div className="text-xs text-slate-400">{order.customer.phone}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {new Date(order.rental_start_date).toLocaleDateString()} – {new Date(order.rental_end_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {order.branch?.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={statusMap[order.status.toLowerCase()] || "bg-slate-100 text-slate-700"}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {orderItems.length > 10 && (
                <div className="p-3 border-t border-slate-100 text-center">
                  <Button variant="link" size="sm" onClick={() => router.push(`/dashboard/orders?product_id=${product.id}`)}>
                    View all {orderItems.length} orders →
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">

          {/* Branch Inventory */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Store className="w-4 h-4" /> Branch Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingInventory ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500" />
                </div>
              ) : branchInventory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No branch stock assigned.</p>
              ) : (
                <div className="space-y-3">
                  {branchInventory.map((inv) => {
                    const isOut = inv.available_quantity === 0;
                    const isLow = !isOut && inv.available_quantity <= inv.low_stock_threshold;
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{inv.branch?.name || "Unknown"}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isOut && <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                            {isLow && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className="text-xs text-slate-400">Threshold: {inv.low_stock_threshold}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-lg font-bold ${isOut ? 'text-red-600' : 'text-slate-900'}`}>
                            {inv.available_quantity}
                          </span>
                          <span className="text-sm text-slate-400 font-normal"> / {inv.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identifiers */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <InfoRow label="SKU" value={product.sku || "—"} mono />
              <InfoRow label="Barcode" value={product.barcode || "—"} mono />
              <InfoRow label="Slug" value={product.slug || "—"} mono />
              <div>
                <p className="text-xs text-slate-400 mb-1">Database ID</p>
                <p className="font-mono text-xs text-slate-400 break-all select-all">{product.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Delete Modal ────────────────────────────────────────────── */}
      <Modal open={isDeleteModalOpen} onClose={closeDeleteModal} title="Delete Product">
        <div className="p-5">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{currentProduct?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={closeDeleteModal}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Stat Card (matches product list page design) ──────────────────── */
function StatCard({
  label,
  value,
  icon,
  tint,
  dot,
  progressBar,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  tint: "violet" | "emerald" | "amber" | "red";
  dot?: boolean;
  progressBar?: { pct: number; danger: boolean };
}) {
  const tints: Record<typeof tint, string> = {
    violet: "from-violet-50 to-purple-50 border-violet-100",
    emerald: "from-emerald-50 to-green-50 border-emerald-100",
    amber: "from-amber-50 to-orange-50 border-amber-100",
    red: "from-red-50 to-rose-50 border-red-100",
  };

  return (
    <Card className={`border bg-gradient-to-br ${tints[tint]} shadow-none`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
            {icon}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {value === null ? (
            <div className="h-7 w-20 bg-white/50 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          )}
          {dot && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          )}
        </div>
        {progressBar && (
          <div className="mt-3 h-1.5 w-full bg-white/60 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${progressBar.pct}%` }}
            />
            <div
              className={`h-full rounded-full ${progressBar.danger ? "bg-red-400" : "bg-emerald-400"}`}
              style={{ width: `${100 - progressBar.pct}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Small info row for sidebar ────────────────────────────────────── */
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
