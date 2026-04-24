/**
 * Banner Hooks - Optimized with API Routes
 *
 * TanStack Query hooks for banner operations.
 *
 * @module hooks/useBanners
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banner, CreateBannerDTO, UpdateBannerDTO, BannerSearchParams } from '@/domain';
import { useAppStore } from '@/stores';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

// Query keys
const bannerKeys = {
  all: ['banners'] as const,
  detail: (id: string) => ['banners', id] as const,
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
 * Fetch all banners
 */
export function useBanners(params?: BannerSearchParams) {
  return useQuery({
    queryKey: bannerKeys.all,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Banner[]>>('/api/banners');
      return response.data || [];
    },
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch when component mounts
  });
}

/**
 * Fetch a single banner by ID
 */
export function useBanner(id: string) {
  return useQuery({
    queryKey: bannerKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Banner>>(`/api/banners/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Create a new banner
 */
export function useCreateBanner() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (data: CreateBannerDTO) =>
      apiFetch<ApiSuccessResponse<Banner>>('/api/banners', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async (result) => {
      // Optimistically update cache with new banner
      queryClient.setQueryData(bannerKeys.all, (old: Banner[] = []) => {
        return [result.data, ...old];
      });
      showSuccess('Banner created successfully');
    },
    onError: (error) => {
      showError('Failed to create banner', error.message);
    },
  });
}

/**
 * Update an existing banner
 */
export function useUpdateBanner() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBannerDTO }) =>
      apiFetch<ApiSuccessResponse<Banner>>(`/api/banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: async (result, variables) => {
      // Optimistically update cache
      queryClient.setQueryData(bannerKeys.all, (old: Banner[] = []) => {
        return old.map(banner => banner.id === variables.id ? result.data : banner);
      });
      queryClient.setQueryData(bannerKeys.detail(variables.id), result.data);
      showSuccess('Banner updated successfully');
    },
    onError: (error) => {
      showError('Failed to update banner', error.message);
    },
  });
}

/**
 * Delete a banner
 */
export function useDeleteBanner() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/banners/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      // Optimistically remove from cache
      queryClient.setQueryData(bannerKeys.all, (old: Banner[] = []) => {
        return old.filter(banner => banner.id !== id);
      });
      showSuccess('Banner deleted successfully');
    },
    onError: (error) => {
      showError('Failed to delete banner', error.message);
    },
  });
}

/**
 * Reorder banners
 */
export function useReorderBanners() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (banners: { id: string; priority: number }[]) =>
      apiFetch('/api/banners/reorder', { method: 'POST', body: JSON.stringify({ banners }) }),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: bannerKeys.all });
      const previousBanners = queryClient.getQueryData<Banner[]>(bannerKeys.all);
      
      // Optimistically update
      if (previousBanners) {
        const reordered = [...previousBanners].sort((a, b) => {
          const aPriority = newOrder.find(o => o.id === a.id)?.priority ?? a.priority;
          const bPriority = newOrder.find(o => o.id === b.id)?.priority ?? b.priority;
          return bPriority - aPriority;
        });
        queryClient.setQueryData(bannerKeys.all, reordered);
      }
      
      return { previousBanners };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bannerKeys.all, exact: true });
      showSuccess('Banner order updated');
    },
    onError: (error, _variables, context) => {
      if (context?.previousBanners) {
        queryClient.setQueryData(bannerKeys.all, context.previousBanners);
      }
      showError('Failed to reorder banners', error.message);
    },
  });
}
