/**
 * Branch & Staff Service
 *
 * Business logic for branch and staff management.
 * Staff creation includes Supabase Auth user creation.
 *
 * @module services/branchService
 */

import { branchRepository } from '@/repository/branchRepository';
import { staffRepository } from '@/repository/staffRepository';
import { CreateBranchSchema, UpdateBranchSchema } from '@/domain/schemas/branch.schema';
import { createAdminClient } from '@/lib/supabase/server';
import type {
  Branch, BranchWithStaffCount, CreateBranchDTO, UpdateBranchDTO,
  Staff, StaffWithBranch, CreateStaffDTO, UpdateStaffDTO,
} from '@/domain/types/branch';
import type { RepositoryResult } from '@/repository/supabaseClient';

// No hardcoded DEFAULT_STORE_ID here anymore

function validationError(message: string, code = 'VALIDATION'): RepositoryResult<any> {
  return { data: null, error: { message, code, details: null, hint: '' } as any, success: false };
}

class BranchService {
  // Current user context for audit fields
  private currentUserId: string | null = null;
  private currentStoreId: string | null = null;
  private currentBranchId: string | null = null;

  /**
   * Set current user context for audit fields and multi-tenancy
   */
  setUserContext(userId: string | null, branchId: string | null, storeId: string | null = null) {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    this.currentStoreId = storeId;
    branchRepository.setUserContext(userId, branchId);
    staffRepository.setUserContext(userId, branchId);
  }

  // ─── Branch Operations ───────────────────────────────────────────────

  async getBranches(): Promise<RepositoryResult<BranchWithStaffCount[]>> {
    return branchRepository.findAllWithStaffCount(this.currentStoreId || '');
  }

  async getSimpleBranches(): Promise<RepositoryResult<Branch[]>> {
    return branchRepository.findAll(this.currentStoreId || '');
  }

  async getBranchById(id: string): Promise<RepositoryResult<Branch>> {
    return branchRepository.findById(id);
  }

  async createBranch(data: Omit<CreateBranchDTO, 'store_id'>): Promise<RepositoryResult<Branch>> {
    // New branches can never be main — there can only ever be one main branch,
    // set at initial system setup. Force-clear any attempt.
    const payload = { ...data, is_main: false, store_id: this.currentStoreId || '' };
    const validation = CreateBranchSchema.safeParse(payload);
    if (!validation.success) {
      return validationError(validation.error.issues.map(i => i.message).join(', '));
    }
    return branchRepository.create(payload);
  }

  async updateBranch(id: string, data: UpdateBranchDTO): Promise<RepositoryResult<Branch>> {
    const validation = UpdateBranchSchema.safeParse(data);
    if (!validation.success) {
      return validationError(validation.error.issues.map(i => i.message).join(', '));
    }

    // Block promoting a non-main branch to main — the main branch is fixed.
    if (data.is_main === true) {
      const current = await branchRepository.findById(id);
      if (current.success && current.data && !current.data.is_main) {
        return validationError(
          'The main branch cannot be changed. Only one main branch is allowed.',
          'MAIN_BRANCH_LOCKED'
        );
      }
    }

    // Also block demoting the main branch (is_main set to false on the current main)
    if (data.is_main === false) {
      const current = await branchRepository.findById(id);
      if (current.success && current.data?.is_main) {
        return validationError(
          'The main branch cannot be demoted.',
          'MAIN_BRANCH_LOCKED'
        );
      }
    }

    return branchRepository.update(id, data);
  }

  async deleteBranch(id: string): Promise<RepositoryResult<boolean>> {
    // Check if this is the main branch — cannot delete main branch
    const branch = await branchRepository.findById(id);
    if (!branch.success || !branch.data) {
      return validationError('Branch not found', 'NOT_FOUND');
    }
    if (branch.data.is_main) {
      return validationError('Main branch cannot be deleted', 'DELETE_BLOCKED');
    }

    // Check for staff assigned to this branch
    const check = await branchRepository.canDelete(id);
    if (check.success && check.data && !check.data.canDelete) {
      return validationError(check.data.reason || 'Cannot delete branch', 'DELETE_BLOCKED');
    }

    // Clean up branch_inventory records for this branch before deleting.
    // The DB has ON DELETE CASCADE on branch_inventory.branch_id, but we
    // explicitly delete here so we can update product-level totals afterward.
    try {
      const { branchInventoryRepository } = await import('@/repository');
      const inventoryResult = await branchInventoryRepository.getInventoryByBranch(id);
      if (inventoryResult.success && inventoryResult.data) {
        for (const inv of inventoryResult.data) {
          await branchInventoryRepository.deleteBranchInventory(inv.id);
        }
      }
    } catch (err) {
      // Non-fatal: DB cascade will handle cleanup even if this fails
      console.warn('[BranchService] Failed to pre-clean branch_inventory, relying on DB cascade:', err);
    }

    return branchRepository.delete(id);
  }

  async canDeleteBranch(id: string) {
    return branchRepository.canDelete(id);
  }

  // ─── Staff Operations (Delegated to staffService) ─────────────────────

  async getStaff(): Promise<RepositoryResult<StaffWithBranch[]>> {
    const { staffService } = await import('./staffService');
    staffService.setUserContext(this.currentUserId, this.currentBranchId, this.currentStoreId);
    return staffService.getStaff();
  }

  async getStaffByBranch(branchId: string): Promise<RepositoryResult<Staff[]>> {
    const { staffService } = await import('./staffService');
    staffService.setUserContext(this.currentUserId, this.currentBranchId, this.currentStoreId);
    return staffService.getStaffByBranch(branchId);
  }

  async getStaffById(id: string): Promise<RepositoryResult<StaffWithBranch>> {
    const { staffService } = await import('./staffService');
    staffService.setUserContext(this.currentUserId, this.currentBranchId, this.currentStoreId);
    return staffService.getStaffById(id);
  }

  async createStaff(data: Omit<CreateStaffDTO, 'store_id'>): Promise<RepositoryResult<Staff>> {
    const { staffService } = await import('./staffService');
    staffService.setUserContext(this.currentUserId, this.currentBranchId, this.currentStoreId);
    return staffService.createStaff(data);
  }

  async updateStaff(id: string, data: UpdateStaffDTO): Promise<RepositoryResult<Staff>> {
    const { staffService } = await import('./staffService');
    staffService.setUserContext(this.currentUserId, this.currentBranchId, this.currentStoreId);
    return staffService.updateStaff(id, data);
  }

  async deactivateStaff(id: string): Promise<RepositoryResult<boolean>> {
    const { staffService } = await import('./staffService');
    staffService.setUserContext(this.currentUserId, this.currentBranchId, this.currentStoreId);
    return staffService.deactivateStaff(id);
  }
}

export const branchService = new BranchService();
