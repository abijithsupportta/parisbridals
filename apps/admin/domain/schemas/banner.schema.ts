/**
 * Banner Validation Schemas
 *
 * Zod schemas for validating banner create/update operations.
 *
 * @module domain/schemas/banner.schema
 */

import { z } from 'zod';

const BannerTypeEnum = z.enum(['hero', 'editorial', 'split']);
const BannerRedirectTypeEnum = z.enum(['none', 'category', 'subcategory', 'subvariant', 'product', 'url']);
const BannerPositionEnum = z.enum(['left', 'right']);

/**
 * Base schema fields shared between create and update
 */
const baseBannerSchema = {
  banner_type: BannerTypeEnum.optional().default('hero'),
  position: z.string().max(10).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  subtitle: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  call_to_action: z.string().max(100).optional().nullable(),
  web_image_url: z.string().url('Invalid image URL'),
  redirect_type: BannerRedirectTypeEnum.default('none'),
  redirect_target_id: z.string().uuid('Invalid redirect target ID').optional().nullable(),
  redirect_url: z.string().url('Invalid redirect URL').optional().nullable(),
  is_active: z.boolean().optional().default(true),
  priority: z.number().int().min(0).optional().default(0),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  alt_text: z.string().max(500).optional().nullable(),
  store_id: z.string().uuid().optional(),
};

/**
 * Schema for creating a new banner
 *
 * Cross-field validation:
 * - Hero banners require a numeric position (1-10)
 * - Split banners require position to be 'left' or 'right'
 * - URL redirect type requires a redirect_url
 */
export const CreateBannerSchema = z.object(baseBannerSchema).refine(
  (data) => {
    if (data.redirect_type === 'url' && !data.redirect_url) return false;
    return true;
  },
  { message: 'Redirect URL is required when redirect type is "url"', path: ['redirect_url'] }
).refine(
  (data) => {
    if (data.banner_type === 'hero' && data.position) {
      const posNum = parseInt(data.position, 10);
      if (isNaN(posNum) || posNum < 1 || posNum > 10) return false;
    }
    return true;
  },
  { message: 'Hero banner position must be between 1 and 10', path: ['position'] }
).refine(
  (data) => {
    if (data.banner_type === 'split' && data.position) {
      if (!['left', 'right'].includes(data.position)) return false;
    }
    return true;
  },
  { message: 'Split banner position must be "left" or "right"', path: ['position'] }
);

/**
 * Schema for updating an existing banner
 */
export const UpdateBannerSchema = z.object(baseBannerSchema).partial();

export type CreateBannerInput = z.infer<typeof CreateBannerSchema>;
export type UpdateBannerInput = z.infer<typeof UpdateBannerSchema>;
