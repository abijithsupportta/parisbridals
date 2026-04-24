/**
 * Customer Hooks
 *
 * TanStack Query hooks for customer operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/customers) → service → repository → supabase
 *
 * Performance patterns (same as Product module):
 *   • placeholderData: keepPreviousData — prevents blank-screen flicker on search/page change
 *   • removeQueries — force full refetch on mutation to guarantee fresh data
 *   • Optimistic delete — remove from cache instantly, re-add on error
 *
 * @module hooks/useCustomers
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Customer,
  CustomerSearchParams,
  CustomerSearchResult,
  CreateCustomerDTO,
  UpdateCustomerDTO,
} from '@/domain';
import { useAppStore } from '@/stores';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

// ── Query keys ────────────────────────────────────────────────────────
const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: CustomerSearchParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// ── API fetch helper ──────────────────────────────────────────────────
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

// ── useCustomers — paginated list with search ─────────────────────────
export function useCustomers(params?: CustomerSearchParams) {
  const queryResult = useQuery<CustomerSearchResult>({
    queryKey: customerKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.query) qs.set('query', params.query);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.sort_by) qs.set('sort_by', params.sort_by);
      if (params?.sort_order) qs.set('sort_order', params.sort_order);
      const response = await apiFetch<ApiSuccessResponse<CustomerSearchResult>>(`/api/customers?${qs.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData, // Prevents blank screen on pagination/search
  });

  return {
    ...queryResult,
    customers: queryResult.data?.customers ?? [],
    total: queryResult.data?.total ?? 0,
    totalPages: queryResult.data?.total_pages ?? 0,
    hasNext: queryResult.data?.has_next ?? false,
    hasPrev: queryResult.data?.has_prev ?? false,
  };
}

// ── useCustomer — single customer detail ──────────────────────────────
export function useCustomer(id: string) {
  return useQuery<Customer>({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Customer>>(`/api/customers/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ── useCustomerByPhone — search by phone for order form ───────────────
export function useCustomerByPhone(phone: string, enabled: boolean = true) {
  return useQuery<Customer | null>({
    queryKey: ['customers', 'phone', phone],
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<CustomerSearchResult>>(`/api/customers?query=${encodeURIComponent(phone)}&limit=1`);
      const match = response.data?.customers?.find((c: Customer) => c.phone === phone);
      return match || null;
    },
    enabled: enabled && phone.length >= 10,
    staleTime: 5 * 60 * 1000,
  });
}

// ── useCreateCustomer ─────────────────────────────────────────────────
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateCustomerDTO) =>
      apiFetch<ApiSuccessResponse<Customer>>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Wipe all list caches for instant fresh data on navigation
      queryClient.removeQueries({ queryKey: customerKeys.lists() });
      showSuccess('Customer created successfully');
    },
    onError: (error) => showError('Failed to create customer', error.message),
  });

  return {
    ...mutation,
    createCustomer: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

// ── useUpdateCustomer ─────────────────────────────────────────────────
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDTO }) =>
      apiFetch<ApiSuccessResponse<Customer>>(`/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_result, variables) => {
      queryClient.removeQueries({ queryKey: customerKeys.lists() });
      queryClient.removeQueries({ queryKey: customerKeys.detail(variables.id) });
      showSuccess('Customer updated successfully');
    },
    onError: (error) => showError('Failed to update customer', error.message),
  });

  return {
    ...mutation,
    updateCustomer: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

// ── useDeleteCustomer — optimistic ────────────────────────────────────
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: async (customer: Customer) => {
      // 1. Clean up images in background (photo + id_documents)
      const urlsToDelete: string[] = [];
      if (customer.photo_url) urlsToDelete.push(customer.photo_url);
      if (customer.id_documents) {
        for (const doc of customer.id_documents) {
          urlsToDelete.push(doc.url);
        }
      }

      // Fire-and-forget R2 deletion
      for (const url of urlsToDelete) {
        fetch('/api/upload/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }).catch(() => {}); // Best effort
      }

      // 2. Delete the customer record
      await apiFetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      return customer;
    },
    onMutate: async (customer) => {
      // Optimistic: remove from all cached lists immediately
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      const previousLists = queryClient.getQueriesData<CustomerSearchResult>({
        queryKey: customerKeys.lists(),
      });
      queryClient.setQueriesData<CustomerSearchResult>(
        { queryKey: customerKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            customers: old.customers.filter((c) => c.id !== customer.id),
            total: old.total - 1,
          };
        }
      );
      return { previousLists };
    },
    onError: (_error, _customer, context) => {
      // Rollback on failure
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      showError('Failed to delete customer', _error.message);
    },
    onSuccess: () => {
      showSuccess('Customer deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });

  return {
    ...mutation,
    deleteCustomer: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
