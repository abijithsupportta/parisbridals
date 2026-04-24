/**
 * Banner Hooks
 *
 * TanStack Query hooks for banner operations.
 *
 * @module hooks/useBanners
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannerService } from '@/services';
import { Banner, CreateBannerDTO, UpdateBannerDTO, BannerSearchParams } from '@/domain';
import { useAppStore } from '@/stores';

// Query keys
const bannerKeys = {
  all: ['banners'] as const,
  lists: () => [...bannerKeys.all, 'list'] as const,
  list: (params?: BannerSearchParams) => [...bannerKeys.lists(), params] as const,
  details: () => [...bannerKeys.all, 'detail'] as const,
  detail: (id: string) => [...bannerKeys.details(), id] as const,
};

/**
 * Fetch all banners
 */
export function useBanners(params?: BannerSearchParams) {
  return useQuery({
    queryKey: bannerKeys.list(params),
    queryFn: () => bannerService.getAllBanners(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch a single banner by ID
 */
export function useBanner(id: string) {
  return useQuery({
    queryKey: bannerKeys.detail(id),
    queryFn: () => bannerService.getBannerById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new banner
 */
export function useCreateBanner() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateBannerDTO) => bannerService.createBanner(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
        showSuccess('Banner created successfully');
      } else {
        showError('Failed to create banner', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to create banner', error.message);
    },
  });

  return {
    ...mutation,
    createBanner: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Update an existing banner
 */
export function useUpdateBanner() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBannerDTO }) => 
      bannerService.updateBanner(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
        queryClient.invalidateQueries({ queryKey: bannerKeys.details() });
        showSuccess('Banner updated successfully');
      } else {
        showError('Failed to update banner', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update banner', error.message);
    },
  });

  return {
    ...mutation,
    updateBanner: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Delete a banner
 */
export function useDeleteBanner() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (id: string) => bannerService.deleteBanner(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
        queryClient.invalidateQueries({ queryKey: bannerKeys.details() });
        showSuccess('Banner deleted successfully');
      } else {
        showError('Failed to delete banner', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to delete banner', error.message);
    },
  });

  return {
    ...mutation,
    deleteBanner: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Count banners
 */
export function useBannerCount(params?: BannerSearchParams) {
  return useQuery({
    queryKey: [...bannerKeys.lists(), 'count', params],
    queryFn: () => bannerService.countBanners(params),
    staleTime: 5 * 60 * 1000,
  });
}
