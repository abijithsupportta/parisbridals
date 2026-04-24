/**
 * Banner Repository
 *
 * Data access layer for banner entities using Supabase.
 *
 * @module repository/bannerRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Banner, 
  CreateBannerDTO, 
  UpdateBannerDTO,
  BannerSearchParams
} from '@/domain';

export class BannerRepository extends BaseRepository {
  private readonly tableName = 'banners';

  /**
   * Find all banners
   */
  async findAll(params?: BannerSearchParams): Promise<RepositoryResult<Banner[]>> {
    let query = this.client
      .from(this.tableName)
      .select('*');

    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }

    if (params?.redirect_type) {
      query = query.eq('redirect_type', params.redirect_type);
    }

    if (params?.banner_type) {
      query = query.eq('banner_type', params.banner_type);
    }

    // Order by banner_type, then position (if exists), then priority
    query = query.order('banner_type', { ascending: true });
    
    if (params?.banner_type) {
      // If filtering by type, order by position then priority
      query = query.order('position', { ascending: true, nullsFirst: false });
    }
    
    query = query.order('priority', { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const response = await query;
    return this.handleResponse<Banner[]>(response);
  }

  /**
   * Find banner by ID
   */
  async findById(id: string): Promise<RepositoryResult<Banner>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    return this.handleResponse<Banner>(response);
  }

  /**
   * Create a new banner
   */
  async create(data: CreateBannerDTO): Promise<RepositoryResult<Banner>> {
    const response = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        created_by: this.currentUserId,
        created_at_branch_id: this.currentBranchId,
      })
      .select()
      .single();

    return this.handleResponse<Banner>(response);
  }

  /**
   * Update an existing banner
   */
  async update(id: string, data: UpdateBannerDTO): Promise<RepositoryResult<Banner>> {
    const response = await this.client
      .from(this.tableName)
      .update({
        ...data,
        updated_by: this.currentUserId,
        updated_at_branch_id: this.currentBranchId,
      })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<Banner>(response);
  }

  /**
   * Delete a banner
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return this.handleResponse<void>(response);
  }

  /**
   * Count banners
   */
  async count(params?: BannerSearchParams): Promise<RepositoryResult<number>> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }

    if (params?.redirect_type) {
      query = query.eq('redirect_type', params.redirect_type);
    }

    if (params?.banner_type) {
      query = query.eq('banner_type', params.banner_type);
    }

    const response = await query;
    
    if (response.error) {
      return {
        success: false,
        data: null,
        error: response.error,
      };
    }
    
    return {
      success: true,
      data: response.count || 0,
      error: null,
    };
  }

  /**
   * Count banners by type
   */
  async countByType(bannerType: string): Promise<RepositoryResult<number>> {
    const response = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('banner_type', bannerType);

    if (response.error) {
      return {
        success: false,
        data: null,
        error: response.error,
      };
    }
    
    return {
      success: true,
      data: response.count || 0,
      error: null,
    };
  }

  /**
   * Count banners by type and position
   */
  async countByTypeAndPosition(bannerType: string, position: string): Promise<RepositoryResult<number>> {
    const response = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('banner_type', bannerType)
      .eq('position', position);

    if (response.error) {
      return {
        success: false,
        data: null,
        error: response.error,
      };
    }
    
    return {
      success: true,
      data: response.count || 0,
      error: null,
    };
  }
}

// Singleton instance
export const bannerRepository = new BannerRepository();
