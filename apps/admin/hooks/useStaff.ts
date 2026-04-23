/**
 * Staff Hooks
 *
 * TanStack Query hooks for staff operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/staff) → service → repository → supabase
 *
 * @module hooks/useStaff
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/stores';
import type { StaffWithBranch, Staff, CreateStaffDTO, UpdateStaffDTO } from '@/domain/types/branch';

const staffKeys = {
  all: ['staff'] as const,
  byBranch: (branchId: string) => ['staff', 'branch', branchId] as const,
  detail: (id: string) => ['staff', id] as const,
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

export function useStaff() {
  const query = useQuery({
    queryKey: staffKeys.all,
    queryFn: () => apiFetch<StaffWithBranch[]>('/api/staff'),
    staleTime: 2 * 60 * 1000,
  });

  return {
    staff: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useStaffByBranch(branchId: string) {
  const query = useQuery({
    queryKey: staffKeys.byBranch(branchId),
    queryFn: () => apiFetch<Staff[]>(`/api/staff?branch=${branchId}`),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    staff: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useStaffMember(id: string) {
  const query = useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => apiFetch<StaffWithBranch>(`/api/staff/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    staff: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (data: Omit<CreateStaffDTO, 'store_id'>) =>
      apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      showSuccess('Staff member created successfully');
    },
    onError: (error) => showError('Failed to create staff', error.message),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffDTO }) =>
      apiFetch(`/api/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) });
      showSuccess('Staff member updated successfully');
    },
    onError: (error) => showError('Failed to update staff', error.message),
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      showSuccess('Staff member deleted successfully');
    },
    onError: (error) => showError('Failed to delete staff', error.message),
  });
}
