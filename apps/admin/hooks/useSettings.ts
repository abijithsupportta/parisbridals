/**
 * Settings Hooks
 *
 * TanStack Query hooks for settings operations.
 * Operations that mutate go through API routes; read-only ones are
 * acceptable via service since settings don't require auth context.
 *
 * @module hooks/useSettings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';
import { queryUtils } from '@/lib/query-client';
import { useAppStore } from '@/stores';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

// Query keys
const queryKeys = {
  settings: ['settings'] as const,
  gst: ['settings', 'gst'] as const,
  invoicePrefix: ['settings', 'invoice_prefix'] as const,
  paymentTerms: ['settings', 'payment_terms'] as const,
  authorizedSignature: ['settings', 'authorized_signature'] as const,
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
 * Get GST percentage
 */
export function useGSTPercentage() {
  return useQuery({
    queryKey: queryKeys.gst,
    queryFn: () => settingsService.getGSTPercentage(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Update GST percentage
 */
export function useUpdateGSTPercentage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (percentage: number) => settingsService.setGSTPercentage(percentage),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateSettings();
        showSuccess('GST percentage updated successfully');
      } else {
        showError('Failed to update GST percentage', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update GST percentage', error.message);
    },
  });

  return {
    ...mutation,
    updateGSTPercentage: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Check if GST is enabled
 */
export function useIsGSTEnabled() {
  return useQuery({
    queryKey: [...queryKeys.settings, 'is_gst_enabled'],
    queryFn: () => settingsService.getIsGSTEnabled(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Enable or disable GST
 */
export function useUpdateIsGSTEnabled() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (isEnabled: boolean) => settingsService.setIsGSTEnabled(isEnabled),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateSettings();
        showSuccess('GST status updated successfully');
      } else {
        showError('Failed to update GST status', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update GST status', error.message);
    },
  });

  return {
    ...mutation,
    updateIsGSTEnabled: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Get invoice prefix
 */
export function useInvoicePrefix() {
  return useQuery({
    queryKey: queryKeys.invoicePrefix,
    queryFn: () => settingsService.findByKey('invoice_prefix'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get payment terms
 */
export function usePaymentTerms() {
  return useQuery({
    queryKey: queryKeys.paymentTerms,
    queryFn: () => settingsService.findByKey('payment_terms'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get authorized signature
 */
export function useAuthorizedSignature() {
  return useQuery({
    queryKey: queryKeys.authorizedSignature,
    queryFn: () => settingsService.findByKey('authorized_signature'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Update a setting
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      apiFetch<ApiSuccessResponse<{value: string}>>('/api/settings', { method: 'PATCH', body: JSON.stringify({ key, value }) }),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryUtils.invalidateSettings();
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        // Removed showSuccess here to prevent duplicate toasts since page.tsx handles it
      } else {
        showError('Failed to update setting');
      }
    },
    onError: (error) => {
      showError('Failed to update setting', error.message);
    },
  });

  return {
    ...mutation,
    updateSetting: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
