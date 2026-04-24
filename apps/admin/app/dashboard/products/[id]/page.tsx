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
  const statusColor = product.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. HERO HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-slate-100">
        <div className="flex items-start gap-5">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/products")} className="h-10 w-10 shrink-0 rounded-full bg-white shadow-sm hover:shadow-md transition-all">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
              <Badge variant="secondary" className={`${statusColor} px-3 py-1 text-xs font-semibold uppercase tracking-wider`}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
              {product.is_featured && (
                <Badge className="bg-gradient-to-r from-amber-200 to-amber-100 text-amber-800 border-0 px-3 py-1 text-xs font-semibold uppercase tracking-wider shadow-sm">
                  ★ Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              {product.category?.name && <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{product.category.name}</span>}
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">ID: {product.sku || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {product.barcode && (
            <Button 
              variant="secondary" 
              onClick={() => downloadBarcode(product.barcode!, product.name)}
              className="gap-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 transition-all"
            >
              <Barcode className="h-4 w-4" />
              <span className="hidden sm:inline">Print Barcode</span>
            </Button>
          )}
          <Button onClick={() => router.push(`/dashboard/products/${product.id}/edit`)} className="gap-2 shadow-sm transition-all hover:shadow-md">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="icon"
            onClick={() => openDeleteModal(product)}
            className="shadow-sm hover:shadow-md transition-all bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. THE 2-SECOND ZONE (HERO STATS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4">
            <IndianRupee className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-1 relative z-10">
            <CardTitle className="text-emerald-100 text-sm font-medium tracking-wide uppercase">Lifetime Revenue</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-2">
            {isLoadingAnalytics ? (
              <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg" />
            ) : (
              <div className="text-4xl font-extrabold tracking-tight">
                {formatCurrency(analytics?.totalRevenue || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Rentals Card */}
        <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-white">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Currently Rented</CardTitle>
            {analytics?.activeOrders ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingAnalytics ? (
               <div className="h-10 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold text-slate-900">{analytics?.activeOrders || 0}</div>
                <div className="text-sm font-medium text-slate-400">active orders</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Times Rented */}
        <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-white">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Times Rented</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingAnalytics ? (
              <div className="h-10 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold text-slate-900">{analytics?.totalUnitsRented || 0}</div>
                <div className="text-sm font-medium text-slate-400">total lifetime</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability Card */}
        <Card className={`border shadow-sm hover:shadow-md transition-shadow rounded-2xl ${availQty === 0 ? 'border-red-200 bg-red-50/40' : 'border-slate-100 bg-white'}`}>
          <CardHeader className="pb-1">
            <CardTitle className={`text-sm font-medium uppercase tracking-wide ${availQty === 0 ? 'text-red-500' : 'text-slate-500'}`}>Total Inventory</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-end gap-2">
              <div className={`text-4xl font-bold ${availQty === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {availQty}
              </div>
              <div className="text-sm font-medium text-slate-400 mb-1.5">/ {totalQty} available</div>
            </div>
            
            {/* Visual Progress Bar */}
            <div className="mt-4 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-blue-500 transition-all hover:brightness-110" 
                style={{ width: `${stockPercentage}%` }}
                title={`${rentedQty} out with customers`}
              />
              <div 
                className={`h-full transition-all hover:brightness-110 ${availQty === 0 ? 'bg-red-500' : 'bg-emerald-400'}`} 
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
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="md:w-1/3 bg-slate-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 relative min-h-[300px]">
                  {primaryImage ? (
                    <div className="relative w-full h-full min-h-[250px] rounded-xl overflow-hidden shadow-sm border border-slate-200/60 bg-white">
                      <Image src={primaryImage} alt={product.name} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full min-h-[250px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white">
                      <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
                      <span className="text-sm font-medium">No Image</span>
                    </div>
                  )}
                </div>
                
                {/* Pricing & Description */}
                <div className="md:w-2/3 p-8 flex flex-col justify-center">
                  <div className="inline-block px-5 py-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-100 mb-6 w-fit shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80 mb-1">Rental Price</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-3xl font-extrabold">{formatCurrency(product.price_per_day)}</p>
                      <span className="text-sm font-medium text-blue-600/70">/day</span>
                    </div>
                  </div>
                  
                  {product.description && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Product Description</h3>
                      <p className="text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Table */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 rounded-t-2xl pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Clock className="w-5 h-5 text-indigo-500" />
                Recent Order History
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">Tracking lifecycle for this specific item.</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-400 border-b border-slate-100 font-semibold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoadingAnalytics ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
                      </td>
                    </tr>
                  ) : orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No orders have been placed for this item yet.
                      </td>
                    </tr>
                  ) : (
                    orderItems.slice(0, 10).map((item) => {
                      const order = item.order;
                      if (!order) return null;
                      
                      const statusStyles: Record<string, string> = {
                        pending: "bg-amber-100 text-amber-800 border-amber-200",
                        confirmed: "bg-blue-100 text-blue-800 border-blue-200",
                        ongoing: "bg-emerald-100 text-emerald-800 border-emerald-200",
                        returned: "bg-slate-100 text-slate-700 border-slate-200",
                        cancelled: "bg-red-100 text-red-800 border-red-200"
                      };
                      const statusStyle = statusStyles[order.status.toLowerCase()] || "bg-slate-100 text-slate-700 border-slate-200";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{order.customer?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{order.customer?.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-700 font-medium">{new Date(order.rental_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                            <div className="text-xs text-slate-400 mt-0.5">to {new Date(order.rental_end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">
                            {order.branch?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${statusStyle}`}>
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
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center rounded-b-2xl">
                  <Button variant="link" className="text-indigo-600 font-semibold" onClick={() => router.push(`/dashboard/orders?product_id=${product.id}`)}>
                    View all {orderItems.length} orders →
                  </Button>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="space-y-6">
          
          {/* Branch Breakdown */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Store className="w-5 h-5 text-blue-500" />
                Branch Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInventory ? (
                 <div className="flex justify-center p-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>
              ) : branchInventory.length === 0 ? (
                <div className="text-sm text-slate-400 font-medium text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No inventory allocated.
                </div>
              ) : (
                <div className="space-y-3">
                  {branchInventory.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-sm">
                      <div>
                        <div className="font-bold text-slate-800">{inv.branch?.name || 'Unknown'}</div>
                        <div className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                          {inv.available_quantity <= inv.low_stock_threshold && inv.available_quantity > 0 && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {inv.available_quantity === 0 && (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          Threshold: {inv.low_stock_threshold}
                        </div>
                      </div>
                      <div className="text-right bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className={`text-xl font-black ${inv.available_quantity === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {inv.available_quantity} <span className="text-xs font-bold text-slate-400">/ {inv.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Identifiers */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Tag className="w-5 h-5 text-slate-400" />
                Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="group">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">SKU</div>
                  <div className="font-mono text-sm bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 text-slate-700 font-medium group-hover:bg-slate-100 transition-colors">
                    {product.sku || 'Not assigned'}
                  </div>
                </div>
                <div className="group">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Barcode</div>
                  <div className="font-mono text-sm bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 text-slate-700 font-medium group-hover:bg-slate-100 transition-colors">
                    {product.barcode || 'Not assigned'}
                  </div>
                </div>
                <div className="group">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Database ID</div>
                  <div className="font-mono text-xs bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 text-slate-400 break-all group-hover:text-slate-600 transition-colors">
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
