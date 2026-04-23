/**
 * Branch & Staff Domain Types
 *
 * Type definitions for the branch and staff domains.
 *
 * @module domain/types/branch
 */

// ─── Branch Entity ───────────────────────────────────────────────────
export interface Branch {
  readonly id: string;
  readonly store_id: string;
  name: string;
  address: string;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

export interface BranchWithStaffCount extends Branch {
  staff_count?: number;
}

// ─── Staff Entity ────────────────────────────────────────────────────
export type StaffRole = 'super_admin' | 'admin' | 'manager' | 'staff';

export interface Staff {
  readonly id: string;
  readonly store_id: string;
  readonly branch_id: string;
  readonly user_id: string | null; // links to auth.users
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

export interface StaffWithBranch extends Staff {
  branch?: Pick<Branch, 'id' | 'name'>;
}

// ─── Branch DTOs ─────────────────────────────────────────────────────
export interface CreateBranchDTO {
  name: string;
  address: string;
  phone?: string;
  is_main?: boolean;
  is_active?: boolean;
  store_id: string;
}

export interface UpdateBranchDTO {
  name?: string;
  address?: string;
  phone?: string | null;
  is_main?: boolean;
  is_active?: boolean;
}

// ─── Staff DTOs ──────────────────────────────────────────────────────
export interface CreateStaffDTO {
  name: string;
  email: string;
  password: string; // for Supabase Auth user creation
  phone?: string;
  role: StaffRole;
  branch_id: string;
  is_active?: boolean;
  store_id: string;
}

export interface UpdateStaffDTO {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: StaffRole;
  branch_id?: string;
  is_active?: boolean;
}

// ─── Search Params ───────────────────────────────────────────────────
export interface BranchSearchParams {
  query?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface StaffSearchParams {
  query?: string;
  branch_id?: string;
  role?: StaffRole;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}
