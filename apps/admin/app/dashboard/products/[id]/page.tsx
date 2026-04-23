"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Package, Tag, Box, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProduct, useDeleteProduct } from "@/hooks";
import { useProductStore, useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import ProductForm from "@/components/admin/products/ProductForm";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { product, isLoading } = useProduct(productId);
  const deleteProduct = useDeleteProduct();
  const { showSuccess, showError } = useAppStore();
  const {
    isEditModalOpen,
    openEditModal,
    closeEditModal,
    isCreateModalOpen,
    closeCreateModal,
  } = useProductStore();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;
    try {
      await deleteProduct.mutateAsync(productId);
      showSuccess("Deleted", "Product deleted successfully");
      router.push("/dashboard/products");
    } catch {
      showError("Error", "Failed to delete product");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Product Not Found</h2>
        <p className="text-slate-500 mb-6">The product you're looking for doesn't exist or has been deleted.</p>
        <Link href="/dashboard/products">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Products</Button>
        </Link>
      </div>
    );
  }

  const primaryImage = product.images?.length
    ? typeof product.images[0] === "string"
      ? product.images[0]
      : (product.images[0] as any)?.url || ""
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <p className="text-sm text-slate-400">{product.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openEditModal(product)}>
            <Edit className="w-4 h-4 mr-2" />Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
            <Trash2 className="w-4 h-4 mr-2" />Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image + Info */}
          <Card className="border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-56 h-56 bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center shrink-0">
                {primaryImage ? (
                  <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-violet-300" />
                )}
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {product.is_featured && (
                    <Badge className="bg-purple-100 text-purple-700">Featured</Badge>
                  )}
                  {product.category?.name && (
                    <Badge className="bg-slate-100 text-slate-700">{product.category.name}</Badge>
                  )}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {product.description || "No description provided."}
                </p>
              </div>
            </div>
          </Card>

          {/* Images Gallery */}
          {product.images && product.images.length > 0 && (
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-700">Product Images</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {product.images.map((img: any, i: number) => {
                    const url = typeof img === "string" ? img : img?.url || "";
                    return (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100">
                        <img src={url} alt={img?.alt_text || product.name} className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Stats */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold text-slate-700">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-slate-900">{formatCurrency(product.price_per_day)}</div>
              <p className="text-xs text-slate-400 mt-1">Rent Amount</p>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Box className="w-4 h-4" /> Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Quantity</span>
                <span className="font-semibold text-slate-800">{product.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Available</span>
                <span className="font-semibold text-slate-800">{product.available_quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Low Stock Alert</span>
                <span className="font-semibold text-slate-800">{product.low_stock_threshold}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Track Inventory</span>
                <Badge className={product.track_inventory ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                  {product.track_inventory ? "Yes" : "No"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Category</span>
                <span className="text-sm font-medium text-slate-800">{product.category?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">SKU</span>
                <span className="text-sm font-mono text-slate-800">{product.sku || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Barcode</span>
                <span className="text-sm font-mono text-slate-800">{product.barcode || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {(isEditModalOpen || isCreateModalOpen) && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => { closeEditModal(); closeCreateModal(); }} />
          <div className="relative z-50 flex items-start justify-center min-h-full p-4 pt-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-semibold text-slate-800">Edit Product</h2>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <ProductForm
                  product={product}
                  onSuccess={() => { closeEditModal(); closeCreateModal(); }}
                  onCancel={() => { closeEditModal(); closeCreateModal(); }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
