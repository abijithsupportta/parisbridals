/**
 * Order Service
 *
 * Business logic layer for order entities.
 *
 * @module services/orderService
 */

import { RepositoryResult } from '@/repository';
import { 
  Order, 
  OrderWithRelations,
  OrderStatus,
  PaymentStatus,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderSearchParams,
  ReturnOrderDTO
} from '@/domain/types/order';
import { orderRepository } from '@/repository';
import { settingsService } from './settingsService';

export class OrderService {
  private currentUserId: string | null = null;
  private currentBranchId: string | null = null;

  /**
   * Set user context for audit logging
   */
  setUserContext(userId: string | null, branchId: string | null): void {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    orderRepository.setUserContext(userId, branchId);
  }

  /**
   * Get all orders
   */
  async getAllOrders(params?: OrderSearchParams): Promise<RepositoryResult<OrderWithRelations[]>> {
    return await orderRepository.findAll(params);
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<RepositoryResult<OrderWithRelations>> {
    return await orderRepository.findById(id);
  }

  /**
   * Check product availability for given date range (Sweep Line)
   */
  async checkAvailability(productId: string, startDate: string, endDate: string, branchId?: string, excludeOrderId?: string): Promise<RepositoryResult<{ available: number; total: number; peakReserved: number; overlappingOrders: any[] }>> {
    return await orderRepository.checkAvailability(productId, startDate, endDate, branchId, excludeOrderId);
  }

  /**
   * Get per-day availability calendar for a product
   */
  async getProductAvailabilityCalendar(productId: string, rangeStart: string, rangeEnd: string) {
    return await orderRepository.getAvailabilityCalendar(productId, rangeStart, rangeEnd);
  }

  /**
   * Batch-check availability for multiple items in a single DB round-trip.
   * Replaces N individual checkAvailability() calls with 2 queries total.
   */
  async checkBatchAvailability(
    items: { product_id: string; quantity: number }[],
    startDate: string,
    endDate: string,
    branchId?: string,
    excludeOrderId?: string
  ) {
    return await orderRepository.checkBatchAvailability(items, startDate, endDate, branchId, excludeOrderId);
  }

  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    // Validate required fields
    if (!data.customer_id) {
      return {
        data: null,
        error: {
          message: 'Customer ID is required',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    if (!data.branch_id) {
      return {
        data: null,
        error: {
          message: 'Branch ID is required',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    if (!data.items || data.items.length === 0) {
      return {
        data: null,
        error: {
          message: 'Order must have at least one item',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    if (!data.rental_start_date || !data.rental_end_date) {
      return {
        data: null,
        error: {
          message: 'Rental start and end dates are required',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate rental dates
    const startDate = new Date(data.rental_start_date);
    const endDate = new Date(data.rental_end_date);
    
    if (startDate >= endDate) {
      return {
        data: null,
        error: {
          message: 'Rental end date must be after start date',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate item fields (synchronous — no DB calls)
    for (const item of data.items) {
      if (!item.product_id) {
        return {
          data: null,
          error: {
            message: 'Product ID is required for all items',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
      if (!item.quantity || item.quantity < 1) {
        return {
          data: null,
          error: {
            message: 'Quantity must be at least 1',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
      if (!item.price_per_day || item.price_per_day < 0) {
        return {
          data: null,
          error: {
            message: 'Rent price must be a positive number',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
    }

    // Check availability for ALL items in a SINGLE BATCH (2 DB queries total)
    // Before: N items × 2 queries each = 2N DB round-trips
    // After:  1 batch = 2 DB queries (products + overlapping bookings)
    const batchResult = await orderRepository.checkBatchAvailability(
      data.items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
      data.rental_start_date,
      data.rental_end_date,
      data.branch_id
    );

    if (!batchResult.success || !batchResult.data) {
      return { data: null, error: batchResult.error, success: false };
    }

    for (const item of data.items) {
      const avail = batchResult.data.results.get(item.product_id);
      if (!avail) {
        return {
          data: null,
          error: { message: `Product ${item.product_id} not found`, code: 'VALIDATION_ERROR' } as any,
          success: false
        };
      }
      if (avail.available < item.quantity) {
        return {
          data: null,
          error: { message: `Insufficient availability for product. Only ${avail.available} available.`, code: 'VALIDATION_ERROR' } as any,
          success: false
        };
      }
    }

    // Get GST settings
    const [gstResult, isGstEnabledResult] = await Promise.all([
      settingsService.getGSTPercentage(),
      settingsService.getIsGSTEnabled()
    ]);
    
    const isGstEnabled = isGstEnabledResult.success && isGstEnabledResult.data;
    const gstPercentage = (isGstEnabled && gstResult.success) ? gstResult.data || 0 : 0;

    return await orderRepository.create(data, gstPercentage);
  }

  /**
   * Update an existing order
   */
  async updateOrder(id: string, data: UpdateOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    // Check if order exists
    const existingOrder = await orderRepository.findById(id);
    if (!existingOrder.success || !existingOrder.data) {
      return {
        data: null,
        error: {
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    // Validate status transitions
    if (data.status) {
      const currentStatus = existingOrder.data.status;
      const newStatus = data.status;

      // Define allowed transitions
      const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.DELIVERED, OrderStatus.ONGOING, OrderStatus.CANCELLED], // legacy fallback
        [OrderStatus.SCHEDULED]: [OrderStatus.DELIVERED, OrderStatus.ONGOING, OrderStatus.CANCELLED],
        [OrderStatus.DELIVERED]: [OrderStatus.IN_USE, OrderStatus.ONGOING, OrderStatus.CANCELLED],
        [OrderStatus.IN_USE]: [OrderStatus.RETURNED, OrderStatus.LATE_RETURN, OrderStatus.PARTIAL, OrderStatus.FLAGGED],
        [OrderStatus.ONGOING]: [OrderStatus.RETURNED, OrderStatus.LATE_RETURN, OrderStatus.PARTIAL, OrderStatus.FLAGGED],
        [OrderStatus.PARTIAL]: [OrderStatus.RETURNED, OrderStatus.COMPLETED, OrderStatus.FLAGGED],
        [OrderStatus.FLAGGED]: [OrderStatus.RETURNED, OrderStatus.COMPLETED],
        [OrderStatus.RETURNED]: [OrderStatus.COMPLETED],
        [OrderStatus.LATE_RETURN]: [OrderStatus.COMPLETED, OrderStatus.FLAGGED],
        [OrderStatus.COMPLETED]: [],
        [OrderStatus.CANCELLED]: [],
      };

      if (!allowedTransitions[currentStatus].includes(newStatus)) {
        return {
          data: null,
          error: {
            message: `Cannot transition from ${currentStatus} to ${newStatus}`,
            code: 'INVALID_STATUS_TRANSITION'
          } as any,
          success: false,
        };
      }
    }

    // Validate rental dates if provided
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (startDate >= endDate) {
        return {
          data: null,
          error: {
            message: 'Rental end date must be after start date',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
    }

    // Block financial adjustments on finalized orders
    const currentStatus = existingOrder.data.status;
    if (currentStatus === OrderStatus.COMPLETED || currentStatus === OrderStatus.CANCELLED) {
      const financialFields = ['security_deposit', 'discount', 'late_fee', 'damage_charges_total', 'total_amount', 'subtotal'];
      const attemptedFinancialChange = financialFields.some(field => (data as any)[field] !== undefined);
      if (attemptedFinancialChange) {
        return {
          data: null,
          error: {
            message: `Cannot modify financial fields on a ${currentStatus} order`,
            code: 'ORDER_FINALIZED'
          } as any,
          success: false,
        };
      }
    }

    const result = await orderRepository.update(id, data);

    // After any update that changes payment_status or deposit_returned, check auto-complete
    // Fire-and-forget: don't block the response for a background status check
    if (result.success && (data.payment_status || data.deposit_returned || data.status)) {
      this.checkAndAutoComplete(id).catch(() => {
        // Auto-complete is best-effort; log but don't fail the request
      });
    }

    return result;
  }

  /**
   * Delete an order
   */
  async deleteOrder(id: string): Promise<RepositoryResult<void>> {
    // Check if order exists
    const existingOrder = await orderRepository.findById(id);
    if (!existingOrder.success || !existingOrder.data) {
      return {
        data: null,
        error: {
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    return await orderRepository.delete(id);
  }

  /**
   * Get order status history
   */
  async getOrderStatusHistory(orderId: string): Promise<RepositoryResult<any[]>> {
    return await orderRepository.getStatusHistory(orderId);
  }

  /**
   * Count orders
   */
  async countOrders(params?: OrderSearchParams): Promise<RepositoryResult<number>> {
    return await orderRepository.count(params);
  }

  /**
   * Process order return with condition assessment
   */
  async processOrderReturn(orderId: string, returnData: ReturnOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    // Check if order exists
    const existingOrder = await orderRepository.findById(orderId);
    if (!existingOrder.success || !existingOrder.data) {
      return {
        data: null,
        error: {
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    // Validate order is in correct status for return
    const currentStatus = existingOrder.data.status;
    if (currentStatus !== OrderStatus.IN_USE && currentStatus !== OrderStatus.ONGOING && currentStatus !== OrderStatus.LATE_RETURN && currentStatus !== OrderStatus.PARTIAL) {
      return {
        data: null,
        error: {
          message: 'Order must be in use, ongoing, partial, or late return to process return',
          code: 'INVALID_STATUS'
        } as any,
        success: false,
      };
    }

    // Validate return data
    if (!returnData.items || returnData.items.length === 0) {
      return {
        data: null,
        error: {
          message: 'Return data must include at least one item',
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Validate items
    for (const item of returnData.items) {
      if (!item.item_id) {
        return {
          data: null,
          error: {
            message: 'Item ID is required for all return items',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
      if (!item.condition_rating) {
        return {
          data: null,
          error: {
            message: 'Condition rating is required for all items',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
      if (item.damage_charges && item.damage_charges < 0) {
        return {
          data: null,
          error: {
            message: 'Damage charges cannot be negative',
            code: 'VALIDATION_ERROR'
          } as any,
          success: false,
        };
      }
    }

    const result = await orderRepository.processReturn(orderId, returnData);

    // After return processing, check if both tracks are done for auto-complete
    // Fire-and-forget: don't block the response for a background status check
    if (result.success) {
      this.checkAndAutoComplete(orderId).catch(() => {
        // Auto-complete is best-effort; log but don't fail the request
      });
    }

    return result;
  }

  /**
   * Mark deposit as returned
   */
  async markDepositReturned(orderId: string): Promise<RepositoryResult<OrderWithRelations>> {
    // Check if order exists
    const existingOrder = await orderRepository.findById(orderId);
    if (!existingOrder.success || !existingOrder.data) {
      return {
        data: null,
        error: {
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    // Validate order is in correct status
    const currentStatus = existingOrder.data.status;
    if (currentStatus !== OrderStatus.RETURNED && currentStatus !== OrderStatus.LATE_RETURN && currentStatus !== OrderStatus.COMPLETED) {
      return {
        data: null,
        error: {
          message: 'Order must be returned or completed to mark deposit as returned',
          code: 'INVALID_STATUS'
        } as any,
        success: false,
      };
    }

    // Check if deposit already returned
    if (existingOrder.data.deposit_returned) {
      return {
        data: null,
        error: {
          message: 'Deposit has already been returned',
          code: 'ALREADY_RETURNED'
        } as any,
        success: false,
      };
    }

    return await orderRepository.markDepositReturned(orderId);
  }

  /**
   * Check if both item and payment tracks are complete, and auto-transition to 'completed'.
   * Called server-side after:
   *   1. processReturn() sets status to 'returned'
   *   2. A payment is recorded that makes payment_status = 'paid'
   *   3. Deposit is refunded
   *
   * Conditions for auto-complete:
   *   - status === 'returned'
   *   - payment_status === 'paid'
   *   - deposit_returned === true OR security_deposit === 0
   */
  async checkAndAutoComplete(orderId: string): Promise<void> {
    const orderResult = await orderRepository.findById(orderId);
    if (!orderResult.success || !orderResult.data) return;

    const order = orderResult.data;

    const itemsDone = order.status === OrderStatus.RETURNED;
    const paymentDone = order.payment_status === PaymentStatus.PAID;
    const depositDone = order.deposit_returned || (order.security_deposit || 0) === 0;

    if (itemsDone && paymentDone && depositDone) {
      await orderRepository.update(orderId, { status: OrderStatus.COMPLETED } as any);
      // Add status history entry
      await orderRepository.addStatusHistory(orderId, OrderStatus.COMPLETED, 'Auto-completed: items returned + payment settled');
    }
  }

  /**
   * Auto-cancel scheduled orders that were not collected.
   *
   * Business rule: If an order has status 'scheduled' and its rental_start_date
   * has already passed (i.e. the customer didn't pick up by end of day),
   * the order is automatically cancelled the next day.
   *
   * This should be called daily via a cron job (Vercel cron or manual trigger).
   *
   * @returns List of cancelled order IDs and the count
   */
  async autoCancelExpiredScheduledOrders(): Promise<RepositoryResult<{ cancelledIds: string[]; count: number }>> {
    try {
      // Use IST (India Standard Time) since this is a single-location Indian business
      const now = new Date();
      // Get today's date in IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const todayIST = istNow.toISOString().split('T')[0]; // YYYY-MM-DD

      console.log(`[OrderService] Auto-cancel check: today (IST) = ${todayIST}`);

      // Find all scheduled orders where rental_start_date < today
      // This means: the pickup day has passed and the customer never showed up
      const result = await orderRepository.findExpiredScheduledOrders(todayIST);

      if (!result.success) {
        console.error('[OrderService] Failed to fetch expired scheduled orders:', result.error);
        return {
          data: null,
          error: { message: result.error?.message || 'Query failed', code: 'QUERY_FAILED' } as any,
          success: false,
        };
      }

      const expiredOrders = result.data || [];

      if (expiredOrders.length === 0) {
        console.log('[OrderService] No expired scheduled orders found');
        return { data: { cancelledIds: [], count: 0 }, error: null, success: true };
      }

      console.log(`[OrderService] Found ${expiredOrders.length} expired scheduled orders to cancel`);

      const cancelledIds: string[] = [];

      for (const order of expiredOrders) {
        try {
          // Cancel the order
          await orderRepository.update(order.id, {
            status: OrderStatus.CANCELLED,
            updated_at: new Date().toISOString(),
          } as any);

          // Log to status history
          await orderRepository.addStatusHistory(
            order.id,
            OrderStatus.CANCELLED,
            `Auto-cancelled: scheduled for ${order.rental_start_date} but not collected`
          );

          // Restore reserved inventory (release the reserved stock)
          await orderRepository.restoreOrderStock(order.id);

          cancelledIds.push(order.id);
          console.log(`[OrderService] Auto-cancelled order ${order.id} (was scheduled for ${order.rental_start_date})`);
        } catch (orderErr) {
          console.error(`[OrderService] Failed to auto-cancel order ${order.id}:`, orderErr);
          // Continue with next order — don't let one failure block others
        }
      }

      console.log(`[OrderService] Auto-cancel complete: ${cancelledIds.length}/${expiredOrders.length} orders cancelled`);

      return {
        data: { cancelledIds, count: cancelledIds.length },
        error: null,
        success: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[OrderService] autoCancelExpiredScheduledOrders error:', message);
      return {
        data: null,
        error: { message, code: 'AUTO_CANCEL_FAILED' } as any,
        success: false,
      };
    }
  }
}

// Singleton instance
export const orderService = new OrderService();
