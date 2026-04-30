/**
 * Staff Repository
 *
 * Data access layer for the staff table.
 *
 * @module repository/staffRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { Staff, StaffWithBranch, CreateStaffDTO, UpdateStaffDTO } from '@/domain/types/branch';

export class StaffRepository extends BaseRepository {
  private readonly tableName = 'staff';

  async findAll(storeId: string): Promise<RepositoryResult<StaffWithBranch[]>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*, branch:branches!staff_branch_id_fkey(id, name)')
      .eq('store_id', storeId)
      .order('name');

    return this.handleResponse<StaffWithBranch[]>({ data, error });
  }

  async findByBranch(branchId: string): Promise<RepositoryResult<Staff[]>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('branch_id', branchId)
      .order('name');

    return this.handleResponse<Staff[]>({ data, error });
  }

  async findById(id: string): Promise<RepositoryResult<StaffWithBranch>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*, branch:branches!staff_branch_id_fkey(id, name)')
      .eq('id', id)
      .single();

    return this.handleResponse<StaffWithBranch>({ data, error });
  }

  async findByEmail(email: string): Promise<RepositoryResult<Staff | null>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    return this.handleResponse<Staff | null>({ data, error });
  }

  async create(data: CreateStaffDTO): Promise<RepositoryResult<Staff>> {
    const { data: staff, error } = await this.client
      .from(this.tableName)
      .insert({ ...data, ...this.getCreateAuditFields() })
      .select()
      .single();

    return this.handleResponse<Staff>({ data: staff, error });
  }

  async update(id: string, data: UpdateStaffDTO): Promise<RepositoryResult<Staff>> {
    const { data: staff, error } = await this.client
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString(), ...this.getUpdateAuditFields() })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<Staff>({ data: staff, error });
  }

  async delete(id: string): Promise<RepositoryResult<boolean>> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) return { data: null, error, success: false };
    return { data: true, error: null, success: true };
  }
}

export const staffRepository = new StaffRepository();
