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
  Category,
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
import type { ApiSuccessResponse } from '@/lib/apiResponse';

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
    throw new Error(body.error?.message || body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Hook for fetching products with search and filtering
 */
export function useProducts(params: ProductSearchParams = {}) {
  const query = useQuery({
    queryKey: [...productKeys.all, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const url = `/api/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await apiFetch<ApiSuccessResponse<ProductSearchResult>>(url);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (prev) => prev, // Keep old data visible while loading new results
  });

  return {
    ...query,
    products: query.data?.products || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    totalPages: query.data?.total_pages || 0,
    hasNext: query.data?.has_next || false,
    hasPrev: query.data?.has_prev || false,
    isLoading: query.isLoading, // true only on first load, not background refetches
    isFetching: query.isFetching, // true during any fetch (for subtle indicators)
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
      const response = await apiFetch<ApiSuccessResponse<ProductWithRelations>>(`/api/products/${id}`);
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
  const { showError, showSuccess } = useAppStore();
  const closeCreateModal = useProductStore((state) => state.closeCreateModal);

  const mutation = useMutation({
    mutationFn: (data: CreateProductDTO) =>
      apiFetch<ApiSuccessResponse<ProductWithRelations>>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onMutate: async (newProduct) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      // Snapshot the previous value
      const previousQueries = queryClient.getQueriesData<ProductSearchResult>({ queryKey: productKeys.all });

      // Optimistically update the list
      queryClient.setQueriesData<ProductSearchResult>({ queryKey: productKeys.all }, (old) => {
        // Guard: If no cached data exists (e.g., user navigated directly
        // to /create without visiting the product list first), skip the
        // optimistic update entirely. The onSettled invalidation will
        // fetch the real data when the mutation completes.
        if (!old || !Array.isArray(old.products)) return old;

        // Hydrate category relation from the categories cache.
        // The form only sends category_id (a UUID), but the product
        // list renders product.category.name. Without this lookup,
        // the optimistic product shows "Uncategorized" until the
        // server response replaces it with the real SQL JOIN data.
        let category: { id: string; name: string; slug: string } | undefined;
        if (newProduct.category_id) {
          const cachedCategories = queryClient.getQueryData<{ success: boolean; data: Category[] }>(['categories']);
          if (cachedCategories?.data) {
            const found = cachedCategories.data.find(c => c.id === newProduct.category_id);
            if (found) {
              category = { id: found.id, name: found.name, slug: found.slug };
            }
          }
        }

        const optimisticId = `temp-${Date.now()}`;
        const optimisticProduct = {
           id: optimisticId,
           ...newProduct,
           category,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           is_active: newProduct.is_active ?? true,
        } as unknown as Product;

        return {
          ...old,
          products: [optimisticProduct, ...old.products],
          total: old.total + 1,
        };
      });

      return { previousQueries };
    },
    onSuccess: (res) => {
      showSuccess('Product created successfully');
      // The actual product from DB will replace the optimistic one
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] });
      closeCreateModal();
    },
    onError: (error, newProduct, context) => {
      // Rollback on failure — restore the snapshot taken in onMutate
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      // NOTE: We do NOT call showError() here because this hook exposes
      // mutateAsync (which re-throws). The calling code (ProductForm)
      // catches the error and shows its own notification. Calling
      // showError() here too would produce duplicate error bars.
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    }
  });

  return {
    ...mutation,
    createProduct: mutation.mutateAsync, // Expose mutateAsync for the form
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for updating an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useAppStore();
  const closeEditModal = useProductStore((state) => state.closeEditModal);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDTO }) =>
      apiFetch<ApiSuccessResponse<ProductWithRelations>>(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      await queryClient.cancelQueries({ queryKey: productKeys.detail(id) });

      const previousQueries = queryClient.getQueriesData<ProductSearchResult>({ queryKey: productKeys.all });
      const previousDetail = queryClient.getQueryData<ProductWithRelations>(productKeys.detail(id));

      // Optimistically update the list
      queryClient.setQueriesData<ProductSearchResult>({ queryKey: productKeys.all }, (old) => {
        if (!old || !Array.isArray(old.products)) return old;
        return {
          ...old,
          products: old.products.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } as Product : p),
        };
      });

      // Optimistically update detail view
      queryClient.setQueryData<ProductWithRelations>(productKeys.detail(id), (old) => {
        if (!old) return old;
        return {
          ...old,
          ...data,
          updated_at: new Date().toISOString()
        } as ProductWithRelations;
      });

      return { previousQueries, previousDetail, id };
    },
    onSuccess: (res, variables) => {
      showSuccess('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] });
      closeEditModal();
    },
    onError: (error, variables, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousDetail && context.id) {
        queryClient.setQueryData(productKeys.detail(context.id), context.previousDetail);
      }
      // No showError here — mutateAsync re-throws to the form's catch block
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    }
  });

  return {
    ...mutation,
    updateProduct: mutation.mutateAsync, // Expose mutateAsync
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
    mutationFn: async (id: string) => {
      // Delete product images from R2 in background
      try {
        const cached = queryClient.getQueriesData<ProductSearchResult>({ queryKey: productKeys.all });
        for (const [, data] of cached) {
          const prod = data?.products?.find((p: Product) => p.id === id);
          if (prod?.images && Array.isArray(prod.images)) {
            // Fire-and-forget image cleanup from R2
            for (const img of prod.images) {
              const url = typeof img === 'string' ? img : img.url;
              if (url) {
                fetch('/api/upload/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url }),
                }).catch(() => {}); // best effort
              }
            }
            break;
          }
        }
      } catch { /* best effort */ }

      return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    },
    onMutate: async (id: string) => {
      // Cancel ongoing product queries to prevent overwrites
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      // Snapshot all product query caches
      const previousQueries = queryClient.getQueriesData<ProductSearchResult>({ queryKey: productKeys.all });

      // Optimistically remove the product from ALL cached query results
      queryClient.setQueriesData<ProductSearchResult>(
        { queryKey: productKeys.all },
        (old) => {
          if (!old || !Array.isArray(old.products)) return old;
          return {
            ...old,
            products: old.products.filter((p: Product) => p.id !== id),
            total: old.total - 1,
          };
        }
      );

      return { previousQueries };
    },
    onSuccess: () => {
      // Also remove branch inventory cache
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] });
      showSuccess('Product deleted successfully');
      closeDeleteModal();
    },
    onError: (error, _id, context) => {
      // Rollback on failure
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      showError('Failed to delete product', error.message);
    },
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
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<{ canDelete: boolean; reason?: string }>>(`/api/products/${id}/can-delete`);
      return response.data;
    },
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
      apiFetch<ApiSuccessResponse<BulkOperationResult>>('/api/products/bulk', { method: 'POST', body: JSON.stringify(operation) }),
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

/**
 * Hook for looking up a product by barcode.
 * Used by BarcodeScanner and USB/keyboard scanner in order forms.
 */
export function useLookupProductByBarcode() {
  const { showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await fetch(`/api/products/by-barcode?code=${encodeURIComponent(barcode)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Product not available');
      }
      const json = await res.json();
      return json.data as ProductWithRelations;
    },
    onError: (error) => {
      showError('Barcode Lookup', error.message || 'Product not available');
    },
  });

  return {
    ...mutation,
    lookupByBarcode: mutation.mutateAsync,
    isLooking: mutation.isPending,
  };
}

