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

  // ─── Branch Operations ───────────────────────────────────────────────

  async getBranches(): Promise<RepositoryResult<BranchWithStaffCount[]>> {
    return branchRepository.findAllWithStaffCount(DEFAULT_STORE_ID);
  }

  async getBranchById(id: string): Promise<RepositoryResult<Branch>> {
    return branchRepository.findById(id);
  }

  async createBranch(data: Omit<CreateBranchDTO, 'store_id'>): Promise<RepositoryResult<Branch>> {
    const payload = { ...data, store_id: DEFAULT_STORE_ID };
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
    return branchRepository.update(id, data);
  }

  async deleteBranch(id: string): Promise<RepositoryResult<boolean>> {
    const check = await branchRepository.canDelete(id);
    if (check.success && check.data && !check.data.canDelete) {
      return validationError(check.data.reason || 'Cannot delete branch', 'DELETE_BLOCKED');
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

    // Delete auth user if linked
    if (staff.data.user_id) {
      try {
        const supabase = createAdminClient();
        await supabase.auth.admin.deleteUser(staff.data.user_id);
      } catch {
        // Log but don't block staff deletion
        console.warn(`[branchService] Failed to delete auth user ${staff.data.user_id}`);
      }
    }

    return staffRepository.delete(id);
  }
}

export const branchService = new BranchService();
