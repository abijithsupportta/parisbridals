/**
 * Branch Hooks
 *
 * TanStack Query hooks for branch operations.
 *
 * @module hooks/useBranches
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService } from '@/services/branchService';
import { useAppStore } from '@/stores';
import type { CreateBranchDTO, UpdateBranchDTO } from '@/domain/types/branch';

const branchKeys = {
  all: ['branches'] as const,
  detail: (id: string) => ['branches', id] as const,
};

export function useBranches() {
  const query = useQuery({
    queryKey: branchKeys.all,
    queryFn: () => branchService.getBranches(),
    staleTime: 2 * 60 * 1000,
    select: (result) => result.data,
  });

  return {
    ...query,
    branches: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

export function useBranch(id: string) {
  const query = useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => branchService.getBranchById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    select: (result) => result.data,
  });

  return {
    ...query,
    branch: query.data,
    isLoading: query.isLoading || query.isFetching,
  };
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (data: Omit<CreateBranchDTO, 'store_id'>) => branchService.createBranch(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: branchKeys.all });
        showSuccess('Branch created successfully');
      } else {
        showError('Failed to create branch', result.error?.message);
      }
    },
    onError: (error) => showError('Failed to create branch', error.message),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchDTO }) => branchService.updateBranch(id, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: branchKeys.all });
        queryClient.invalidateQueries({ queryKey: branchKeys.detail(variables.id) });
        showSuccess('Branch updated successfully');
      } else {
        showError('Failed to update branch', result.error?.message);
      }
    },
    onError: (error) => showError('Failed to update branch', error.message),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) => branchService.deleteBranch(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: branchKeys.all });
        showSuccess('Branch deleted successfully');
      } else {
        showError('Failed to delete branch', result.error?.message);
      }
    },
    onError: (error) => showError('Failed to delete branch', error.message),
  });
}
