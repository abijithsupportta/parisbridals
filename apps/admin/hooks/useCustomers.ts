/**
 * Customer Hooks
 *
 * TanStack Query hooks for customer operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/customers) → service → repository → supabase
 *
 * @module hooks/useCustomers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/services';
import { Customer } from '@/domain';
import { CreateCustomerDTO, UpdateCustomerDTO, CustomerSearchParams } from '@/repository';
import { useAppStore } from '@/stores';

// Query keys
const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: CustomerSearchParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  phone: (phone: string) => [...customerKeys.all, 'phone', phone] as const,
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
 * Fetch all customers
 */
export function useCustomers(params?: CustomerSearchParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerService.getAllCustomers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch a single customer by ID
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerService.getCustomerById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch customer by phone
 */
export function useCustomerByPhone(phone: string, enabled: boolean = true) {
  return useQuery({
    queryKey: customerKeys.phone(phone),
    queryFn: async () => {
      const result = await customerService.getCustomerByPhone(phone);
      return result.success ? result.data : null;
    },
    enabled: enabled && !!phone,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateCustomerDTO) =>
      apiFetch<{ customer: Customer }>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
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

/**
 * Update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDTO }) => 
      customerService.updateCustomer(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
        queryClient.invalidateQueries({ queryKey: customerKeys.details() });
        showSuccess('Customer updated successfully');
      } else {
        showError('Failed to update customer', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to update customer', error.message);
    },
  });

  return {
    ...mutation,
    updateCustomer: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (id: string) => customerService.deleteCustomer(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
        queryClient.invalidateQueries({ queryKey: customerKeys.details() });
        showSuccess('Customer deleted successfully');
      } else {
        showError('Failed to delete customer', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to delete customer', error.message);
    },
  });

  return {
    ...mutation,
    deleteCustomer: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Count customers
 */
export function useCustomerCount(params?: CustomerSearchParams) {
  return useQuery({
    queryKey: [...customerKeys.lists(), 'count', params],
    queryFn: () => customerService.countCustomers(params),
    staleTime: 5 * 60 * 1000,
  });
}
