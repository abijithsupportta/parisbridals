/**
 * Category Validation Schemas
 *
 * Zod schemas for validating category create/update operations.
 *
 * @module domain/schemas/category.schema
 */

import { z } from 'zod';

/**
 * Slug validation pattern: lowercase alphanumeric + hyphens
 */
const slugPattern = /^[a-z0-9-]+$/;

/**
 * Base schema fields shared between create and update
 */
const baseCategorySchema = {
  name: z.string().min(1, 'Category name is required').max(255, 'Name must be 255 characters or less'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(slugPattern, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional().nullable(),
  image_url: z.string().url('Invalid image URL').optional().nullable(),
  parent_id: z.string().uuid('Invalid parent ID').optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
  is_global: z.boolean().optional().default(false),
  store_id: z.string().uuid().optional(),
};

/**
 * Schema for creating a new category
 */
export const CreateCategorySchema = z.object(baseCategorySchema);

/**
 * Schema for updating an existing category
 */
export const UpdateCategorySchema = z.object(baseCategorySchema).partial();

/**
 * Schema for searching categories
 */
export const CategorySearchSchema = z.object({
  query: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  is_active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CategorySearchInput = z.infer<typeof CategorySearchSchema>;
