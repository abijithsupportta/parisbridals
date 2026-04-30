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

    // Validate items
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
      
      const availCheck = await this.checkAvailability(item.product_id, data.rental_start_date, data.rental_end_date, data.branch_id);
      if (!availCheck.success) {
        return {
          data: null,
          error: availCheck.error,
          success: false
        };
      }
      if (availCheck.data!.available < item.quantity) {
        return {
          data: null,
          error: { message: `Insufficient availability for product. Only ${availCheck.data!.available} available.`, code: 'VALIDATION_ERROR' } as any,
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
    if (result.success && (data.payment_status || data.deposit_returned || data.status)) {
      await this.checkAndAutoComplete(id);
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
    if (result.success) {
      await this.checkAndAutoComplete(orderId);
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
}

// Singleton instance
export const orderService = new OrderService();
