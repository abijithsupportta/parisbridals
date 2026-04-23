/**
 * Product Hooks
 *
 * Custom React hooks for product operations using TanStack Query.
 * Provides a clean interface between components and the service layer.
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
import { productService } from '@/services';
import { queryKeys, queryUtils } from '@/lib/query-client';
import { useAppStore, useProductStore } from '@/stores';
import { useCallback } from 'react';

/**
 * Hook for fetching products with search and filtering
 */
export function useProducts(params: ProductSearchParams = {}) {
  const query = useQuery({
    queryKey: [...queryKeys.products, params],
    queryFn: () => productService.getProducts(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (result) => result.data,
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
    queryKey: queryKeys.product(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (result) => result.data,
  });

  return {
    ...query,
    product: query.data,
    isLoading: query.isLoading || query.isFetching,
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
    mutationFn: (data: CreateProductDTO) => productService.createProduct(data),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateProducts();
        showSuccess('Product created successfully');
        closeCreateModal();
      } else {
        showError('Failed to create product', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to create product', error.message);
    },
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
      productService.updateProduct(id, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryUtils.invalidateProduct(variables.id);
        showSuccess('Product updated successfully');
        closeEditModal();
      } else {
        showError('Failed to update product', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update product', error.message);
    },
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
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateProducts();
        showSuccess('Product deleted successfully');
        closeDeleteModal();
      } else {
        showError('Failed to delete product', result.error?.message);
      }
    },
    onError: (error) => {
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
    queryFn: () => productService.deleteProduct(id), // This will check canDelete internally
    enabled: false, // Manual query
    select: (result) => {
      if (!result.success) {
        return { canDelete: false, reason: result.error?.message };
      }
      return { canDelete: true };
    },
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
      productService.performBulkOperation(operation),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateProducts();
        const { successful, failed, total_successful, total_failed } = result.data!;
        
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
        showError('Bulk operation failed', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Bulk operation failed', error.message);
    },
  });

  return {
    ...mutation,
    performBulkOperation: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for searching products
 */
export function useProductSearch(query: string, enabled: boolean = true) {
  const searchQuery = useQuery({
    queryKey: queryKeys.productsSearch(query),
    queryFn: () => productService.searchProducts(query, 10),
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    select: (result) => result.data,
  });

  return {
    ...searchQuery,
    searchResults: searchQuery.data || [],
    isLoading: searchQuery.isLoading || searchQuery.isFetching,
  };
}

/**
 * Hook for getting featured products
 */
export function useFeaturedProducts(limit: number = 10) {
  const query = useQuery({
    queryKey: ['products-featured', limit],
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (result) => result.data,
  });

  return {
    ...query,
    featuredProducts: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for getting low stock products
 */
export function useLowStockProducts() {
  const query = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: () => productService.getLowStockProducts(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (result) => result.data,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    ...query,
    lowStockProducts: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for updating product inventory
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ productId, availableQuantity }: { 
      productId: string; 
      availableQuantity: number 
    }) => productService.updateInventory(productId, availableQuantity),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryUtils.invalidateProduct(variables.productId);
        showSuccess('Inventory updated successfully');
      } else {
        showError('Failed to update inventory', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update inventory', error.message);
    },
  });

  return {
    ...mutation,
    updateInventory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for cloning a product
 */
export function useCloneProduct() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) => 
      productService.cloneProduct(id, newName),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateProducts();
        showSuccess('Product cloned successfully');
      } else {
        showError('Failed to clone product', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to clone product', error.message);
    },
  });

  return {
    ...mutation,
    cloneProduct: mutation.mutate,
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

