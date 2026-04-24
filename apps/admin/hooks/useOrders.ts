/**
 * Order Hooks
 *
 * TanStack Query hooks for order operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/orders) → service → repository → supabase
 *
 * @module hooks/useOrders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services';
import { OrderWithRelations, CreateOrderDTO, UpdateOrderDTO, OrderSearchParams, ReturnOrderDTO } from '@/domain/types/order';
import { useAppStore } from '@/stores';

// Query keys
const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrderSearchParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  history: (id: string) => [...orderKeys.details(), id, 'history'] as const,
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
 * Fetch all orders
 */
export function useOrders(params?: OrderSearchParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderService.getAllOrders(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch a single order by ID
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getOrderById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch order status history
 */
export function useOrderStatusHistory(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: orderKeys.history(id),
    queryFn: () => orderService.getOrderStatusHistory(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateOrderDTO) =>
      apiFetch<{ order: OrderWithRelations }>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      showSuccess('Order created successfully');
    },
    onError: (error) => showError('Failed to create order', error.message),
  });

  return {
    ...mutation,
    createOrder: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Update an existing order
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderDTO }) => 
      orderService.updateOrder(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        queryClient.invalidateQueries({ queryKey: orderKeys.details() });
        showSuccess('Order updated successfully');
      } else {
        showError('Failed to update order', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update order', error.message);
    },
  });

  return {
    ...mutation,
    updateOrder: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Delete an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        queryClient.invalidateQueries({ queryKey: orderKeys.details() });
        showSuccess('Order deleted successfully');
      } else {
        showError('Failed to delete order', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to delete order', error.message);
    },
  });

  return {
    ...mutation,
    deleteOrder: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Count orders
 */
export function useOrderCount(params?: OrderSearchParams) {
  return useQuery({
    queryKey: [...orderKeys.lists(), 'count', params],
    queryFn: () => orderService.countOrders(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Process order return
 */
export function useProcessOrderReturn() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ orderId, returnData }: { orderId: string; returnData: ReturnOrderDTO }) => 
      orderService.processOrderReturn(orderId, returnData),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        queryClient.invalidateQueries({ queryKey: orderKeys.details() });
        showSuccess('Order return processed successfully');
      } else {
        showError('Failed to process order return', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to process order return', error.message);
    },
  });

  return {
    ...mutation,
    processOrderReturn: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Mark deposit as returned
 */
export function useMarkDepositReturned() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (orderId: string) => orderService.markDepositReturned(orderId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        queryClient.invalidateQueries({ queryKey: orderKeys.details() });
        showSuccess('Deposit marked as returned');
      } else {
        showError('Failed to mark deposit as returned', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to mark deposit as returned', error.message);
    },
  });

  return {
    ...mutation,
    markDepositReturned: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
