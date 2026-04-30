/**
 * Banner Hooks - Optimized with API Routes
 *
 * TanStack Query hooks for banner operations.
 *
 * @module hooks/useBanners
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banner, CreateBannerDTO, UpdateBannerDTO, BannerSearchParams, BannerType } from '@/domain';
import { useAppStore } from '@/stores';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

// Query keys
const bannerKeys = {
  all: ['banners'] as const,
  detail: (id: string) => ['banners', id] as const,
  counts: ['banners', 'counts'] as const,
  remainingSlots: ['banners', 'remaining-slots'] as const,
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
  const queryParams = new URLSearchParams();
  if (params?.is_active !== undefined) queryParams.set('is_active', params.is_active.toString());
  if (params?.redirect_type) queryParams.set('redirect_type', params.redirect_type);
  if (params?.banner_type) queryParams.set('banner_type', params.banner_type);
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/api/banners?${queryString}` : '/api/banners';

  return useQuery({
    queryKey: [...bannerKeys.all, params],
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Banner[]>>(url);
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
    onSuccess: async () => {
      // Invalidate all banner queries to refresh list and counts
      queryClient.invalidateQueries({ queryKey: bannerKeys.all });
      queryClient.invalidateQueries({ queryKey: bannerKeys.counts });
      queryClient.invalidateQueries({ queryKey: bannerKeys.remainingSlots });
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
      // Invalidate all banner queries to refresh list and counts
      queryClient.invalidateQueries({ queryKey: bannerKeys.all });
      queryClient.invalidateQueries({ queryKey: bannerKeys.counts });
      queryClient.invalidateQueries({ queryKey: bannerKeys.remainingSlots });
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
      apiFetch<ApiSuccessResponse<null>>(`/api/banners/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      // Invalidate all banner queries to refresh list and counts
      queryClient.invalidateQueries({ queryKey: bannerKeys.all });
      queryClient.invalidateQueries({ queryKey: bannerKeys.counts });
      queryClient.invalidateQueries({ queryKey: bannerKeys.remainingSlots });
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
    mutationFn: (banners: { id: string; priority?: number; position?: string }[]) =>
      apiFetch<ApiSuccessResponse<null>>('/api/banners/reorder', { method: 'POST', body: JSON.stringify({ banners }) }),
    onMutate: async (newOrder) => {
      // Cancel any in-flight banner queries
      await queryClient.cancelQueries({ queryKey: bannerKeys.all });

      // Snapshot all banner query caches for rollback
      const previousQueries = queryClient.getQueriesData<Banner[]>({ queryKey: bannerKeys.all });

      // Optimistically update ALL banner query caches that contain these items
      queryClient.setQueriesData<Banner[]>({ queryKey: bannerKeys.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((banner) => {
          const update = newOrder.find((o) => o.id === banner.id);
          if (update) {
            return {
              ...banner,
              position: update.position ?? banner.position,
              priority: update.priority ?? banner.priority,
            };
          }
          return banner;
        }).sort((a, b) => {
          // Sort by position (numeric) for hero banners
          const posA = a.position ? parseInt(a.position) : 999;
          const posB = b.position ? parseInt(b.position) : 999;
          if (posA !== posB) return posA - posB;
          return (b.priority || 0) - (a.priority || 0);
        });
      });

      return { previousQueries };
    },
    onSuccess: () => {
      // Invalidate all banner queries (prefix match, not exact)
      queryClient.invalidateQueries({ queryKey: bannerKeys.all });
      showSuccess('Banner order updated');
    },
    onError: (error, _variables, context) => {
      // Rollback all cached queries
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      showError('Failed to reorder banners', error.message);
    },
  });
}

/**
 * Fetch banner counts by type
 */
export function useBannerCounts() {
  return useQuery({
    queryKey: bannerKeys.counts,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Record<BannerType, number>>>('/api/banners/counts');
      return response.data || { hero: 0, editorial: 0, split: 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch remaining slots for each banner type
 */
export function useRemainingSlots() {
  return useQuery({
    queryKey: bannerKeys.remainingSlots,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Record<BannerType, number>>>('/api/banners/remaining-slots');
      return response.data || { hero: 10, editorial: 1, split: 2 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
