/**
 * Staff Validation Schemas
 *
 * Zod schemas for validating staff create/update operations.
 *
 * @module domain/schemas/staff.schema
 */

import { z } from 'zod';

const StaffRoleEnum = z.enum(['super_admin', 'admin', 'manager', 'staff']);

/**
 * Base schema fields for staff
 */
const baseStaffSchema = {
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20).optional().nullable(),
  role: StaffRoleEnum,
  branch_id: z.string().uuid('Invalid branch ID'),
  is_active: z.boolean().optional().default(true),
  store_id: z.string().uuid().optional(),
};

/**
 * Schema for creating a new staff member
 * Password is required on creation for Supabase Auth user
 */
export const CreateStaffSchema = z.object({
  ...baseStaffSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less'),
});

/**
 * Schema for updating an existing staff member
 * Password is not updatable via this schema
 */
export const UpdateStaffSchema = z.object({
  name: baseStaffSchema.name,
  email: baseStaffSchema.email,
  phone: baseStaffSchema.phone,
  role: baseStaffSchema.role,
  branch_id: baseStaffSchema.branch_id,
  is_active: baseStaffSchema.is_active,
}).partial();

/**
 * Schema for searching staff
 */
export const StaffSearchSchema = z.object({
  query: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  role: StaffRoleEnum.optional(),
  is_active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
export type StaffSearchInput = z.infer<typeof StaffSearchSchema>;
