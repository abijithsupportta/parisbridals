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
  title: string | null;
  subtitle: string | null;
  description: string | null;
  call_to_action: string | null;
  web_image_url: string;
  mobile_image_url: string | null;
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

// Banner Create DTO
export interface CreateBannerDTO {
  title?: string;
  subtitle?: string;
  description?: string;
  call_to_action?: string;
  web_image_url: string;
  mobile_image_url?: string;
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
  title?: string;
  subtitle?: string;
  description?: string;
  call_to_action?: string;
  web_image_url?: string;
  mobile_image_url?: string;
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
  limit?: number;
  offset?: number;
}
