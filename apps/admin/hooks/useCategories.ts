/**
 * Category Hooks
 *
 * Custom React hooks for category operations using TanStack Query.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/categories) → service → repository → supabase
 *
 * @module hooks/useCategories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryWithRelations,
} from '@/domain';
import { useAppStore } from '@/stores';
import { useCallback } from 'react';
import type { ApiSuccessResponse } from '@/lib/apiResponse';
import { queryKeys } from '@/lib/query-client';

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
 * Hook for fetching all categories
 *
 * isLoading = true only on the initial load (no cached data).
 * isFetching = true during any background refetch (e.g., after invalidation).
 * The page should show shimmer ONLY when isLoading is true, NOT when isFetching.
 */
export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Category[]>>('/api/categories');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    categories: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

/**
 * Hook for fetching a single category by ID
 */
export function useCategory(id: string) {
  const query = useQuery({
    queryKey: queryKeys.category(id),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Category>>(`/api/categories/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    category: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

/**
 * Hook for fetching category children
 */
export function useCategoryChildren(parentId: string) {
  const query = useQuery({
    queryKey: queryKeys.categoryChildren(parentId),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<{ children: Category[]; parent: Category; level: string }>>(`/api/categories/${parentId}/children`);
      return response.data.children;
    },
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    children: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

/**
 * Hook for creating a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateCategoryDTO) =>
      apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      showSuccess('Category created successfully');
    },
    onError: (error) => showError('Failed to create category', error.message),
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
      apiFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.category(variables.id) });
      showSuccess('Category updated successfully');
    },
    onError: (error) => showError('Failed to update category', error.message),
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
    mutationFn: (id: string) =>
      apiFetch(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      showSuccess('Category deleted successfully');
    },
    onError: (error) => showError('Failed to delete category', error.message),
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
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<{ canDelete: boolean; reason?: string }>>(`/api/categories/${id}/can-delete`);
      return response.data;
    },
    enabled: !!id,
  });

  return {
    ...query,
    canDelete: query.data?.canDelete ?? false,
    reason: query.data?.reason,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

/**
 * Hook for category search
 */
export function useCategorySearch(query: string, enabled: boolean = true) {
  const { categories } = useCategories();
  if (!enabled) {
    return {
      filteredCategories: [],
      isLoading: false,
    };
  }

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
  const { categories } = useCategories();

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

  const categoryTree = buildTree(categories);

  return {
    categoryTree,
    categories,
    buildTree,
  };
}
