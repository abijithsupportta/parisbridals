/**
 * Staff Hooks
 *
 * TanStack Query hooks for staff operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/staff) → service → repository → supabase
 *
 * Performance:
 * - staleTime: 0 with refetchOnMount: 'always' ensures fresh data on navigation
 * - onSettled with await ensures cache is refreshed before mutateAsync resolves
 * - structuralSharing prevents unnecessary re-renders when data shape is identical
 *
 * @module hooks/useStaff
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/stores';
import type { StaffWithBranch, Staff, CreateStaffDTO, UpdateStaffDTO } from '@/domain/types/branch';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

const staffKeys = {
  all: ['staff'] as const,
  byBranch: (branchId: string) => ['staff', 'branch', branchId] as const,
  detail: (id: string) => ['staff', id] as const,
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function useStaff() {
  const query = useQuery({
    queryKey: staffKeys.all,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<StaffWithBranch[]>>('/api/staff');
      return response.data;
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    retry: 1,
  });

  return {
    staff: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}

export function useStaffByBranch(branchId: string) {
  const query = useQuery({
    queryKey: staffKeys.byBranch(branchId),
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Staff[]>>(`/api/staff?branch=${branchId}`);
      return response.data;
    },
    enabled: !!branchId,
    staleTime: 0,
    refetchOnMount: 'always',
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
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<StaffWithBranch>>(`/api/staff/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
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
      apiFetch<ApiSuccessResponse<Staff>>('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      showSuccess('Staff member created successfully');
    },
    onError: (error) => showError('Failed to create staff', error.message),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffDTO }) =>
      apiFetch<ApiSuccessResponse<Staff>>(`/api/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      showSuccess('Staff member updated successfully');
    },
    onError: (error) => showError('Failed to update staff', error.message),
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.all }),
        queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) }),
      ]);
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      showSuccess('Staff member deactivated successfully');
    },
    onError: (error) => showError('Failed to deactivate staff', error.message),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/**
 * Toggle staff active/inactive status via PATCH.
 * Shows appropriate toast based on the new status.
 */
export function useToggleStaffStatus() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch<ApiSuccessResponse<Staff>>(`/api/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (_data, variables) => {
      showSuccess(
        variables.is_active
          ? 'Staff member activated successfully'
          : 'Staff member deactivated successfully'
      );
    },
    onError: (error) => showError('Failed to update staff status', error.message),
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.all }),
        queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) }),
      ]);
    },
  });
}
