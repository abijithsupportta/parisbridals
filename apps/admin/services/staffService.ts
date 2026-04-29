/**
 * Staff Service
 *
 * Business logic for staff management.
 * Handles Supabase Auth user creation/deletion alongside staff records.
 *
 * Extracted from branchService for clean separation of concerns.
 *
 * @module services/staffService
 */

import { staffRepository } from '@/repository/staffRepository';
import { CreateStaffSchema, UpdateStaffSchema } from '@/domain/schemas/branch.schema';
import { createAdminClient } from '@/lib/supabase/server';
import type {
  Staff, StaffWithBranch, CreateStaffDTO, UpdateStaffDTO,
} from '@/domain/types/branch';
import type { RepositoryResult } from '@/repository/supabaseClient';

function validationError(message: string, code = 'VALIDATION'): RepositoryResult<any> {
  return { data: null, error: { message, code, details: null, hint: '' } as any, success: false };
}

export class StaffService {
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
    staffRepository.setUserContext(userId, branchId);
  }

  /**
   * Get all staff members for the current store
   */
  async getStaff(): Promise<RepositoryResult<StaffWithBranch[]>> {
    return staffRepository.findAll(this.currentStoreId || '');
  }

  /**
   * Get staff members by branch
   */
  async getStaffByBranch(branchId: string): Promise<RepositoryResult<Staff[]>> {
    return staffRepository.findByBranch(branchId);
  }

  /**
   * Get a single staff member by ID
   */
  async getStaffById(id: string): Promise<RepositoryResult<StaffWithBranch>> {
    return staffRepository.findById(id);
  }

  /**
   * Create a staff member:
   * 1. Validate input
   * 2. Check email uniqueness
   * 3. Create Supabase Auth user (email + password)
   * 4. Insert staff record with user_id linked to auth user
   */
  async createStaff(data: Omit<CreateStaffDTO, 'store_id'>): Promise<RepositoryResult<Staff>> {
    const payload = { ...data, store_id: this.currentStoreId || '' };
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
      email_confirm: true,
      user_metadata: {
        name: payload.name,
        role: payload.role,
        branch_id: payload.branch_id,
        store_id: this.currentStoreId,
      },
    });

    if (authError) {
      return validationError(`Failed to create auth user: ${authError.message}`, 'AUTH_ERROR');
    }

    // Step 2: Insert staff record with user_id
    const { password: _pw, ...staffData } = payload;
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

  /**
   * Update a staff member
   */
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

  /**
   * Deactivate a staff member (Soft Delete)
   * Revokes access without removing data from DB.
   */
  async deactivateStaff(id: string): Promise<RepositoryResult<boolean>> {
    // 1. Get staff to find user_id for auth cleanup
    const staff = await staffRepository.findById(id);
    if (!staff.success || !staff.data) {
      return validationError('Staff member not found', 'NOT_FOUND');
    }

    // 2. Ban Supabase Auth user to prevent login
    if (staff.data.user_id) {
      try {
        const supabase = createAdminClient();
        // Update user to ban them (effectively revoking session/login)
        const { error } = await supabase.auth.admin.updateUserById(
          staff.data.user_id,
          { ban_duration: '876000h' } // 100 years
        );
        if (error) {
          console.warn(`[StaffService] Failed to ban auth user: ${error.message}`);
          // Continue anyway to deactivate staff record
        }
      } catch (err: any) {
        console.warn(`[StaffService] Error banning auth user: ${err.message}`);
      }
    }

    // 3. Update staff record to inactive
    const result = await staffRepository.update(id, { is_active: false });
    return { data: result.success, error: result.error, success: result.success };
  }
}

export const staffService = new StaffService();
