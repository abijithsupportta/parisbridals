/**
 * Staff Hooks
 *
 * TanStack Query hooks for staff operations.
 *
 * @module hooks/useStaff
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService } from '@/services/branchService';
import { useAppStore } from '@/stores';
import type { CreateStaffDTO, UpdateStaffDTO } from '@/domain/types/branch';

const staffKeys = {
  all: ['staff'] as const,
  byBranch: (branchId: string) => ['staff', 'branch', branchId] as const,
  detail: (id: string) => ['staff', id] as const,
};

export function useStaff() {
  const query = useQuery({
    queryKey: staffKeys.all,
    queryFn: () => branchService.getStaff(),
    staleTime: 2 * 60 * 1000,
    select: (result) => result.data,
  });

  return {
    ...query,
    staff: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

export function useStaffByBranch(branchId: string) {
  const query = useQuery({
    queryKey: staffKeys.byBranch(branchId),
    queryFn: () => branchService.getStaffByBranch(branchId),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
    select: (result) => result.data,
  });

  return {
    ...query,
    staff: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}

export function useStaffMember(id: string) {
  const query = useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => branchService.getStaffById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    select: (result) => result.data,
  });

  return {
    ...query,
    staff: query.data,
    isLoading: query.isLoading || query.isFetching,
  };
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (data: Omit<CreateStaffDTO, 'store_id'>) => branchService.createStaff(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: staffKeys.all });
        showSuccess('Staff member created successfully');
      } else {
        showError('Failed to create staff', result.error?.message);
      }
    },
    onError: (error) => showError('Failed to create staff', error.message),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffDTO }) => branchService.updateStaff(id, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: staffKeys.all });
        queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) });
        showSuccess('Staff member updated successfully');
      } else {
        showError('Failed to update staff', result.error?.message);
      }
    },
    onError: (error) => showError('Failed to update staff', error.message),
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  return useMutation({
    mutationFn: (id: string) => branchService.deleteStaff(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: staffKeys.all });
        showSuccess('Staff member deleted successfully');
      } else {
        showError('Failed to delete staff', result.error?.message);
      }
    },
    onError: (error) => showError('Failed to delete staff', error.message),
  });
}
