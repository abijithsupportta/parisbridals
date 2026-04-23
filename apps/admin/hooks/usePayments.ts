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
import { paymentService } from '@/services/paymentService';
import { 
  Payment, 
  CreatePaymentDTO, 
  UpdatePaymentDTO,
  PaymentSearchParams 
} from '@/domain/types/payment';
import { queryUtils } from '@/lib/query-client';
import { useAppStore } from '@/stores';

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
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Get all payments
 */
export function usePayments(params: PaymentSearchParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.payments, params],
    queryFn: () => paymentService.getAllPayments(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a single payment by ID
 */
export function usePayment(id: string) {
  return useQuery({
    queryKey: queryKeys.payment(id),
    queryFn: () => paymentService.getPayment(id),
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
    queryFn: () => paymentService.getPaymentsByOrder(orderId),
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
    mutationFn: (data: CreatePaymentDTO) =>
      apiFetch<Payment>('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
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
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentDTO }) => 
      paymentService.updatePayment(id, data),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryUtils.invalidatePayments();
        queryUtils.invalidatePayment(result.data.id);
        showSuccess('Payment updated successfully');
      } else {
        showError('Failed to update payment', result.error?.message);
      }
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
    mutationFn: (id: string) => paymentService.deletePayment(id),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidatePayments();
        showSuccess('Payment deleted successfully');
      } else {
        showError('Failed to delete payment', result.error?.message);
      }
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
