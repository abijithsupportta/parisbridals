/**
 * Order Repository
 *
 * Data access layer for order entities using Supabase.
 *
 * @module repository/orderRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Order, 
  OrderWithRelations,
  OrderItem,
  OrderStatusHistory,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderSearchParams,
  ReturnOrderDTO
} from '@/domain/types/order';

export class OrderRepository extends BaseRepository {
  private readonly tableName = 'orders';
  private readonly orderItemsTable = 'order_items';
  private readonly orderStatusHistoryTable = 'order_status_history';

  /**
   * Find all orders
   */
  async findAll(params?: OrderSearchParams): Promise<RepositoryResult<OrderWithRelations[]>> {
    let query = this.client
      .from(this.tableName)
      .select(`
        *,
        customer:customer_id(id, name, phone, email),
        items:order_items(*),
        branch:branch_id(id, name),
        store:branch_id!inner(store_id(id, name, address, phone, email, gstin))
      `)
      .order('created_at', { ascending: false });

    if (params?.customer_id) {
      query = query.eq('customer_id', params.customer_id);
    }

    if (params?.branch_id) {
      query = query.eq('branch_id', params.branch_id);
    }

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.query) {
      query = query.or(`customer.name.ilike.%${params.query}%,customer.phone.ilike.%${params.query}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const response = await query;
    return this.handleResponse<OrderWithRelations[]>(response);
  }

  /**
   * Check product availability for given date range
   */
  async checkAvailability(productId: string, startDate: string, endDate: string, branchId?: string): Promise<RepositoryResult<{ available: number; total: number }>> {
    // Get product total quantity
    const productResponse = await this.client
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .single();

    if (productResponse.error) {
      return this.handleResponse<{ available: number; total: number }>(productResponse);
    }

    const totalQuantity = productResponse.data?.quantity || 0;

    // Query existing orders that overlap with the requested date range
    // Overlap condition: (start1 <= end2) AND (end1 >= start2)
    const ordersResponse = await this.client
      .from('order_items')
      .select('quantity')
      .eq('product_id', productId)
      .gte('order(rental_start_date)', startDate)
      .lte('order(rental_start_date)', endDate);

    if (ordersResponse.error) {
      return this.handleResponse<{ available: number; total: number }>(ordersResponse);
    }

    const reservedQuantity = ordersResponse.data?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const availableQuantity = Math.max(0, totalQuantity - reservedQuantity);

    return {
      success: true,
      data: { available: availableQuantity, total: totalQuantity },
      error: null,
    };
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<RepositoryResult<OrderWithRelations>> {
    const response = await this.client
      .from(this.tableName)
      .select(`
        *,
        customer:customer_id(id, name, phone, email),
        items:order_items(*),
        branch:branch_id(id, name),
        store:branch_id!inner(store_id(id, name, address, phone, email, gstin))
      `)
      .eq('id', id)
      .single();

    return this.handleResponse<OrderWithRelations>(response);
  }

  /**
   * Create a new order with items
   */
  async create(data: CreateOrderDTO, gstPercentage: number = 0): Promise<RepositoryResult<OrderWithRelations>> {
    // Calculate rental days
    const startDate = new Date(data.rental_start_date);
    const endDate = new Date(data.rental_end_date);
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate subtotal (sum of item prices × days)
    const subtotal = data.items.reduce((sum, item) => sum + (item.price_per_day * item.quantity * days), 0);
    
    // Calculate GST amount
    const gstAmount = subtotal * (gstPercentage / 100);
    
    // Total amount
    const totalAmount = subtotal + gstAmount;

    // Start a transaction by creating the order first
    const orderResponse = await this.client
      .from(this.tableName)
      .insert({
        customer_id: data.customer_id,
        branch_id: data.branch_id,
        status: 'pending',
        rental_start_date: data.rental_start_date,
        rental_end_date: data.rental_end_date,
        pickup_time: data.pickup_time || null,
        return_time: data.return_time || null,
        pickup_branch_id: data.pickup_branch_id || null,
        event_date: data.event_date || null,
        delivery_method: data.delivery_method || null,
        delivery_address: data.delivery_address || null,
        pickup_address: data.pickup_address || null,
        subtotal,
        gst_amount: gstAmount,
        gst_percentage: gstPercentage,
        total_amount: totalAmount,
        notes: data.notes || null,
        created_by: this.currentUserId,
        created_at_branch_id: this.currentBranchId,
      })
      .select()
      .single();

    if (orderResponse.error) {
      return this.handleResponse<OrderWithRelations>(orderResponse);
    }

    const order = orderResponse.data;

    // Create order items
    const itemsResponse = await this.client
      .from(this.orderItemsTable)
      .insert(
        data.items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_day: item.price_per_day,
          total_price: item.price_per_day * item.quantity * days,
          subtotal: item.price_per_day * item.quantity * days,
        }))
      )
      .select();

    if (itemsResponse.error) {
      // Rollback: delete the order if items failed
      await this.client.from(this.tableName).delete().eq('id', order.id);
      return this.handleResponse<OrderWithRelations>(itemsResponse);
    }

    // Create initial status history
    await this.client
      .from(this.orderStatusHistoryTable)
      .insert({
        order_id: order.id,
        status: 'pending',
        changed_by: this.currentUserId,
        changed_at_branch_id: this.currentBranchId,
      });

    // Fetch the complete order with relations
    return this.findById(order.id);
  }

  /**
   * Update an existing order
   */
  async update(id: string, data: UpdateOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
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

    // If status changed, add to history
    if (data.status) {
      await this.client
        .from(this.orderStatusHistoryTable)
        .insert({
          order_id: id,
          status: data.status,
          changed_by: this.currentUserId,
          changed_at_branch_id: this.currentBranchId,
        });
    }

    const result = this.handleResponse<Order>(response);
    
    if (!result.success || !result.data) {
      return result as RepositoryResult<OrderWithRelations>;
    }

    return this.findById(id);
  }

  /**
   * Delete an order
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return this.handleResponse<void>(response);
  }

  /**
   * Get order status history
   */
  async getStatusHistory(orderId: string): Promise<RepositoryResult<OrderStatusHistory[]>> {
    const response = await this.client
      .from(this.orderStatusHistoryTable)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return this.handleResponse<OrderStatusHistory[]>(response);
  }

  /**
   * Count orders
   */
  async count(params?: OrderSearchParams): Promise<RepositoryResult<number>> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (params?.customer_id) {
      query = query.eq('customer_id', params.customer_id);
    }

    if (params?.branch_id) {
      query = query.eq('branch_id', params.branch_id);
    }

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.query) {
      query = query.or(`customer.name.ilike.%${params.query}%,customer.phone.ilike.%${params.query}%`);
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

  /**
   * Process order return with condition assessment
   */
  async processReturn(orderId: string, returnData: ReturnOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    // Update order status to returned
    const orderResponse = await this.client
      .from(this.tableName)
      .update({
        status: 'returned',
        updated_by: this.currentUserId,
        updated_at_branch_id: this.currentBranchId,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderResponse.error) {
      return this.handleResponse<OrderWithRelations>(orderResponse);
    }

    // Update order items with condition and damage info
    for (const item of returnData.items) {
      await this.client
        .from(this.orderItemsTable)
        .update({
          condition_rating: item.condition_rating,
          damage_description: item.damage_description || null,
          damage_charges: item.damage_charges || 0,
        })
        .eq('id', item.item_id);
    }

    // Add to status history
    await this.client
      .from(this.orderStatusHistoryTable)
      .insert({
        order_id: orderId,
        status: 'returned',
        notes: returnData.notes || null,
        changed_by: this.currentUserId,
        changed_at_branch_id: this.currentBranchId,
      });

    return this.findById(orderId);
  }

  /**
   * Mark deposit as returned
   */
  async markDepositReturned(orderId: string): Promise<RepositoryResult<OrderWithRelations>> {
    const response = await this.client
      .from(this.tableName)
      .update({
        deposit_returned: true,
        deposit_returned_at: new Date().toISOString(),
        updated_by: this.currentUserId,
        updated_at_branch_id: this.currentBranchId,
      })
      .eq('id', orderId)
      .select()
      .single();

    const result = this.handleResponse<Order>(response);
    
    if (!result.success || !result.data) {
      return result as RepositoryResult<OrderWithRelations>;
    }

    return this.findById(orderId);
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();
