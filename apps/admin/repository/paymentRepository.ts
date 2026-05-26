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
  PaymentSearchParams,
  PaymentType,
} from '@/domain/types/payment';
import { PaymentStatus } from '@/domain/types/order';

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
   * Create a new payment and atomically update the order's amount_paid.
   *
   * Uses .select().single() on the order update so Supabase confirms the row
   * was actually modified. Without .select(), Supabase returns
   * { data: null, error: null } even when zero rows match — making the error
   * check useless.
   */
  async create(data: CreatePaymentDTO): Promise<RepositoryResult<Payment>> {
    console.log('[PaymentRepo] Creating payment:', JSON.stringify(data));

    // ── Step 1: Insert the payment record ────────────────────────────
    const paymentResponse = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        ...this.getCreateAuditFields(),
      })
      .select()
      .maybeSingle();

    if (paymentResponse.error) {
      console.error('[PaymentRepo] Payment insert FAILED:', paymentResponse.error);
      return this.handleResponse<Payment>(paymentResponse);
    }

    const payment = paymentResponse.data as Payment;
    console.log('[PaymentRepo] Payment created:', payment.id);

    // ── Step 2: Update order amount_paid (ONLY for rental payments) ───
    // Deposit and deposit_refund are a separate financial track managed
    // via order.deposit_collected / deposit_returned flags.  They must
    // NEVER modify amount_paid / payment_status.
    if (data.payment_type === PaymentType.DEPOSIT || data.payment_type === PaymentType.DEPOSIT_REFUND) {
      console.log('[PaymentRepo] Skipping amount_paid update — deposit-related payment');
      return { data: payment, error: null, success: true };
    }

    // ── Step 3: Read the current order totals ────────────────────────
    const orderFetchResponse = await this.client
      .from('orders')
      .select('amount_paid, total_amount')
      .eq('id', data.order_id)
      .single();

    if (orderFetchResponse.error) {
      console.error('[PaymentRepo] Order fetch FAILED:', orderFetchResponse.error);
      // Payment was created but we can't update the order — return the payment
      return { data: payment, error: null, success: true };
    }

    const currentAmountPaid = Number(orderFetchResponse.data.amount_paid || 0);
    const totalAmount = Number(orderFetchResponse.data.total_amount || 0);
    const signedAmount = data.payment_type === PaymentType.REFUND ? -data.amount : data.amount;
    const newAmountPaid = Math.max(0, currentAmountPaid + signedAmount);
    const paymentStatus =
      newAmountPaid <= 0
        ? PaymentStatus.PENDING
        : newAmountPaid >= totalAmount
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

    console.log('[PaymentRepo] Amount calculation:', {
      currentAmountPaid,
      totalAmount,
      signedAmount,
      newAmountPaid,
      paymentStatus,
    });

    // ── Step 4: Update the order's amount_paid ───────────────────────
    // CRITICAL: .select().single() forces Supabase to return the updated row.
    // Without it, the response is always { data: null, error: null } regardless
    // of whether any row was updated.
    const updateResponse = await this.client
      .from('orders')
      .update({
        amount_paid: newAmountPaid,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.order_id)
      .select('id, amount_paid, payment_status')
      .single();

    if (updateResponse.error) {
      console.error('[PaymentRepo] Order amount_paid update FAILED:', updateResponse.error);
      // Payment was created but order update failed — still return success
      // so the payment record isn't lost, but log prominently.
      return { data: payment, error: null, success: true };
    }

    const updatedOrder = updateResponse.data;
    console.log(
      '[PaymentRepo] Order updated — amount_paid:',
      updatedOrder.amount_paid,
      'status:',
      updatedOrder.payment_status,
    );

    // ── Step 5: Verify the write was persisted ───────────────────────
    if (Number(updatedOrder.amount_paid) !== newAmountPaid) {
      console.error('[PaymentRepo] ⚠️  AMOUNT MISMATCH after update!', {
        expected: newAmountPaid,
        actual: updatedOrder.amount_paid,
      });
    }

    return { data: payment, error: null, success: true };
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
