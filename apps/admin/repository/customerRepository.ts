/**
 * Customer Repository
 *
 * Data access layer for customer entities using Supabase.
 * Implements repository pattern for clean separation of concerns.
 *
 * @module repository/customerRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Customer, 
  CreateCustomerDTO, 
  UpdateCustomerDTO, 
  CustomerSearchParams, 
  CustomerSearchResult,
} from '@/domain';

export class CustomerRepository extends BaseRepository {
  private readonly tableName = 'customers';

  /**
   * Find all customers with optional filtering and pagination
   */
  async findAll(params: CustomerSearchParams = {}): Promise<RepositoryResult<CustomerSearchResult>> {
    const {
      query,
      phone,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = params;

    const offset = (page - 1) * limit;

    // Build filters
    const filters: Record<string, any> = {};
    if (phone) filters.phone = phone;

    // Build the main query
    let selectQuery = this.buildQuery(this.tableName, {
      select: '*',
      filters,
      orderBy: { column: sort_by, ascending: sort_order === 'asc' },
      limit,
      offset,
    });

    // Apply text search on name or email
    if (query) {
      selectQuery = (selectQuery as any).or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    // Get total count for pagination
    let countQuery = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
    
    // Apply basic filters to count query
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = (countQuery as any).eq(key, value);
        }
      });
    }

    if (query) {
      countQuery = (countQuery as any).or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    const { count: totalCount } = await countQuery;

    // Execute main query
    const response = await selectQuery;
    const { data, error } = response as any;
    const result = this.handleResponse<Customer[]>({ data, error });

    if (!result.success || !result.data) {
      return {
        data: null,
        error: result.error,
        success: false,
      };
    }

    const total = totalCount || 0;
    const totalPages = Math.ceil(total / limit);

    const searchResult: CustomerSearchResult = {
      customers: result.data,
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    };

    return {
      data: searchResult,
      error: null,
      success: true,
    };
  }

  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<RepositoryResult<Customer>> {
    return this.executeOperation<Customer>(async () => {
      const response = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
        
      return response;
    });
  }

  /**
   * Find customer by exact phone number
   */
  async findByPhone(phone: string): Promise<RepositoryResult<Customer>> {
    return this.executeOperation<Customer>(async () => {
      const response = await this.client
        .from(this.tableName)
        .select('*')
        .eq('phone', phone)
        .maybeSingle(); // Use maybeSingle to not error on 0 rows
        
      return response;
    });
  }

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerDTO): Promise<RepositoryResult<Customer>> {
    return this.executeOperation<Customer>(async () => {
      const response = await this.client
        .from(this.tableName)
        .insert([data])
        .select()
        .single();
        
      return response;
    });
  }

  /**
   * Update an existing customer
   */
  async update(id: string, data: UpdateCustomerDTO): Promise<RepositoryResult<Customer>> {
    return this.executeOperation<Customer>(async () => {
      const response = await this.client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      return response;
    });
  }

  /**
   * Delete a customer
   */
  async delete(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeOperation<boolean>(async () => {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: true, error: null };
    });
  }

  /**
   * Check if a customer has any existing orders
   * Used for delete safety check
   */
  async hasOrders(id: string): Promise<boolean> {
    const { count } = await this.client
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id);

    return (count || 0) > 0;
  }
}

// Export singleton instance
export const customerRepository = new CustomerRepository();
