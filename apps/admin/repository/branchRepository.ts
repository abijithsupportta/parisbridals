/**
 * Branch Repository
 *
 * Data access layer for the branches table.
 *
 * @module repository/branchRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { Branch, BranchWithStaffCount, CreateBranchDTO, UpdateBranchDTO } from '@/domain/types/branch';

class BranchRepository extends BaseRepository {
  private readonly tableName = 'branches';

  async findAll(storeId: string): Promise<RepositoryResult<Branch[]>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('store_id', storeId)
      .order('is_main', { ascending: false })
      .order('name');

    return this.handleResponse<Branch[]>({ data, error });
  }

  async findAllWithStaffCount(storeId: string): Promise<RepositoryResult<BranchWithStaffCount[]>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*, staff(count)')
      .eq('store_id', storeId)
      .order('is_main', { ascending: false })
      .order('name');

    if (error) return this.handleResponse<BranchWithStaffCount[]>({ data: null, error });

    const mapped = (data || []).map((b: any) => ({
      ...b,
      staff_count: b.staff?.[0]?.count ?? 0,
      staff: undefined,
    }));

    return { data: mapped, error: null, success: true };
  }

  async findById(id: string): Promise<RepositoryResult<Branch>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    return this.handleResponse<Branch>({ data, error });
  }

  async create(data: CreateBranchDTO): Promise<RepositoryResult<Branch>> {
    const { data: branch, error } = await this.client
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    return this.handleResponse<Branch>({ data: branch, error });
  }

  async update(id: string, data: UpdateBranchDTO): Promise<RepositoryResult<Branch>> {
    const { data: branch, error } = await this.client
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<Branch>({ data: branch, error });
  }

  async delete(id: string): Promise<RepositoryResult<boolean>> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) return { data: null, error, success: false };
    return { data: true, error: null, success: true };
  }

  async canDelete(id: string): Promise<RepositoryResult<{ canDelete: boolean; reason?: string }>> {
    const { count, error } = await this.client
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', id);

    if (error) return { data: null, error, success: false };

    if ((count ?? 0) > 0) {
      return { data: { canDelete: false, reason: `Branch has ${count} staff member(s). Remove or reassign them first.` }, error: null, success: true };
    }

    return { data: { canDelete: true }, error: null, success: true };
  }
}

export const branchRepository = new BranchRepository();
