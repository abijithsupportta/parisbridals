/**
 * Settings Service
 *
 * Business logic layer for settings entities.
 *
 * @module services/settingsService
 */

import { RepositoryResult } from '@/repository';
import { 
  Setting, 
  SettingKey,
  UpdateSettingDTO
} from '@/domain/types/settings';
import { settingsRepository } from '@/repository';

export class SettingsService {
  private currentUserId: string | null = null;
  private currentBranchId: string | null = null;
  private storeId: string = '00000000-0000-0000-0000-000000000001'; // Default store ID - matches branchService pattern

  /**
   * Set user context for audit logging
   */
  setUserContext(userId: string | null, branchId: string | null): void {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
  }

  /**
   * Set store ID
   */
  setStoreId(storeId: string): void {
    this.storeId = storeId;
  }

  /**
   * Get GST percentage for the store
   */
  async getGSTPercentage(): Promise<RepositoryResult<number>> {
    const result = await settingsRepository.findByStoreAndKey(this.storeId, SettingKey.GST_PERCENTAGE);
    
    if (!result.success || !result.data) {
      // Return default GST if not set
      return {
        data: 18.0,
        error: null,
        success: true,
      };
    }

    const gstValue = parseFloat(result.data.value);
    if (isNaN(gstValue)) {
      return {
        data: 18.0,
        error: null,
        success: true,
      };
    }

    return {
      data: gstValue,
      error: null,
      success: true,
    };
  }

  /**
   * Set GST percentage for the store
   */
  async setGSTPercentage(percentage: number): Promise<RepositoryResult<Setting>> {
    // Validate GST percentage
    if (percentage < 0 || percentage > 100) {
      return {
        data: null,
        error: {
          message: 'GST percentage must be between 0 and 100',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Round to 2 decimal places
    const roundedPercentage = Math.round(percentage * 100) / 100;

    return await settingsRepository.upsert(
      this.storeId,
      SettingKey.GST_PERCENTAGE,
      roundedPercentage.toString(),
      this.currentUserId
    );
  }

  /**
   * Check if GST is enabled for the store
   */
  async getIsGSTEnabled(): Promise<RepositoryResult<boolean>> {
    const result = await settingsRepository.findByStoreAndKey(this.storeId, SettingKey.IS_GST_ENABLED);
    
    if (!result.success || !result.data) {
      // Default to false (disabled) if not set
      return {
        data: false,
        error: null,
        success: true,
      };
    }

    return {
      data: result.data.value === 'true',
      error: null,
      success: true,
    };
  }

  /**
   * Enable or disable GST for the store
   */
  async setIsGSTEnabled(isEnabled: boolean): Promise<RepositoryResult<Setting>> {
    return await settingsRepository.upsert(
      this.storeId,
      SettingKey.IS_GST_ENABLED,
      isEnabled ? 'true' : 'false',
      this.currentUserId
    );
  }

  /**
   * Set a generic string value for a setting key
   */
  async setValue(key: SettingKey, value: string): Promise<RepositoryResult<Setting>> {
    return await settingsRepository.upsert(
      this.storeId,
      key,
      value,
      this.currentUserId
    );
  }

  /**
   * Get all settings for the store
   */
  async getAllSettings(): Promise<RepositoryResult<Setting[]>> {
    return await settingsRepository.findAllByStore(this.storeId);
  }

  /**
   * Get a setting by key
   */
  async findByKey(key: string): Promise<RepositoryResult<Setting | null>> {
    const result = await settingsRepository.findByStoreAndKey(this.storeId, key as SettingKey);
    return result;
  }
}

// Singleton instance
export const settingsService = new SettingsService();
