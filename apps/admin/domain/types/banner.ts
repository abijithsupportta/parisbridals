/**
 * Banner Domain Types
 *
 * Type definitions for the banner domain.
 *
 * @module domain/types/banner
 */

// Core Banner Entity
export interface Banner {
  readonly id: string;
  readonly store_id: string | null;
  banner_type: BannerType;
  position: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  call_to_action: string | null;
  web_image_url: string;
  redirect_type: BannerRedirectType;
  redirect_target_id: string | null;
  redirect_url: string | null;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  alt_text: string | null;
  created_at: string;
  updated_at?: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

// Banner Redirect Type Enum
export enum BannerRedirectType {
  NONE = 'none',
  CATEGORY = 'category',
  SUBCATEGORY = 'subcategory',
  SUBVARIANT = 'subvariant',
  PRODUCT = 'product',
  URL = 'url',
}

// Banner Type Enum
export enum BannerType {
  HERO = 'hero',
  EDITORIAL = 'editorial',
  SPLIT = 'split',
}

// Banner Position Enum (for split banners)
export enum BannerPosition {
  LEFT = 'left',
  RIGHT = 'right',
}

// Banner Create DTO
export interface CreateBannerDTO {
  banner_type?: BannerType;
  position?: string | null;
  title?: string;
  subtitle?: string;
  description?: string;
  call_to_action?: string;
  web_image_url: string;
  redirect_type: BannerRedirectType;
  redirect_target_id?: string | null;
  redirect_url?: string | null;
  is_active?: boolean;
  priority?: number;
  start_date?: string | null;
  end_date?: string | null;
  alt_text?: string;
  store_id?: string;
}

// Banner Update DTO
export interface UpdateBannerDTO {
  banner_type?: BannerType;
  position?: string | null;
  title?: string;
  subtitle?: string;
  description?: string;
  call_to_action?: string;
  web_image_url?: string;
  redirect_type?: BannerRedirectType;
  redirect_target_id?: string | null;
  redirect_url?: string | null;
  is_active?: boolean;
  priority?: number;
  start_date?: string | null;
  end_date?: string | null;
  alt_text?: string;
}

// Banner Search Parameters
export interface BannerSearchParams {
  is_active?: boolean;
  redirect_type?: BannerRedirectType;
  banner_type?: BannerType;
  limit?: number;
  offset?: number;
}

// Banner Type Limits
export const BANNER_TYPE_LIMITS = {
  [BannerType.HERO]: 10,
  [BannerType.EDITORIAL]: 1,
  [BannerType.SPLIT]: 2,
} as const;

// Validate banner position based on type
export function validateBannerPosition(bannerType: BannerType, position: string | null): { valid: boolean; error?: string } {
  if (bannerType === BannerType.HERO) {
    if (!position) {
      return { valid: false, error: 'Position is required for hero banners' };
    }
    const posNum = parseInt(position, 10);
    if (isNaN(posNum) || posNum < 1 || posNum > 10) {
      return { valid: false, error: 'Hero banner position must be between 1 and 10' };
    }
  } else if (bannerType === BannerType.SPLIT) {
    if (!position) {
      return { valid: false, error: 'Position is required for split banners' };
    }
    if (position !== BannerPosition.LEFT && position !== BannerPosition.RIGHT) {
      return { valid: false, error: 'Split banner position must be "left" or "right"' };
    }
  }
  // Editorial banners don't require position
  return { valid: true };
}
