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

    // Block non-refund payments for cancelled/completed orders
    if (data.payment_type !== PaymentType.REFUND) {
      const { orderRepository } = await import('@/repository');
      const orderCheck = await orderRepository.findById(data.order_id);
      if (orderCheck.success && orderCheck.data) {
        const orderStatus = orderCheck.data.status;
        if (orderStatus === 'completed' || orderStatus === 'cancelled') {
          return {
            data: null,
            error: { message: `Cannot collect payment for a ${orderStatus} order`, code: 'ORDER_FINALIZED' } as any,
            success: false,
          };
        }
      }
    }

    // For refund payments, validate amount does not exceed what's refundable
    if (data.payment_type === PaymentType.REFUND) {
      const { orderRepository } = await import('@/repository');
      const orderResult = await orderRepository.findById(data.order_id);
      if (!orderResult.success || !orderResult.data) {
        return {
          data: null,
          error: { message: 'Order not found', code: 'ORDER_NOT_FOUND' } as any,
          success: false,
        };
      }
      const order = orderResult.data;
      // Total refundable = rental payments + unreturned deposit
      const refundableDeposit = (order.deposit_collected && !order.deposit_returned && (order.security_deposit || 0) > 0)
        ? order.security_deposit
        : 0;
      const totalRefundable = (order.amount_paid || 0) + refundableDeposit;
      if (data.amount > totalRefundable) {
        return {
          data: null,
          error: { message: `Refund amount (${data.amount}) exceeds total refundable (${totalRefundable})`, code: 'VALIDATION_ERROR' } as any,
          success: false,
        };
      }
    }

    paymentRepository.setUserContext(this.currentUserId, this.currentBranchId);
    const result = await paymentRepository.create(data);

    // After successfully creating a refund, atomically update the order's state
    if (result.success && result.data && data.payment_type === PaymentType.REFUND) {
      const { orderRepository } = await import('@/repository');
      const orderResult = await orderRepository.findById(data.order_id);
      if (orderResult.success && orderResult.data) {
        const order = orderResult.data;
        const isDepositRefund = data.notes?.toLowerCase().includes('deposit');

        if (isDepositRefund) {
          // If it's a deposit refund, update the deposit status but don't touch amount_paid
          await orderRepository.update(data.order_id, {
            deposit_returned: true,
            deposit_returned_at: new Date().toISOString(),
          } as any);
        } else {
          // If it's a rental refund, update amount_paid
          const newAmountPaid = Math.max(0, (order.amount_paid || 0) - data.amount);
          const newPaymentStatus = newAmountPaid >= order.total_amount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';
          await orderRepository.update(data.order_id, {
            amount_paid: newAmountPaid,
            payment_status: newPaymentStatus,
          } as any);
        }
      }
    }

    // After any non-refund, non-adjustment payment, check auto-complete
    if (result.success && data.payment_type !== PaymentType.REFUND && data.payment_type !== PaymentType.ADJUSTMENT) {
      try {
        const { orderService } = await import('./orderService');
        await orderService.checkAndAutoComplete(data.order_id);
      } catch {
        // Auto-complete is best-effort, don't fail the payment
      }
    }

    return result;
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
