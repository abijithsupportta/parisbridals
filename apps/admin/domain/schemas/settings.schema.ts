/**
 * Settings Validation Schemas
 *
 * Zod schemas for validating settings operations.
 *
 * @module domain/schemas/settings.schema
 */

import { z } from 'zod';

const SettingKeyEnum = z.enum([
  'gst_percentage',
  'is_gst_enabled',
  'invoice_prefix',
  'payment_terms',
  'authorized_signature',
]);

/**
 * Schema for creating/upserting a setting
 */
export const CreateSettingSchema = z.object({
  store_id: z.string().uuid(),
  key: SettingKeyEnum,
  value: z.string().max(5000, 'Value must be 5000 characters or less'),
  updated_by: z.string().uuid().optional(),
});

/**
 * Schema for updating an existing setting
 */
export const UpdateSettingSchema = z.object({
  key: SettingKeyEnum,
  value: z.string().max(5000, 'Value must be 5000 characters or less'),
  updated_by: z.string().uuid().optional(),
});

/**
 * Schema for GST percentage specifically
 */
export const GSTPercentageSchema = z.object({
  percentage: z.number()
    .min(0, 'GST percentage cannot be negative')
    .max(100, 'GST percentage cannot exceed 100'),
});

export type CreateSettingInput = z.infer<typeof CreateSettingSchema>;
export type UpdateSettingInput = z.infer<typeof UpdateSettingSchema>;
export type GSTPercentageInput = z.infer<typeof GSTPercentageSchema>;
