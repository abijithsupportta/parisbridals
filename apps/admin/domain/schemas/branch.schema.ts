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

/**
 * Indian phone number regex:
 * Accepts: +91 9876543210, +919876543210, 09876543210, 9876543210
 * Must be a 10-digit Indian mobile number (starting with 6-9)
 */
const indianPhoneRegex = /^(?:\+91[\s-]?)?(?:0)?[6-9]\d{9}$/;

export const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Staff name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must not exceed 72 characters'),
  phone: z
    .string()
    .regex(indianPhoneRegex, 'Enter a valid Indian phone number (e.g. +91 9876543210)')
    .optional()
    .or(z.literal('')),
  role: StaffRoleEnum,
  branch_id: z.string().min(1, 'Branch is required'),
  is_active: z.boolean().default(true),
  store_id: z.string().min(1),
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(indianPhoneRegex, 'Enter a valid Indian phone number (e.g. +91 9876543210)')
    .optional()
    .nullable()
    .or(z.literal('')),
  role: StaffRoleEnum.optional(),
  branch_id: z.string().optional(),
  is_active: z.boolean().optional(),
});
