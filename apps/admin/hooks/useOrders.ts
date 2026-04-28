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

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { OrderWithRelations, CreateOrderDTO, UpdateOrderDTO, OrderSearchParams, ReturnOrderDTO, OrderStatusHistory } from '@/domain/types/order';
import { useAppStore } from '@/stores';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/apiResponse';

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
    let errorMessage = body.error?.message || body.error || `Request failed (${res.status})`;
    if (body.error?.details) {
      errorMessage += `: ${JSON.stringify(body.error.details)}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta?: PaginationMeta;
  // Backwards compat — these are now in meta
  total?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  error?: any;
}

/**
 * Fetch all orders
 */
export function useOrders(params?: OrderSearchParams & { page?: number; limit?: number }) {
  return useQuery<PaginatedResponse<OrderWithRelations>>({
    queryKey: orderKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.customer_id) searchParams.append('customer_id', params.customer_id);
      if (params?.branch_id) searchParams.append('branch_id', params.branch_id);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.query) searchParams.append('query', params.query);
      if (params?.date_filter) searchParams.append('date_filter', params.date_filter);
      if (params?.date_from) searchParams.append('date_from', params.date_from);
      if (params?.date_to) searchParams.append('date_to', params.date_to);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      
      const queryString = searchParams.toString();
      const url = `/api/orders${queryString ? `?${queryString}` : ''}`;
      
      const raw = await apiFetch<ApiSuccessResponse<OrderWithRelations[]> & { meta?: PaginationMeta }>(url);

      // Normalise to the shape the UI expects
      return {
        success: raw.success,
        data: raw.data,
        total: raw.meta?.total ?? 0,
        totalPages: raw.meta?.totalPages ?? 0,
        page: raw.meta?.page ?? 1,
        limit: raw.meta?.limit ?? 25,
        hasNext: raw.meta?.hasNext ?? false,
        hasPrev: raw.meta?.hasPrev ?? false,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 0, // Always treat as stale so navigating back from create/edit refetches
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always',
  });
}

/**
 * Fetch a single order by ID
 */
export function useOrder(id: string) {
  return useQuery<{ success: boolean; data?: OrderWithRelations; error?: any }>({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const res = await apiFetch<ApiSuccessResponse<OrderWithRelations>>(`/api/orders/${id}`);
      return { success: true, data: res.data };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch order status history
 */
export function useOrderStatusHistory(id: string, enabled: boolean = true) {
  return useQuery<{ success: boolean; data?: OrderStatusHistory[]; error?: any }>({
    queryKey: orderKeys.history(id),
    queryFn: async () => {
      const res = await apiFetch<ApiSuccessResponse<OrderStatusHistory[]>>(`/api/orders/${id}/history`);
      return { success: true, data: res.data };
    },
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
      apiFetch<ApiSuccessResponse<OrderWithRelations>>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
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
      apiFetch<ApiSuccessResponse<OrderWithRelations>>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      showSuccess('Order updated successfully');
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
    mutationFn: (id: string) => apiFetch<ApiSuccessResponse<null>>(`/api/orders/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      const previousOrders = queryClient.getQueryData<PaginatedResponse<OrderWithRelations>>(orderKeys.lists());
      
      if (previousOrders?.data) {
        queryClient.setQueryData(
          orderKeys.lists(),
          { ...previousOrders, data: previousOrders.data.filter((o) => o.id !== id) }
        );
      }
      return { previousOrders };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      showSuccess('Order deleted successfully');
    },
    onError: (error, id, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.lists(), context.previousOrders);
      }
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
 * Process order return
 */
export function useProcessOrderReturn() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ orderId, returnData }: { orderId: string; returnData: ReturnOrderDTO }) => 
      apiFetch<ApiSuccessResponse<OrderWithRelations>>(`/api/orders/${orderId}/return`, { method: 'PATCH', body: JSON.stringify(returnData) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      showSuccess('Order return processed successfully');
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
    mutationFn: (orderId: string) => apiFetch<ApiSuccessResponse<OrderWithRelations>>(`/api/orders/${orderId}/deposit`, { method: 'PATCH' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      showSuccess('Deposit marked as returned');
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
