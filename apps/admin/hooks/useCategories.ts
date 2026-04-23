/**
 * Category Hooks
 *
 * Custom React hooks for category operations using TanStack Query.
 *
 * @module hooks/useCategories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Category, 
  CreateCategoryDTO, 
  UpdateCategoryDTO,
  CategoryWithRelations,
  CategoryHierarchy
} from '@/domain';
import { categoryService } from '@/services';
import { queryKeys, queryUtils } from '@/lib/query-client';
import { useAppStore } from '@/stores';
import { useCallback } from 'react';

/**
 * Hook for fetching all categories
 */
export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoryService.getAllCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (result) => result.data,
  });

  return {
    ...query,
    categories: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for fetching category hierarchy
 */
export function useCategoryHierarchy() {
  const query = useQuery({
    queryKey: ['categories-hierarchy'],
    queryFn: () => categoryService.getCategoryHierarchy(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (result) => result.data,
  });

  return {
    ...query,
    hierarchy: query.data || { mains: [], subs: [], variants: [] },
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for fetching a single category by ID
 */
export function useCategory(id: string) {
  const query = useQuery({
    queryKey: queryKeys.category(id),
    queryFn: () => categoryService.getCategoryById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (result) => result.data,
  });

  return {
    ...query,
    category: query.data,
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for fetching category children
 */
export function useCategoryChildren(parentId: string) {
  const query = useQuery({
    queryKey: queryKeys.categoryChildren(parentId),
    queryFn: () => categoryService.getCategoryChildren(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (result) => result.data,
  });

  return {
    ...query,
    children: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for creating a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateCategoryDTO) => categoryService.createCategory(data),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateCategories();
        showSuccess('Category created successfully');
      } else {
        showError('Failed to create category', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to create category', error.message);
    },
  });

  return {
    ...mutation,
    createCategory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for updating an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDTO }) => 
      categoryService.updateCategory(id, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryUtils.invalidateCategories();
        queryClient.invalidateQueries({
        queryKey: queryKeys.category(variables.id),
      });
        showSuccess('Category updated successfully');
      } else {
        showError('Failed to update category', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update category', error.message);
    },
  });

  return {
    ...mutation,
    updateCategory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for deleting a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateCategories();
        showSuccess('Category deleted successfully');
      } else {
        showError('Failed to delete category', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to delete category', error.message);
    },
  });

  return {
    ...mutation,
    deleteCategory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for checking if a category can be deleted
 */
export function useCanDeleteCategory(id: string) {
  const query = useQuery({
    queryKey: ['category-can-delete', id],
    queryFn: () => categoryService.canDeleteCategory(id),
    enabled: !!id,
    select: (result) => result.data,
  });

  return {
    ...query,
    canDelete: query.data?.canDelete ?? false,
    reason: query.data?.reason,
    relatedData: query.data?.relatedData,
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for moving category to new parent
 */
export function useMoveCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, newParentId }: { id: string; newParentId: string | null }) => 
      categoryService.moveCategory(id, newParentId),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateCategories();
        showSuccess('Category moved successfully');
      } else {
        showError('Failed to move category', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to move category', error.message);
    },
  });

  return {
    ...mutation,
    moveCategory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for reordering categories
 */
export function useReorderCategories() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (categoryIds: string[]) => categoryService.reorderCategories(categoryIds),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateCategories();
        showSuccess('Categories reordered successfully');
      } else {
        showError('Failed to reorder categories', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to reorder categories', error.message);
    },
  });

  return {
    ...mutation,
    reorderCategories: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for getting category product count
 */
export function useCategoryProductCount(id: string) {
  const query = useQuery({
    queryKey: ['category-product-count', id],
    queryFn: () => categoryService.getCategoryProductCount(id),
    enabled: !!id,
    select: (result) => result.data,
  });

  return {
    ...query,
    productCount: query.data || 0,
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for category search
 */
export function useCategorySearch(query: string, enabled: boolean = true) {
  const { categories } = useCategories();
  
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(query.toLowerCase()) ||
    category.slug.toLowerCase().includes(query.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(query.toLowerCase()))
  );

  return {
    filteredCategories,
    isLoading: false,
  };
}

/**
 * Hook for category tree management
 */
export function useCategoryTree() {
  const { hierarchy } = useCategoryHierarchy();
  
  const buildTree = useCallback((categories: Category[]) => {
    interface CategoryNode extends Category {
      children: CategoryNode[];
    }
    
    const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, children: [] } as CategoryNode]));
    const roots: CategoryNode[] = [];

    categories.forEach(category => {
      const node = categoryMap.get(category.id);
      if (category.parent_id && categoryMap.has(category.parent_id)) {
        const parent = categoryMap.get(category.parent_id);
        if (parent && node) {
          parent.children.push(node);
        }
      } else {
        if (node) {
          roots.push(node);
        }
      }
    });

    return roots;
  }, []);

  // Handle both array and object hierarchy formats
    const allCategories = Array.isArray(hierarchy) 
      ? hierarchy 
      : [...(hierarchy.mains || []), ...(hierarchy.subs || []), ...(hierarchy.variants || [])];
    
    const categoryTree = buildTree(allCategories);

  return {
    categoryTree,
    hierarchy,
    buildTree,
  };
}
