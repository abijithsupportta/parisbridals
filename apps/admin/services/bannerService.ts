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
  BannerSearchParams,
  BannerType,
  BannerPosition,
  BANNER_TYPE_LIMITS,
  validateBannerPosition
} from '@/domain';
import { bannerRepository } from '@/repository';

export class BannerService {
  private currentUserId: string | null = null;
  private currentStoreId: string | null = null;
  private currentBranchId: string | null = null;
 
  /**
   * Set user context for audit logging and multi-tenancy
   */
  setUserContext(userId: string | null, branchId: string | null, storeId: string | null = null): void {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    this.currentStoreId = storeId;
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

    // Set default banner type to hero if not provided
    const bannerType = data.banner_type || BannerType.HERO;

    // Check banner type limit
    const countResult = await bannerRepository.countByType(bannerType);
    if (!countResult.success) {
      return countResult as any;
    }

    const currentCount = countResult.data || 0;
    const maxLimit = BANNER_TYPE_LIMITS[bannerType];

    if (currentCount >= maxLimit) {
      return {
        data: null,
        error: {
          message: `${bannerType.charAt(0).toUpperCase() + bannerType.slice(1)} banner limit reached (${maxLimit}/${maxLimit}). Delete an existing ${bannerType} banner to add a new one.`,
          code: 'LIMIT_EXCEEDED'
        } as any,
        success: false,
      };
    }

    // Validate position for split banners
    if (bannerType === BannerType.SPLIT && data.position) {
      const positionCountResult = await bannerRepository.countByTypeAndPosition(bannerType, data.position);
      if (!positionCountResult.success) {
        return positionCountResult as any;
      }

      if (positionCountResult.data && positionCountResult.data > 0) {
        return {
          data: null,
          error: {
            message: `Split banner already has a ${data.position} position. Choose '${data.position === BannerPosition.LEFT ? BannerPosition.RIGHT : BannerPosition.LEFT}' or delete the existing ${data.position} banner.`,
            code: 'POSITION_TAKEN'
          } as any,
          success: false,
        };
      }
    }

    // Validate position based on banner type
    const positionValidation = validateBannerPosition(bannerType, data.position || null);
    if (!positionValidation.valid) {
      return {
        data: null,
        error: {
          message: positionValidation.error || 'Invalid position',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate redirect configuration
    if (data.redirect_type === 'url') {
      if (!data.redirect_url) {
        return {
          data: null,
          error: {
            message: 'Redirect URL is required when redirect type is URL',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
    } else if (['category', 'subcategory', 'subvariant', 'product'].includes(data.redirect_type)) {
      if (!data.redirect_target_id) {
        return {
          data: null,
          error: {
            message: 'Redirect target ID is required for this redirect type',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
    }

    return await bannerRepository.create({
      ...data,
      banner_type: bannerType,
    });
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

    const currentBanner = existingBanner.data;
    const newBannerType = data.banner_type || currentBanner.banner_type;
    const newPosition = data.position !== undefined ? data.position : currentBanner.position;

    // Check if banner type is being changed
    if (data.banner_type && data.banner_type !== currentBanner.banner_type) {
      // Check if new type has available slots
      const countResult = await bannerRepository.countByType(newBannerType);
      if (!countResult.success) {
        return countResult as any;
      }

      const currentCount = countResult.data || 0;
      const maxLimit = BANNER_TYPE_LIMITS[newBannerType];

      // Subtract 1 if we're moving from the same type (we're replacing, not adding)
      const effectiveCount = currentBanner.banner_type === newBannerType ? currentCount : currentCount + 1;

      if (effectiveCount > maxLimit) {
        return {
          data: null,
          error: {
            message: `${newBannerType.charAt(0).toUpperCase() + newBannerType.slice(1)} banner limit reached (${maxLimit}/${maxLimit}). Delete an existing ${newBannerType} banner to change the type.`,
            code: 'LIMIT_EXCEEDED'
          } as any,
          success: false,
        };
      }
    }

    // Validate position for split banners if position is being changed
    if (newBannerType === BannerType.SPLIT && data.position && data.position !== currentBanner.position) {
      const positionCountResult = await bannerRepository.countByTypeAndPosition(newBannerType, data.position);
      if (!positionCountResult.success) {
        return positionCountResult as any;
      }

      if (positionCountResult.data && positionCountResult.data > 0) {
        return {
          data: null,
          error: {
            message: `Split banner already has a ${data.position} position. Choose '${data.position === BannerPosition.LEFT ? BannerPosition.RIGHT : BannerPosition.LEFT}' or delete the existing ${data.position} banner.`,
            code: 'POSITION_TAKEN'
          } as any,
          success: false,
        };
      }
    }

    // Validate position based on banner type
    const positionValidation = validateBannerPosition(newBannerType, newPosition);
    if (!positionValidation.valid) {
      return {
        data: null,
        error: {
          message: positionValidation.error || 'Invalid position',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate redirect configuration if changed
    if (data.redirect_type === 'url') {
      if (!data.redirect_url) {
        return {
          data: null,
          error: {
            message: 'Redirect URL is required when redirect type is URL',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
    } else if (data.redirect_type && ['category', 'subcategory', 'subvariant', 'product'].includes(data.redirect_type)) {
      if (!data.redirect_target_id) {
        return {
          data: null,
          error: {
            message: 'Redirect target ID is required for this redirect type',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
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

  /**
   * Get remaining slots for each banner type
   */
  async getRemainingSlots(): Promise<RepositoryResult<Record<BannerType, number>>> {
    const heroCount = await bannerRepository.countByType(BannerType.HERO);
    const editorialCount = await bannerRepository.countByType(BannerType.EDITORIAL);
    const splitCount = await bannerRepository.countByType(BannerType.SPLIT);

    if (!heroCount.success || !editorialCount.success || !splitCount.success) {
      return {
        data: null,
        error: {
          message: 'Failed to fetch banner counts',
          code: 'FETCH_ERROR'
        } as any,
        success: false,
      };
    }

    return {
      success: true,
      data: {
        [BannerType.HERO]: BANNER_TYPE_LIMITS[BannerType.HERO] - (heroCount.data || 0),
        [BannerType.EDITORIAL]: BANNER_TYPE_LIMITS[BannerType.EDITORIAL] - (editorialCount.data || 0),
        [BannerType.SPLIT]: BANNER_TYPE_LIMITS[BannerType.SPLIT] - (splitCount.data || 0),
      },
      error: null,
    };
  }

  /**
   * Check if a banner type can be created
   */
  async canCreateBanner(bannerType: BannerType): Promise<RepositoryResult<{ canCreate: boolean; reason?: string }>> {
    const countResult = await bannerRepository.countByType(bannerType);
    if (!countResult.success) {
      return countResult as any;
    }

    const currentCount = countResult.data || 0;
    const maxLimit = BANNER_TYPE_LIMITS[bannerType];

    if (currentCount >= maxLimit) {
      return {
        success: true,
        data: {
          canCreate: false,
          reason: `${bannerType.charAt(0).toUpperCase() + bannerType.slice(1)} banner limit reached (${maxLimit}/${maxLimit})`,
        },
        error: null,
      };
    }

    return {
      success: true,
      data: { canCreate: true },
      error: null,
    };
  }
}

// Singleton instance
export const bannerService = new BannerService();
