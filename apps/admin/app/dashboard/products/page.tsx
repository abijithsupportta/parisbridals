/**
 * Products Page - Enhanced with New Architecture
 *
 * Modern product management page using TanStack Query, Zustand,
 * and the new layered architecture.
 *
 * @module app/dashboard/products/page
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, Trash2, Edit, Eye, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useProducts, 
  useProductSearch, 
  useDeleteProduct,
  useProductForm,
  useProductSelection,
  useBulkProductOperation
} from "@/hooks";
import { useProductStore, useAppStore } from "@/stores";
import ProductForm from "@/components/admin/products/ProductForm";
import { formatCurrency } from '@/lib/shared-utils';
import { downloadBarcode, downloadMultipleBarcodes } from '@/lib/barcode';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const { 
    products, 
    total, 
    page, 
    totalPages, 
    hasNext, 
    hasPrev, 
    isLoading 
  } = useProducts({ 
    query: searchQuery,
    limit: 20
  });

  const { searchResults } = useProductSearch(searchQuery, searchQuery.length > 2);
  const deleteProduct = useDeleteProduct();
  const { openCreate, openEdit, isEditing, currentProduct } = useProductForm();
  const { 
    selectedProducts, 
    selectedCount, 
    selectProduct, 
    selectAll, 
    clear, 
    isSelected 
  } = useProductSelection();
  const { 
    openCreateModal, 
    closeCreateModal,
    closeEditModal,
    openDeleteModal, 
    isDeleteModalOpen, 
    isCreateModalOpen,
    isEditModalOpen,
    currentProduct: deleteTarget 
  } = useProductStore();
  const { showSuccess, showError } = useAppStore();
  
  const bulkOperation = useBulkProductOperation();

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleEdit = (product: any) => {
    openEdit(product);
  };

  const handleDelete = (product: any) => {
    openDeleteModal(product);
    // Set delete target in store
  };

  const handleSelectAll = () => {
    if (selectedCount === products.length) {
      clear();
    } else {
      const productIds = products.map(p => p.id);
      selectAll(productIds);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCount} product(s)? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const result = await bulkOperation.performBulkOperation({
        product_ids: selectedProducts,
        operation: 'delete',
      });
      
      if (result.success) {
        showSuccess('Bulk Delete Success', `${selectedCount} product(s) deleted successfully`);
        clear();
      } else {
        showError('Bulk Delete Error', result.error?.message || 'Failed to delete products');
      }
    } catch (error) {
      showError('Bulk Delete Error', 'An unexpected error occurred while deleting products');
    }
  };

  const handleDownloadBarcode = (product: any) => {
    if (product.barcode) {
      downloadBarcode(product.barcode, product.name);
    } else {
      showError('No Barcode', 'This product does not have a barcode assigned.');
    }
  };

  const handleBulkDownloadBarcodes = async () => {
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id) && p.barcode);
    
    if (selectedProductsData.length === 0) {
      showError('No Barcodes', 'No selected products have barcodes assigned.');
      return;
    }
    
    try {
      await downloadMultipleBarcodes(
        selectedProductsData.map(p => ({ 
          barcode: p.barcode!, 
          name: p.name 
        }))
      );
      showSuccess('Success', `Downloaded ${selectedProductsData.length} barcodes`);
    } catch (error) {
      showError('Download Error', 'Failed to download barcodes');
    }
  };

  const handleBulkActivate = async () => {
    if (selectedCount === 0) return;
    
    try {
      const result = await bulkOperation.performBulkOperation({
        product_ids: selectedProducts,
        operation: 'activate'
      });
      
      if (result.success) {
        showSuccess('Bulk Activate Successful', `${result.data?.successful?.length || 0} product(s) activated successfully`);
        clear();
      } else {
        showError('Bulk Activate Failed', result.error?.message || 'Failed to activate products');
      }
    } catch (error) {
      showError('Bulk Activate Error', 'An unexpected error occurred while activating products');
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedCount === 0) return;
    
    try {
      const result = await bulkOperation.performBulkOperation({
        product_ids: selectedProducts,
        operation: 'deactivate'
      });
      
      if (result.success) {
        showSuccess('Bulk Deactivate Successful', `${result.data?.successful?.length || 0} product(s) deactivated successfully`);
        clear();
      } else {
        showError('Bulk Deactivate Failed', result.error?.message || 'Failed to deactivate products');
      }
    } catch (error) {
      showError('Bulk Deactivate Error', 'An unexpected error occurred while deactivating products');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">
            Manage your jewellery inventory ({total} products)
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-10 bg-slate-50 border-slate-200 focus:border-primary"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="border-slate-200"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleBulkActivate}
                  disabled={bulkOperation.isPending}
                >
                  Activate
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleBulkDeactivate}
                  disabled={bulkOperation.isPending}
                >
                  Deactivate
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleBulkDownloadBarcodes}
                  disabled={bulkOperation.isPending}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Barcodes
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkOperation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={clear}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-slate-500 mt-2">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">
                {searchQuery 
                  ? `No products found for "${searchQuery}"`
                  : "No products found. Click \"Add Product\" to create your first product."
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedCount === products.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left p-4 font-semibold text-slate-700">Product</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Category</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Rent</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Stock</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr 
                    key={product.id} 
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      isSelected(product.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected(product.id)}
                        onChange={() => selectProduct(product.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="p-4">
                      <Link href={`/dashboard/products/${product.id}`} className="flex items-center gap-3 group">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url || ''} 
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-violet-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">{product.name}</p>
                          <p className="text-xs text-slate-400">{product.slug}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-800 font-semibold">
                      {formatCurrency(product.price_per_day)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium">{product.quantity}</span>
                        {product.available_quantity <= product.low_stock_threshold && (
                          <Badge variant="destructive" className="text-xs">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Badge className={product.is_active 
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.is_featured && (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                        </Link>
                        <button 
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={() => handleEdit(product)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button 
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(product)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} products
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={!hasPrev}
              onClick={() => {/* TODO: Implement pagination */}}
            >
              Previous
            </Button>
            <span className="px-3 py-1 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              disabled={!hasNext}
              onClick={() => {/* TODO: Implement pagination */}}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {(isCreateModalOpen || isEditModalOpen || isEditing || currentProduct) && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => { closeCreateModal(); closeEditModal(); }} />
          <div className="relative z-50 flex items-start justify-center min-h-full p-4 pt-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-semibold text-slate-800">
                  {isEditing ? 'Edit Product' : 'Create Product'}
                </h2>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <ProductForm 
                  product={currentProduct || undefined}
                  onSuccess={() => { closeCreateModal(); closeEditModal(); }}
                  onCancel={() => { closeCreateModal(); closeEditModal(); }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
