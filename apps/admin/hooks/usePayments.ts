/**
 * Payment Hooks
 *
 * TanStack Query hooks for payment operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/payments) → service → repository → supabase
 *
 * @module hooks/usePayments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Payment, 
  CreatePaymentDTO, 
  UpdatePaymentDTO,
  PaymentSearchParams 
} from '@/domain/types/payment';
import { queryUtils } from '@/lib/query-client';
import { useAppStore } from '@/stores';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

// Query keys
const queryKeys = {
  payments: ['payments'] as const,
  payment: (id: string) => ['payments', id] as const,
  orderPayments: (orderId: string) => ['payments', 'order', orderId] as const,
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
 * Get all payments
 */
export function usePayments(params: PaymentSearchParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.payments, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.order_id) qs.set('order_id', params.order_id);
      if (params.payment_type) qs.set('payment_type', params.payment_type);
      if (params.payment_mode) qs.set('payment_mode', params.payment_mode);
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.offset) qs.set('offset', String(params.offset));
      const response = await apiFetch<ApiSuccessResponse<Payment[]>>(`/api/payments?${qs.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a single payment by ID
 */
export function usePayment(id: string) {
  return useQuery({
    queryKey: queryKeys.payment(id),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Payment>>(`/api/payments/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get all payments for an order
 */
export function useOrderPayments(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orderPayments(orderId),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Payment[]>>(`/api/payments?order_id=${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: async (data: CreatePaymentDTO) => {
      const response = await apiFetch<ApiSuccessResponse<Payment>>('/api/payments', { method: 'POST', body: JSON.stringify(data) });
      return response.data;
    },
    onSuccess: (result) => {
      queryUtils.invalidatePayments();
      if (result.order_id) {
        queryUtils.invalidateOrderPayments(result.order_id);
      }
      showSuccess('Payment recorded successfully');
    },
    onError: (error) => showError('Failed to record payment', error.message),
  });

  return {
    ...mutation,
    createPayment: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Update a payment
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePaymentDTO }) => {
      const response = await apiFetch<ApiSuccessResponse<Payment>>(`/api/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return response.data;
    },
    onSuccess: (result) => {
      queryUtils.invalidatePayments();
      if (result?.id) {
        queryUtils.invalidatePayment(result.id);
      }
      showSuccess('Payment updated successfully');
    },
    onError: (error) => {
      showError('Failed to update payment', error.message);
    },
  });

  return {
    ...mutation,
    updatePayment: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Delete a payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryUtils.invalidatePayments();
      showSuccess('Payment deleted successfully');
    },
    onError: (error) => {
      showError('Failed to delete payment', error.message);
    },
  });

  return {
    ...mutation,
    deletePayment: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
