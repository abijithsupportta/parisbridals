/**
 * Banner Service
 *
 * Business logic layer for banner entities.
 *
 * @module services/bannerService
 */

import { RepositoryResult } from '@/repository';
import { 
  Banner, 
  CreateBannerDTO, 
  UpdateBannerDTO,
  BannerSearchParams
} from '@/domain';
import { bannerRepository } from '@/repository';

export class BannerService {
  private currentUserId: string | null = null;
  private currentBranchId: string | null = null;

  /**
   * Set user context for audit logging
   */
  setUserContext(userId: string | null, branchId: string | null): void {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    bannerRepository.setUserContext(userId, branchId);
  }

  /**
   * Get all banners
   */
  async getAllBanners(params?: BannerSearchParams): Promise<RepositoryResult<Banner[]>> {
    return await bannerRepository.findAll(params);
  }

  /**
   * Get banner by ID
   */
  async getBannerById(id: string): Promise<RepositoryResult<Banner>> {
    return await bannerRepository.findById(id);
  }

  /**
   * Create a new banner
   */
  async createBanner(data: CreateBannerDTO): Promise<RepositoryResult<Banner>> {
    // Validate required fields
    if (!data.web_image_url) {
      return {
        data: null,
        error: {
          message: 'Web image URL is required',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate redirect type
    if (data.redirect_type === 'url' && !data.redirect_url) {
      return {
        data: null,
        error: {
          message: 'Redirect URL is required when redirect type is URL',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    if (data.redirect_type !== 'url' && data.redirect_type !== 'none' && !data.redirect_target_id) {
      return {
        data: null,
        error: {
          message: 'Redirect target ID is required for this redirect type',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    return await bannerRepository.create(data);
  }

  /**
   * Update an existing banner
   */
  async updateBanner(id: string, data: UpdateBannerDTO): Promise<RepositoryResult<Banner>> {
    // Check if banner exists
    const existingBanner = await bannerRepository.findById(id);
    if (!existingBanner.success || !existingBanner.data) {
      return {
        data: null,
        error: {
          message: 'Banner not found',
          code: 'BANNER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    // Validate redirect type if changed
    if (data.redirect_type === 'url' && !data.redirect_url) {
      return {
        data: null,
        error: {
          message: 'Redirect URL is required when redirect type is URL',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    if (data.redirect_type !== 'url' && data.redirect_type !== 'none' && !data.redirect_target_id) {
      return {
        data: null,
        error: {
          message: 'Redirect target ID is required for this redirect type',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    return await bannerRepository.update(id, data);
  }

  /**
   * Delete a banner
   */
  async deleteBanner(id: string): Promise<RepositoryResult<void>> {
    // Check if banner exists
    const existingBanner = await bannerRepository.findById(id);
    if (!existingBanner.success || !existingBanner.data) {
      return {
        data: null,
        error: {
          message: 'Banner not found',
          code: 'BANNER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    return await bannerRepository.delete(id);
  }

  /**
   * Count banners
   */
  async countBanners(params?: BannerSearchParams): Promise<RepositoryResult<number>> {
    return await bannerRepository.count(params);
  }
}

// Singleton instance
export const bannerService = new BannerService();
