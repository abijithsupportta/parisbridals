/**
 * Customer Service
 *
 * Business logic layer for customer entities.
 *
 * @module services/customerService
 */

import { RepositoryResult, customerRepository } from '@/repository';
import { 
  Customer,
  CreateCustomerDTO, 
  UpdateCustomerDTO,
  CustomerSearchParams,
  CustomerSearchResult
} from '@/domain';

export class CustomerService {
  private currentUserId: string | null = null;
  private currentBranchId: string | null = null;

  /**
   * Set user context for audit logging
   */
  setUserContext(userId: string | null, branchId: string | null): void {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    customerRepository.setUserContext(userId, branchId);
  }

  /**
   * Get all customers
   */
  async getAllCustomers(params?: CustomerSearchParams): Promise<RepositoryResult<CustomerSearchResult>> {
    return await customerRepository.findAll(params);
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<RepositoryResult<Customer>> {
    return await customerRepository.findById(id);
  }

  /**
   * Get customer by phone
   */
  async getCustomerByPhone(phone: string): Promise<RepositoryResult<Customer>> {
    return await customerRepository.findByPhone(phone);
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerDTO): Promise<RepositoryResult<Customer>> {
    // Validate required fields
    if (!data.name) {
      return {
        data: null,
        error: {
          message: 'Customer name is required',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    if (!data.phone) {
      return {
        data: null,
        error: {
          message: 'Customer phone is required',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Check if phone already exists
    const existingCustomer = await customerRepository.findByPhone(data.phone);
    if (existingCustomer.success && existingCustomer.data) {
      return {
        data: null,
        error: {
          message: 'A customer with this phone number already exists',
          code: 'PHONE_EXISTS'
        } as any,
        success: false,
      };
    }

    return await customerRepository.create(data);
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(id: string, data: UpdateCustomerDTO): Promise<RepositoryResult<Customer>> {
    // Check if customer exists
    const existingCustomer = await customerRepository.findById(id);
    if (!existingCustomer.success || !existingCustomer.data) {
      return {
        data: null,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    // If phone is being updated, check for duplicates
    if (data.phone && data.phone !== existingCustomer.data.phone) {
      const phoneCheck = await customerRepository.findByPhone(data.phone);
      if (phoneCheck.success && phoneCheck.data && phoneCheck.data.id !== id) {
        return {
          data: null,
          error: {
            message: 'A customer with this phone number already exists',
            code: 'PHONE_EXISTS'
          } as any,
          success: false,
        };
      }
    }

    return await customerRepository.update(id, data);
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string): Promise<RepositoryResult<boolean>> {
    // Check if customer exists
    const existingCustomer = await customerRepository.findById(id);
    if (!existingCustomer.success || !existingCustomer.data) {
      return {
        data: null,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    return await customerRepository.delete(id);
  }
}

// Singleton instance
export const customerService = new CustomerService();
