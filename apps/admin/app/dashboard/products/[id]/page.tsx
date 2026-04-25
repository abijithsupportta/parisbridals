"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, Package, AlertTriangle, Store,
  XCircle, Barcode, Image as ImageIcon, CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import ProductAvailabilityCalendar from "@/components/admin/ProductAvailabilityCalendar";
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
  subtotal: number;
  created_at: string;
  order?: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
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
  const { showSuccess } = useAppStore();

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
      const result = await deleteProduct.mutateAsync(currentProduct.id);
      if (result && typeof result === "object" && "success" in result && result.success) {
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
      <div className="flex h-full items-center justify-center p-6 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Package className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Product Not Found</h3>
          <p className="mb-6 text-sm text-slate-500 max-w-sm">The product you are looking for does not exist or has been removed from the system.</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
            Return to Products
          </Button>
        </div>
      </div>
    );
  }

  const primaryImage = product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url;
  const totalQty = product.quantity || 0;
  const availQty = product.available_quantity || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/products")}
            className="w-9 h-9 mt-0.5 shrink-0 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
              <Badge variant="secondary" className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${product.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
              {product.is_featured && (
                <Badge variant="outline" className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider border-purple-200 text-purple-700 bg-purple-50">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
              <span className="font-medium text-slate-700">{product.category?.name || "Uncategorized"}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs">{product.sku || "No SKU"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {product.barcode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadBarcode(product.barcode!, product.name)}
              className="gap-2 border-slate-200 text-slate-600 hover:text-slate-900 bg-white"
            >
              <Barcode className="h-4 w-4" />
              <span className="hidden sm:inline">Print Barcode</span>
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={() => router.push(`/dashboard/products/${product.id}/edit`)} 
            className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Edit className="h-4 w-4" />
            Edit Product
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => openDeleteModal(product)}
            className="w-9 h-9 border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 bg-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Key Metrics (Clean, professional look) ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime Revenue"
          value={isLoadingAnalytics ? null : formatCurrency(analytics?.totalRevenue || 0)}
          subtext="Total earnings to date"
        />
        <StatCard
          label="Active Rentals"
          value={isLoadingAnalytics ? null : String(analytics?.activeOrders || 0)}
          subtext="Currently with customers"
          highlight={!!analytics?.activeOrders}
        />
        <StatCard
          label="Total Rents"
          value={isLoadingAnalytics ? null : String(analytics?.totalUnitsRented || 0)}
          subtext="Historical rental count"
        />
        <StatCard
          label="Available Inventory"
          value={isLoadingAnalytics ? null : `${availQty} / ${totalQty}`}
          subtext={availQty === 0 ? "Out of stock" : "Ready for rent"}
          alert={availQty === 0}
        />
      </div>

      {/* ── Main Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN: Main Info & History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Detailed Info Card */}
          <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
            <div className="flex flex-col md:flex-row">
              {/* Product Image Panel */}
              <div className="md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col items-center justify-center min-h-[250px]">
                {primaryImage ? (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <Image src={primaryImage} alt={product.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                    <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>

              {/* Core Details Panel */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rent Price</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(product.price_per_day)}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100 mb-6" />

                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Product Description</h3>
                  {product.description ? (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No description provided for this item.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Orders Table */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Rental History</CardTitle>
                <CardDescription className="text-sm mt-1">Recent orders containing this product</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={() => router.push(`/dashboard/orders?product_id=${product.id}`)}>
                View All
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium border-b border-slate-200">Date</th>
                    <th className="px-6 py-3 font-medium border-b border-slate-200">Customer</th>
                    <th className="px-6 py-3 font-medium border-b border-slate-200">Rental Period</th>
                    <th className="px-6 py-3 font-medium border-b border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingAnalytics ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto" />
                      </td>
                    </tr>
                  ) : orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-slate-500 font-medium">No rental history</p>
                        <p className="text-xs text-slate-400 mt-1">This product hasn&apos;t been rented yet.</p>
                      </td>
                    </tr>
                  ) : (
                    orderItems.slice(0, 5).map((item) => {
                      const order = item.order;
                      if (!order) return null;

                      const getStatusBadge = (status: string) => {
                        const s = status.toLowerCase();
                        if (s === 'completed' || s === 'returned') return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Returned</Badge>;
                        if (s === 'ongoing') return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Ongoing</Badge>;
                        if (s === 'cancelled') return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Cancelled</Badge>;
                        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 capitalize">{status}</Badge>;
                      };

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{order.customer?.name || "Unknown Customer"}</div>
                            {order.customer?.phone && (
                              <div className="text-xs text-slate-500 mt-0.5">{order.customer.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {new Date(order.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(order.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(order.status)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="space-y-6">

          {/* Technical Identifiers */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Product Identifiers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">SKU</dt>
                  <dd className="font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">{product.sku || "N/A"}</dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">Barcode</dt>
                  <dd className="font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">{product.barcode || "N/A"}</dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">System ID</dt>
                  <dd className="font-mono text-slate-400 text-xs truncate max-w-[120px]" title={product.id}>{product.id.substring(0, 8)}...</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Branch Inventory Breakdown */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Branch Stock</CardTitle>
              <Store className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingInventory ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900" />
                </div>
              ) : branchInventory.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500">No stock allocated to any branch.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {branchInventory.map((inv) => {
                    const isOut = inv.available_quantity === 0;
                    const isLow = !isOut && inv.available_quantity <= inv.low_stock_threshold;
                    
                    return (
                      <li key={inv.id} className="p-5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900 text-sm">{inv.branch?.name || "Unknown Branch"}</span>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-lg font-bold tracking-tight ${isOut ? 'text-red-600' : 'text-slate-900'}`}>
                              {inv.available_quantity}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">/ {inv.quantity}</span>
                          </div>
                        </div>
                        
                        {/* Visual stock bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-slate-900'}`}
                            style={{ width: `${inv.quantity > 0 ? (inv.available_quantity / inv.quantity) * 100 : 0}%` }}
                          />
                        </div>
                        
                        {/* Status text */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">
                            Threshold: {inv.low_stock_threshold}
                          </span>
                          {(isOut || isLow) && (
                            <span className={`text-xs font-medium flex items-center gap-1 ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                              {isOut ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {isOut ? "Out of stock" : "Low stock"}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Booking Calendar — Interval Scheduling */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Booking Calendar</CardTitle>
              <CalendarDays className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="p-4">
              <ProductAvailabilityCalendar productId={product.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Delete Modal ────────────────────────────────────────────── */}
      <Modal open={isDeleteModalOpen} onClose={closeDeleteModal} title="Delete Product">
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
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
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
  highlight,
  alert
}: {
  label: string;
  value: string | null;
  subtext?: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {highlight && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          {alert && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          )}
        </div>
        <div className="space-y-1">
          {value === null ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
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
