/**
 * Payment Repository
 *
 * Repository layer for payment entities.
 *
 * @module repository/paymentRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Payment, 
  PaymentWithRelations, 
  CreatePaymentDTO, 
  UpdatePaymentDTO,
  PaymentSearchParams 
} from '@/domain/types/payment';

export class PaymentRepository extends BaseRepository {
  private readonly tableName = 'payments';
  protected useMultiBranchAuditFields = false;

  /**
   * Find a payment by ID
   */
  async findById(id: string): Promise<RepositoryResult<Payment>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return this.handleResponse<Payment>(response);
  }

  /**
   * Find all payments for an order
   */
  async findByOrderId(orderId: string): Promise<RepositoryResult<Payment[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*, staff:created_by(id, name)')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false });

    return this.handleResponse<Payment[]>(response);
  }

  /**
   * Find payments by type
   */
  async findByType(paymentType: string): Promise<RepositoryResult<Payment[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('payment_type', paymentType)
      .order('payment_date', { ascending: false });

    return this.handleResponse<Payment[]>(response);
  }

  /**
   * Find all payments with search parameters
   */
  async findAll(params: PaymentSearchParams = {}): Promise<RepositoryResult<Payment[]>> {
    let query = this.client
      .from(this.tableName)
      .select('*, staff:created_by(id, name)');

    if (params.order_id) {
      query = query.eq('order_id', params.order_id);
    }
    if (params.payment_type) {
      query = query.eq('payment_type', params.payment_type);
    }
    if (params.payment_mode) {
      query = query.eq('payment_mode', params.payment_mode);
    }
    if (params.from_date) {
      query = query.gte('payment_date', params.from_date);
    }
    if (params.to_date) {
      query = query.lte('payment_date', params.to_date);
    }

    query = query.order('payment_date', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const response = await query;
    return this.handleResponse<Payment[]>(response);
  }

  /**
   * Create a new payment
   */
  async create(data: CreatePaymentDTO): Promise<RepositoryResult<Payment>> {
    const response = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        ...this.getCreateAuditFields(),
      })
      .select()
      .maybeSingle();

    return this.handleResponse<Payment>(response);
  }

  /**
   * Update a payment
   */
  async update(id: string, data: UpdatePaymentDTO): Promise<RepositoryResult<Payment>> {
    const response = await this.client
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        ...this.getUpdateAuditFields(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    return this.handleResponse<Payment>(response);
  }

  /**
   * Delete a payment
   */
  async delete(id: string): Promise<RepositoryResult<boolean>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (response.error) {
      return { data: null, error: response.error, success: false };
    }
    return { data: true, error: null, success: true };
  }

  /**
   * Get total payments for an order
   */
  async getTotalForOrder(orderId: string): Promise<RepositoryResult<number>> {
    const response = await this.client
      .from(this.tableName)
      .select('amount')
      .eq('order_id', orderId);

    if (response.error) {
      return { data: null, error: response.error, success: false };
    }

    const total = (response.data || []).reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    return { data: total, error: null, success: true };
  }
}

// Singleton instance
export const paymentRepository = new PaymentRepository();
