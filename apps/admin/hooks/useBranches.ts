/**
 * Branch Hooks - Optimized
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
import type { Branch, BranchWithStaffCount, CreateBranchDTO, UpdateBranchDTO } from '@/domain/types/branch';
import type { ApiSuccessResponse } from '@/lib/apiResponse';

const branchKeys = {
  all: ['branches'] as const,
  detail: (id: string) => ['branches', id] as const,
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

export function useBranches() {
  const query = useQuery({
    queryKey: branchKeys.all,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<BranchWithStaffCount[]>>('/api/branches');
      return response.data;
    },
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    branches: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSimpleBranches() {
  const query = useQuery({
    queryKey: ['branches', 'simple'],
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Branch[]>>('/api/branches?simple=true');
      return response.data;
    },
    staleTime: 0,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
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
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<BranchWithStaffCount>>(`/api/branches/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
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
      apiFetch<ApiSuccessResponse<BranchWithStaffCount>>('/api/branches', { method: 'POST', body: JSON.stringify(data) }),
    onMutate: async (newBranch) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: branchKeys.all });

      // Snapshot previous value
      const previousBranches = queryClient.getQueryData<BranchWithStaffCount[]>(branchKeys.all);

      // Optimistically update
      if (previousBranches) {
        queryClient.setQueryData<BranchWithStaffCount[]>(branchKeys.all, (old) => [
          ...(old || []),
          { 
            ...newBranch, 
            id: 'temp-' + Date.now(), 
            staff_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as BranchWithStaffCount
        ]);
      }

      return { previousBranches };
    },
    onSuccess: () => {
      // Only invalidate branches list, not all queries
      queryClient.invalidateQueries({ queryKey: branchKeys.all, exact: true });
      showSuccess('Branch created successfully');
    },
    onError: (error, _newBranch, context) => {
      // Rollback on error
      if (context?.previousBranches) {
        queryClient.setQueryData(branchKeys.all, context.previousBranches);
      }
      showError('Failed to create branch', error.message);
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchDTO }) =>
      apiFetch<ApiSuccessResponse<BranchWithStaffCount>>(`/api/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: branchKeys.all });
      await queryClient.cancelQueries({ queryKey: branchKeys.detail(id) });

      // Snapshot previous values
      const previousBranches = queryClient.getQueryData<BranchWithStaffCount[]>(branchKeys.all);
      const previousBranch = queryClient.getQueryData<BranchWithStaffCount>(branchKeys.detail(id));

      // Optimistically update list
      if (previousBranches) {
        queryClient.setQueryData<BranchWithStaffCount[]>(branchKeys.all, (old) =>
          (old || []).map((b) => b.id === id ? { ...b, ...data } : b)
        );
      }

      // Optimistically update detail
      if (previousBranch) {
        queryClient.setQueryData(branchKeys.detail(id), { ...previousBranch, ...data });
      }

      return { previousBranches, previousBranch };
    },
    onSuccess: (_data, variables) => {
      // Only invalidate specific queries
      queryClient.invalidateQueries({ queryKey: branchKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(variables.id), exact: true });
      showSuccess('Branch updated successfully');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBranches) {
        queryClient.setQueryData(branchKeys.all, context.previousBranches);
      }
      if (context?.previousBranch) {
        queryClient.setQueryData(branchKeys.detail(variables.id), context.previousBranch);
      }
      showError('Failed to update branch', error.message);
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/branches/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: branchKeys.all });

      // Snapshot previous value
      const previousBranches = queryClient.getQueryData<BranchWithStaffCount[]>(branchKeys.all);

      // Optimistically remove
      if (previousBranches) {
        queryClient.setQueryData<BranchWithStaffCount[]>(branchKeys.all, (old) =>
          (old || []).filter((b) => b.id !== id)
        );
      }

      return { previousBranches };
    },
    onSuccess: () => {
      // Only invalidate branches list
      queryClient.invalidateQueries({ queryKey: branchKeys.all, exact: true });
      showSuccess('Branch deleted successfully');
    },
    onError: (error, _id, context) => {
      // Rollback on error
      if (context?.previousBranches) {
        queryClient.setQueryData(branchKeys.all, context.previousBranches);
      }
      showError('Failed to delete branch', error.message);
    },
  });
}
