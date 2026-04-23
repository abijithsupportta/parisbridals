/**
 * Branch Hooks
 *
 * TanStack Query hooks for branch operations.
 * All operations go through API routes (server-side, service role key).
 *
 * Flow: UI → hooks → fetch(/api/branches) → service → repository → supabase
 *
 * @module hooks/useBranches
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/stores';
import type { BranchWithStaffCount, CreateBranchDTO, UpdateBranchDTO } from '@/domain/types/branch';

const branchKeys = {
  all: ['branches'] as const,
  detail: (id: string) => ['branches', id] as const,
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

export function useBranches() {
  const query = useQuery({
    queryKey: branchKeys.all,
    queryFn: () => apiFetch<BranchWithStaffCount[]>('/api/branches'),
    staleTime: 2 * 60 * 1000,
  });

  return {
    branches: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useBranch(id: string) {
  const query = useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => apiFetch<BranchWithStaffCount>(`/api/branches/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    branch: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (data: Omit<CreateBranchDTO, 'store_id'>) =>
      apiFetch('/api/branches', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      showSuccess('Branch created successfully');
    },
    onError: (error) => showError('Failed to create branch', error.message),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchDTO }) =>
      apiFetch(`/api/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(variables.id) });
      showSuccess('Branch updated successfully');
    },
    onError: (error) => showError('Failed to update branch', error.message),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/branches/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      showSuccess('Branch deleted successfully');
    },
    onError: (error) => showError('Failed to delete branch', error.message),
  });
}
