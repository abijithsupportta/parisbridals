/**
 * Product Hooks
 *
 * Custom React hooks for product operations using TanStack Query.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/products) → service → repository → supabase
 *
 * @module hooks/useProducts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Product, 
  CreateProductDTO, 
  UpdateProductDTO, 
  ProductSearchParams,
  ProductSearchResult,
  ProductWithRelations,
  BulkProductOperation,
  BulkOperationResult
} from '@/domain';
import { useAppStore, useProductStore } from '@/stores';
import { useCallback } from 'react';

const productKeys = {
  all: ['products'] as const,
  detail: (id: string) => ['products', id] as const,
  search: (query: string) => ['products', 'search', query] as const,
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Hook for fetching products with search and filtering
 */
export function useProducts(params: ProductSearchParams = {}) {
  const query = useQuery({
    queryKey: productKeys.all,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const url = `/api/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await apiFetch<{ success: boolean; data: ProductSearchResult }>(url);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    ...query,
    products: query.data?.products || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    totalPages: query.data?.total_pages || 0,
    hasNext: query.data?.has_next || false,
    hasPrev: query.data?.has_prev || false,
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for fetching a single product by ID
 */
export function useProduct(id: string) {
  const query = useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      console.log('Fetching product with ID:', id);
      const response = await apiFetch<{ success: boolean; data: ProductWithRelations }>(`/api/products/${id}`);
      console.log('API response:', response);
      if (!response || !response.data) {
        throw new Error('Invalid response from API');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    product: query.data,
    isLoading: query.isLoading || query.isFetching,
    error: query.error,
  };
}

/**
 * Hook for creating a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();
  const closeCreateModal = useProductStore((state) => state.closeCreateModal);

  const mutation = useMutation({
    mutationFn: (data: CreateProductDTO) =>
      apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (result) => {
      queryClient.refetchQueries({ queryKey: ['products'] });
      showSuccess('Product created successfully');
      closeCreateModal();
    },
    onError: (error) => showError('Failed to create product', error.message),
  });

  return {
    ...mutation,
    createProduct: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for updating an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();
  const closeEditModal = useProductStore((state) => state.closeEditModal);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDTO }) =>
      apiFetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      showSuccess('Product updated successfully');
      closeEditModal();
    },
    onError: (error) => showError('Failed to update product', error.message),
  });

  return {
    ...mutation,
    updateProduct: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for deleting a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();
  const closeDeleteModal = useProductStore((state) => state.closeDeleteModal);

  const mutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: productKeys.all });
      showSuccess('Product deleted successfully');
      closeDeleteModal();
    },
    onError: (error) => showError('Failed to delete product', error.message),
  });

  return {
    ...mutation,
    deleteProduct: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for checking if a product can be deleted
 */
export function useCanDeleteProduct(id: string) {
  const query = useQuery({
    queryKey: ['product-can-delete', id],
    queryFn: () => apiFetch<{ canDelete: boolean; reason?: string }>(`/api/products/${id}/can-delete`),
    enabled: false, // Manual query
  });

  return {
    ...query,
    canDelete: query.data?.canDelete ?? false,
    reason: query.data?.reason,
    checkCanDelete: () => query.refetch(),
  };
}

/**
 * Hook for performing bulk operations on products
 */
export function useBulkProductOperation() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();
  const clearSelection = useProductStore((state) => state.clearSelection);
  const closeBulkDeleteModal = useProductStore((state) => state.closeBulkDeleteModal);

  const mutation = useMutation({
    mutationFn: (operation: BulkProductOperation) =>
      apiFetch<{ success: boolean; data: BulkOperationResult }>('/api/products/bulk', { method: 'POST', body: JSON.stringify(operation) }),
    onSuccess: (result) => {
      queryClient.refetchQueries({ queryKey: productKeys.all });
      if (result.success && result.data) {
        const { successful, failed, total_successful, total_failed } = result.data;
        
        if (total_failed === 0) {
          showSuccess(`Successfully processed ${total_successful} products`);
        } else {
          showError(
            `Processed ${total_successful} products successfully, ${total_failed} failed`
          );
        }
        
        clearSelection();
        closeBulkDeleteModal();
      } else {
        showError('Bulk operation failed');
      }
    },
    onError: (error) => showError('Bulk operation failed', error.message),
  });

  return {
    ...mutation,
    performBulkOperation: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for product form management
 */
export function useProductForm(initialData?: Partial<Product>) {
  const { openCreateModal, openEditModal, currentProduct } = useProductStore();

  const openCreate = useCallback(() => {
    openCreateModal();
  }, [openCreateModal]);

  const openEdit = useCallback((product: Product) => {
    openEditModal(product);
  }, [openEditModal]);

  const isEditing = !!currentProduct;

  return {
    openCreate,
    openEdit,
    isEditing,
    currentProduct,
    initialData,
  };
}

/**
 * Hook for product selection management
 */
export function useProductSelection() {
  const {
    selectedProducts,
    toggleProductSelection,
    selectAll,
    clearSelection,
    isProductSelected,
  } = useProductStore();

  const selectProduct = useCallback((productId: string) => {
    toggleProductSelection(productId);
  }, [toggleProductSelection]);

  const selectAllProducts = useCallback((productIds: string[]) => {
    selectAll(productIds);
  }, [selectAll]);

  const clear = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const isSelected = useCallback((productId: string) => {
    return isProductSelected(productId);
  }, [isProductSelected]);

  const selectedCount = selectedProducts.length;

  return {
    selectedProducts,
    selectedCount,
    selectProduct,
    selectAll,
    clear,
    isSelected,
    hasSelection: selectedCount > 0,
  };
}

