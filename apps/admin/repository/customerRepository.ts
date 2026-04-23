/**
 * Customer Repository
 *
 * Data access layer for customer entities using Supabase.
 *
 * @module repository/customerRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { Customer } from '@/domain';

export interface CreateCustomerDTO {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerDTO {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface CustomerSearchParams {
  query?: string;
  limit?: number;
  offset?: number;
}

export class CustomerRepository extends BaseRepository {
  private readonly tableName = 'customers';

  /**
   * Find all customers
   */
  async findAll(params?: CustomerSearchParams): Promise<RepositoryResult<Customer[]>> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.query) {
      query = query.or(`name.ilike.%${params.query}%,phone.ilike.%${params.query}%,email.ilike.%${params.query}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const response = await query;
    return this.handleResponse<Customer[]>(response);
  }

  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<RepositoryResult<Customer>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    return this.handleResponse<Customer>(response);
  }

  /**
   * Find customer by phone
   */
  async findByPhone(phone: string): Promise<RepositoryResult<Customer>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    return this.handleResponse<Customer>(response);
  }

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerDTO): Promise<RepositoryResult<Customer>> {
    const response = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        created_by: this.currentUserId,
        created_at_branch_id: this.currentBranchId,
      })
      .select()
      .single();

    return this.handleResponse<Customer>(response);
  }

  /**
   * Update an existing customer
   */
  async update(id: string, data: UpdateCustomerDTO): Promise<RepositoryResult<Customer>> {
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

    return this.handleResponse<Customer>(response);
  }

  /**
   * Delete a customer
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return this.handleResponse<void>(response);
  }

  /**
   * Count customers
   */
  async count(params?: CustomerSearchParams): Promise<RepositoryResult<number>> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (params?.query) {
      query = query.or(`name.ilike.%${params.query}%,phone.ilike.%${params.query}%,email.ilike.%${params.query}%`);
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
}

// Singleton instance
export const customerRepository = new CustomerRepository();
