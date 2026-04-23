/**
 * Branch & Staff Validation Schemas
 *
 * Zod schemas for branch and staff validation.
 *
 * @module domain/schemas/branch.schema
 */

import { z } from 'zod';

// ─── Branch Schemas ──────────────────────────────────────────────────
export const CreateBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255),
  address: z.string().min(1, 'Address is required').max(500),
  phone: z.string().max(20).optional(),
  is_main: z.boolean().default(false),
  is_active: z.boolean().default(true),
  store_id: z.string().min(1),
});

export const UpdateBranchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().min(1).max(500).optional(),
  phone: z.string().max(20).optional().nullable(),
  is_main: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// ─── Staff Schemas ───────────────────────────────────────────────────
export const StaffRoleEnum = z.enum(['admin', 'manager', 'staff']);

export const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Staff name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().max(20).optional(),
  role: StaffRoleEnum,
  branch_id: z.string().min(1, 'Branch is required'),
  is_active: z.boolean().default(true),
  store_id: z.string().min(1),
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  role: StaffRoleEnum.optional(),
  branch_id: z.string().optional(),
  is_active: z.boolean().optional(),
});
