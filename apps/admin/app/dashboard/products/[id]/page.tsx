"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, Package, Tag, Box, AlertTriangle, Store,
  TrendingUp, ShoppingBag, Users, Activity, CheckCircle2, XCircle, Barcode, Image as ImageIcon,
  Clock, IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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

  // Calculate overall stock health
  const totalQty = product.quantity || 0;
  const availQty = product.available_quantity || 0;
  const rentedQty = totalQty - availQty;
  const stockPercentage = totalQty > 0 ? (rentedQty / totalQty) * 100 : 0;
  
  // Status colors
  const statusColor = product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. HERO HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/products")} className="h-9 w-9 shrink-0 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{product.name}</h1>
              <Badge variant="secondary" className={statusColor}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
              {product.is_featured && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              {product.category?.name && <span>{product.category.name}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {product.barcode && (
            <Button 
              variant="outline" 
              onClick={() => downloadBarcode(product.barcode!, product.name)}
              className="gap-2"
            >
              <Barcode className="h-4 w-4" />
              <span className="hidden sm:inline">Print Barcode</span>
            </Button>
          )}
          <Button onClick={() => router.push(`/dashboard/products/${product.id}/edit`)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="icon"
            onClick={() => openDeleteModal(product)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. THE 2-SECOND ZONE (HERO STATS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Lifetime Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(analytics?.totalRevenue || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Rentals Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Currently Rented</CardTitle>
            {analytics?.activeOrders ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
               <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-slate-900">{analytics?.activeOrders || 0}</div>
                <div className="text-sm text-slate-500">active orders</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Times Rented */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Times Rented</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{analytics?.totalUnitsRented || 0}</div>
            )}
          </CardContent>
        </Card>

        {/* Availability Card */}
        <Card className={`shadow-sm ${availQty === 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className={`text-3xl font-bold ${availQty === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {availQty}
              </div>
              <div className="text-sm text-slate-500 mb-1">/ {totalQty} available</div>
            </div>
            
            {/* Visual Progress Bar */}
            <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-blue-500 transition-all" 
                style={{ width: `${stockPercentage}%` }}
                title={`${rentedQty} out with customers`}
              />
              <div 
                className={`h-full ${availQty === 0 ? 'bg-red-500' : 'bg-emerald-500'} transition-all`} 
                style={{ width: `${100 - stockPercentage}%` }}
                title={`${availQty} available`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Image & Orders */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Content Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Image */}
                <div className="shrink-0 w-full sm:w-48 h-48 rounded-lg border bg-slate-50 overflow-hidden relative flex items-center justify-center">
                  {primaryImage ? (
                    <Image src={primaryImage} alt={product.name} fill className="object-cover" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-slate-300" />
                  )}
                </div>
                
                {/* Pricing & Description */}
                <div className="flex-1 space-y-4">
                  <div className="p-4 rounded-lg bg-slate-50 border w-full sm:w-fit pr-12">
                    <p className="text-sm text-slate-500 font-medium mb-1">Rental Price</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(product.price_per_day)} <span className="text-sm font-normal text-slate-500">/day</span></p>
                  </div>
                  
                  {product.description && (
                    <div className="pt-2">
                      <h3 className="text-sm font-medium text-slate-900 mb-2">Description</h3>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                Recent Orders
              </CardTitle>
              <CardDescription>Tracing history for this specific item.</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-y border-slate-200 font-medium">
                  <tr>
                    <th className="px-6 py-3">Order Date</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Rental Period</th>
                    <th className="px-6 py-3">Branch</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingAnalytics ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                      </td>
                    </tr>
                  ) : orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No orders found for this product.
                      </td>
                    </tr>
                  ) : (
                    orderItems.slice(0, 10).map((item) => {
                      const order = item.order;
                      if (!order) return null;
                      
                      const statusStyles: Record<string, string> = {
                        pending: "bg-amber-100 text-amber-700",
                        confirmed: "bg-blue-100 text-blue-700",
                        ongoing: "bg-emerald-100 text-emerald-700",
                        returned: "bg-slate-100 text-slate-700",
                        cancelled: "bg-red-100 text-red-700"
                      };
                      const statusStyle = statusStyles[order.status.toLowerCase()] || "bg-slate-100 text-slate-700";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{order.customer?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{order.customer?.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {new Date(order.rental_start_date).toLocaleDateString()} - {new Date(order.rental_end_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {order.branch?.name || 'Unknown Branch'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {orderItems.length > 10 && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <Button variant="link" onClick={() => router.push(`/dashboard/orders?product_id=${product.id}`)}>
                    View all {orderItems.length} orders
                  </Button>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="space-y-6">
          
          {/* Branch Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-500" />
                Branch Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInventory ? (
                 <div className="flex justify-center p-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : branchInventory.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-md border border-dashed">
                  No branch inventory found.
                </div>
              ) : (
                <div className="space-y-4">
                  {branchInventory.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-medium text-slate-900">{inv.branch?.name || 'Unknown Branch'}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          {inv.available_quantity <= inv.low_stock_threshold && inv.available_quantity > 0 && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                          {inv.available_quantity === 0 && (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          Threshold: {inv.low_stock_threshold}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${inv.available_quantity === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {inv.available_quantity} <span className="text-sm font-normal text-slate-500">/ {inv.quantity}</span>
                        </div>
                        <div className="text-xs text-slate-500">Available</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Identifiers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-slate-500" />
                Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">SKU</div>
                  <div className="font-mono text-sm bg-slate-50 p-2 rounded border text-slate-800">
                    {product.sku || 'Not assigned'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Barcode</div>
                  <div className="font-mono text-sm bg-slate-50 p-2 rounded border text-slate-800">
                    {product.barcode || 'Not assigned'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Database ID</div>
                  <div className="font-mono text-xs text-slate-400 break-all">
                    {product.id}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modals */}
      <Modal
        open={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Product"
      >
        <div className="p-5">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete {currentProduct?.name}? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
