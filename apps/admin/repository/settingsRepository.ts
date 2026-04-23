/**
 * Settings Repository
 *
 * Repository layer for settings entities.
 *
 * @module repository/settingsRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Setting, 
  CreateSettingDTO, 
  UpdateSettingDTO,
  SettingKey
} from '@/domain/types/settings';

export class SettingsRepository extends BaseRepository {
  private readonly tableName = 'settings';

  /**
   * Find a setting by store and key
   */
  async findByStoreAndKey(storeId: string, key: SettingKey): Promise<RepositoryResult<Setting | null>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('store_id', storeId)
      .eq('key', key)
      .maybeSingle();

    return this.handleResponse<Setting | null>(response);
  }

  /**
   * Find all settings for a store
   */
  async findAllByStore(storeId: string): Promise<RepositoryResult<Setting[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('store_id', storeId);

    return this.handleResponse<Setting[]>(response);
  }

  /**
   * Create or update a setting
   */
  async upsert(storeId: string, key: SettingKey, value: string, userId: string | null): Promise<RepositoryResult<Setting>> {
    // First try to find existing
    const existing = await this.findByStoreAndKey(storeId, key);
    
    if (existing.success && existing.data) {
      // Update existing
      const response = await this.client
        .from(this.tableName)
        .update({
          value,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.data.id)
        .select()
        .maybeSingle();

      return this.handleResponse<Setting>(response);
    } else {
      // Create new
      const response = await this.client
        .from(this.tableName)
        .insert({
          store_id: storeId,
          key,
          value,
          updated_by: userId,
        })
        .select()
        .maybeSingle();

      return this.handleResponse<Setting>(response);
    }
  }

  /**
   * Delete a setting
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return this.handleResponse<void>(response);
  }
}

// Singleton instance
export const settingsRepository = new SettingsRepository();
