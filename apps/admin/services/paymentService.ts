/**
 * Payment Service
 *
 * Business logic layer for payment entities.
 *
 * @module services/paymentService
 */

import { RepositoryResult } from '@/repository';
import { 
  Payment, 
  CreatePaymentDTO, 
  UpdatePaymentDTO,
  PaymentSearchParams,
  PaymentType,
  PaymentMode
} from '@/domain/types/payment';
import { paymentRepository } from '@/repository';

export class PaymentService {
  private currentUserId: string | null = null;
  private currentBranchId: string | null = null;

  /**
   * Set user context for audit logging
   */
  setUserContext(userId: string | null, branchId: string | null): void {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
  }

  /**
   * Get a payment by ID
   */
  async getPayment(id: string): Promise<RepositoryResult<Payment>> {
    return await paymentRepository.findById(id);
  }

  /**
   * Get all payments for an order
   */
  async getPaymentsByOrder(orderId: string): Promise<RepositoryResult<Payment[]>> {
    return await paymentRepository.findByOrderId(orderId);
  }

  /**
   * Get all payments with search parameters
   */
  async getAllPayments(params: PaymentSearchParams = {}): Promise<RepositoryResult<Payment[]>> {
    return await paymentRepository.findAll(params);
  }

  /**
   * Create a new payment
   */
  async createPayment(data: CreatePaymentDTO): Promise<RepositoryResult<Payment>> {
    // Validate amount
    if (data.amount <= 0) {
      return {
        data: null,
        error: {
          message: 'Payment amount must be greater than 0',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate payment mode
    if (!Object.values(PaymentMode).includes(data.payment_mode)) {
      return {
        data: null,
        error: {
          message: 'Invalid payment mode',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate payment type
    if (!Object.values(PaymentType).includes(data.payment_type)) {
      return {
        data: null,
        error: {
          message: 'Invalid payment type',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    paymentRepository.setUserContext(this.currentUserId, this.currentBranchId);
    return await paymentRepository.create(data);
  }

  /**
   * Update a payment
   */
  async updatePayment(id: string, data: UpdatePaymentDTO): Promise<RepositoryResult<Payment>> {
    // Validate payment mode if provided
    if (data.payment_mode && !Object.values(PaymentMode).includes(data.payment_mode)) {
      return {
        data: null,
        error: {
          message: 'Invalid payment mode',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    paymentRepository.setUserContext(this.currentUserId, this.currentBranchId);
    return await paymentRepository.update(id, data);
  }

  /**
   * Delete a payment
   */
  async deletePayment(id: string): Promise<RepositoryResult<boolean>> {
    return await paymentRepository.delete(id);
  }

  /**
   * Get total payments for an order
   */
  async getTotalForOrder(orderId: string): Promise<RepositoryResult<number>> {
    return await paymentRepository.getTotalForOrder(orderId);
  }

  /**
   * Get deposit payment for an order
   */
  async getDepositPayment(orderId: string): Promise<RepositoryResult<Payment | null>> {
    const result = await paymentRepository.findByOrderId(orderId);
    if (!result.success) {
      return { data: null, error: result.error, success: false };
    }

    const deposit = (result.data || []).find(
      (p: Payment) => p.payment_type === PaymentType.DEPOSIT
    );

    return { data: deposit || null, error: null, success: true };
  }

  /**
   * Get final payment for an order
   */
  async getFinalPayment(orderId: string): Promise<RepositoryResult<Payment | null>> {
    const result = await paymentRepository.findByOrderId(orderId);
    if (!result.success) {
      return { data: null, error: result.error, success: false };
    }

    const final = (result.data || []).find(
      (p: Payment) => p.payment_type === PaymentType.FINAL
    );

    return { data: final || null, error: null, success: true };
  }
}

// Singleton instance
export const paymentService = new PaymentService();
