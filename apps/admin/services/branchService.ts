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
import { CreateBranchSchema, UpdateBranchSchema, CreateStaffSchema, UpdateStaffSchema } from '@/domain/schemas/branch.schema';
import { createAdminClient } from '@/lib/supabase/server';
import type {
  Branch, BranchWithStaffCount, CreateBranchDTO, UpdateBranchDTO,
  Staff, StaffWithBranch, CreateStaffDTO, UpdateStaffDTO,
} from '@/domain/types/branch';
import type { RepositoryResult } from '@/repository/supabaseClient';

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';

function validationError(message: string, code = 'VALIDATION'): RepositoryResult<any> {
  return { data: null, error: { message, code, details: null, hint: '' } as any, success: false };
}

class BranchService {
  // Current user context for audit fields
  private currentUserId: string | null = null;
  private currentBranchId: string | null = null;

  /**
   * Set current user context for audit fields
   */
  setUserContext(userId: string | null, branchId: string | null) {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    branchRepository.setUserContext(userId, branchId);
    staffRepository.setUserContext(userId, branchId);
  }

  // ─── Branch Operations ───────────────────────────────────────────────

  async getBranches(): Promise<RepositoryResult<BranchWithStaffCount[]>> {
    return branchRepository.findAllWithStaffCount(DEFAULT_STORE_ID);
  }

  async getBranchById(id: string): Promise<RepositoryResult<Branch>> {
    return branchRepository.findById(id);
  }

  async createBranch(data: Omit<CreateBranchDTO, 'store_id'>): Promise<RepositoryResult<Branch>> {
    // New branches can never be main — there can only ever be one main branch,
    // set at initial system setup. Force-clear any attempt.
    const payload = { ...data, is_main: false, store_id: DEFAULT_STORE_ID };
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

  // ─── Staff Operations ────────────────────────────────────────────────

  async getStaff(): Promise<RepositoryResult<StaffWithBranch[]>> {
    return staffRepository.findAll(DEFAULT_STORE_ID);
  }

  async getStaffByBranch(branchId: string): Promise<RepositoryResult<Staff[]>> {
    return staffRepository.findByBranch(branchId);
  }

  async getStaffById(id: string): Promise<RepositoryResult<StaffWithBranch>> {
    return staffRepository.findById(id);
  }

  /**
   * Create a staff member:
   * 1. Validate input
   * 2. Create Supabase Auth user (email + password)
   * 3. Insert staff record with user_id linked to auth user
   */
  async createStaff(data: Omit<CreateStaffDTO, 'store_id'>): Promise<RepositoryResult<Staff>> {
    const payload = { ...data, store_id: DEFAULT_STORE_ID };
    const validation = CreateStaffSchema.safeParse(payload);
    if (!validation.success) {
      return validationError(validation.error.issues.map(i => i.message).join(', '));
    }

    // Check unique email in staff table
    const existing = await staffRepository.findByEmail(payload.email);
    if (existing.success && existing.data) {
      return validationError('A staff member with this email already exists', 'DUPLICATE_EMAIL');
    }

    // Step 1: Create Supabase Auth user
    const supabase = createAdminClient();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // auto-confirm email
      user_metadata: {
        name: payload.name,
        role: payload.role,
        branch_id: payload.branch_id,
        store_id: DEFAULT_STORE_ID,
      },
    });

    if (authError) {
      return validationError(`Failed to create auth user: ${authError.message}`, 'AUTH_ERROR');
    }

    // Step 2: Insert staff record with user_id
    const { password: _pw, ...staffData } = payload; // strip password from DB insert
    const result = await staffRepository.create({
      ...staffData,
      user_id: authUser.user.id,
    } as any);

    if (!result.success) {
      // Rollback: delete the auth user if staff record creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return result;
    }

    return result;
  }

  async updateStaff(id: string, data: UpdateStaffDTO): Promise<RepositoryResult<Staff>> {
    const validation = UpdateStaffSchema.safeParse(data);
    if (!validation.success) {
      return validationError(validation.error.issues.map(i => i.message).join(', '));
    }

    // Check email uniqueness if changing email
    if (data.email) {
      const existing = await staffRepository.findByEmail(data.email);
      if (existing.success && existing.data && existing.data.id !== id) {
        return validationError('Another staff member already uses this email', 'DUPLICATE_EMAIL');
      }
    }

    return staffRepository.update(id, data);
  }

  async deleteStaff(id: string): Promise<RepositoryResult<boolean>> {
    // Get staff to find user_id for auth cleanup
    const staff = await staffRepository.findById(id);
    if (!staff.success || !staff.data) {
      return validationError('Staff member not found', 'NOT_FOUND');
    }

    // Delete auth user first — must succeed before deleting staff record
    if (staff.data.user_id) {
      try {
        const supabase = createAdminClient();
        const { error } = await supabase.auth.admin.deleteUser(staff.data.user_id);
        if (error) {
          return validationError(`Failed to remove login access: ${error.message}`, 'AUTH_DELETE_FAILED');
        }
      } catch (err: any) {
        return validationError(`Failed to remove login access: ${err.message}`, 'AUTH_DELETE_FAILED');
      }
    }

    // Auth user removed — now delete staff record
    return staffRepository.delete(id);
  }
}

export const branchService = new BranchService();
