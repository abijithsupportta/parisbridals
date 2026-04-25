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
        items:order_items(*, product:product_id(id, name, images)),
        branch:branch_id(id, name)
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

    if (params?.date_filter || params?.date_from || params?.date_to) {
      if (params?.date_filter === 'custom' || (!params?.date_filter && (params?.date_from || params?.date_to))) {
        if (params?.date_from) query = query.gte('created_at', params.date_from);
        if (params?.date_to) query = query.lte('created_at', params.date_to);
      } else if (params?.date_filter) {
        const now = new Date();
        let startDate, endDate;
        switch (params.date_filter) {
          case 'today':
            startDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'this_week':
            const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
            startDate = new Date(firstDay.setHours(0, 0, 0, 0)).toISOString();
            query = query.gte('created_at', startDate);
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('created_at', startDate);
            break;
        }
      }
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
        items:order_items(*, product:product_id(id, name, images)),
        branch:branch_id(id, name)
      `)
      .eq('id', id)
      .single();

    return this.handleResponse<OrderWithRelations>(response);
  }

  /**
   * Create a new order with items
   */
  async create(data: CreateOrderDTO, gstPercentage: number = 0): Promise<RepositoryResult<OrderWithRelations>> {
    // Parse rental dates (tracked for scheduling, NOT for pricing)
    const startDate = new Date(data.rental_start_date);
    const endDate = new Date(data.rental_end_date);

    // Calculate subtotal — flat rent price × quantity (no per-day multiplication)
    const subtotal = data.items.reduce((sum, item) => sum + (item.price_per_day * item.quantity), 0);
    
    // Calculate GST amount
    const gstAmount = subtotal * (gstPercentage / 100);
    
    // Total amount
    const totalAmount = subtotal + gstAmount;

    // Fetch store_id from branch
    const branchResponse = await this.client
      .from('branches')
      .select('store_id')
      .eq('id', data.branch_id)
      .single();
      
    if (branchResponse.error) {
      return {
        data: null,
        error: branchResponse.error,
        success: false
      };
    }
    
    const storeId = branchResponse.data.store_id;

    const todayStr = new Date().toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    const initialStatus = startDateStr > todayStr ? 'scheduled' : 'ongoing';

    // Start a transaction by creating the order first
    // DB columns: start_date, end_date, event_date (all DATE type)
    const orderResponse = await this.client
      .from(this.tableName)
      .insert({
        customer_id: data.customer_id,
        branch_id: data.branch_id,
        store_id: storeId,
        status: initialStatus,
        start_date: startDateStr,
        end_date: endDate.toISOString().split('T')[0],
        event_date: data.event_date ? new Date(data.event_date).toISOString().split('T')[0] : startDate.toISOString().split('T')[0],
        delivery_method: data.delivery_method || 'pickup',
        delivery_address: data.delivery_address || null,
        pickup_address: data.pickup_address || null,
        subtotal,
        gst_amount: gstAmount,
        security_deposit: (data as any).security_deposit || 0,
        total_amount: totalAmount,
        deposit_collected: (data as any).deposit_collected || false,
        deposit_payment_method: (data as any).deposit_payment_method || null,
        deposit_collected_at: (data as any).deposit_collected_at || null,
        amount_paid: (data as any).amount_paid || 0,
        payment_status: (data as any).payment_status || 'pending',
        notes: data.notes || null,
      })
      .select()
      .single();

    if (orderResponse.error) {
      return this.handleResponse<OrderWithRelations>(orderResponse);
    }

    const order = orderResponse.data;

    // Create order items — flat rent price, no per-day multiplication
    const itemsResponse = await this.client
      .from(this.orderItemsTable)
      .insert(
        data.items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_day: item.price_per_day,
          subtotal: item.price_per_day * item.quantity,
        }))
      )
      .select();

    if (itemsResponse.error) {
      // Rollback: delete the order if items failed
      await this.client.from(this.tableName).delete().eq('id', order.id);
      return this.handleResponse<OrderWithRelations>(itemsResponse);
    }

    // Deduct inventory
    for (const item of data.items) {
      const { data: inv } = await this.client
        .from('product_inventory')
        .select('available_quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', data.branch_id)
        .single();
        
      if (inv) {
        await this.client
          .from('product_inventory')
          .update({ available_quantity: Math.max(0, inv.available_quantity - item.quantity) })
          .eq('product_id', item.product_id)
          .eq('branch_id', data.branch_id);
      }
      
      const { data: prod } = await this.client
        .from('products')
        .select('available_quantity')
        .eq('id', item.product_id)
        .single();
        
      if (prod) {
        await this.client
          .from('products')
          .update({ available_quantity: Math.max(0, prod.available_quantity - item.quantity) })
          .eq('id', item.product_id);
      }
    }

    // Create initial status history
    await this.client
      .from(this.orderStatusHistoryTable)
      .insert({
        order_id: order.id,
        status: initialStatus,
        changed_by: null,
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
          changed_by: null,
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

    if (params?.date_filter || params?.date_from || params?.date_to) {
      if (params?.date_filter === 'custom' || (!params?.date_filter && (params?.date_from || params?.date_to))) {
        if (params?.date_from) query = query.gte('created_at', params.date_from);
        if (params?.date_to) query = query.lte('created_at', params.date_to);
      } else if (params?.date_filter) {
        const now = new Date();
        let startDate, endDate;
        switch (params.date_filter) {
          case 'today':
            startDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
            query = query.gte('created_at', startDate).lte('created_at', endDate);
            break;
          case 'this_week':
            const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
            startDate = new Date(firstDay.setHours(0, 0, 0, 0)).toISOString();
            query = query.gte('created_at', startDate);
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('created_at', startDate);
            break;
        }
      }
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
    // Determine final status based on return condition
    let newStatus = 'returned';
    let hasMissing = false;
    let hasDamage = false;
    let totalDamageCharges = 0;

    for (const item of returnData.items) {
      if (item.damage_charges && item.damage_charges > 0) {
        hasDamage = true;
        totalDamageCharges += item.damage_charges;
      }
      if (item.condition_rating === 'damaged') hasDamage = true;
      if (item.returned_quantity === 0) hasMissing = true;
    }

    if (hasDamage) {
      newStatus = 'flagged';
    } else if (hasMissing) {
      newStatus = 'partial';
    }

    // Get current order to calculate new total
    const { data: currentOrder } = await this.client
      .from(this.tableName)
      .select('total_amount, amount_paid')
      .eq('id', orderId)
      .single();

    let newTotalAmount = currentOrder?.total_amount || 0;
    
    // Add late fee and damage charges, subtract discounts
    const lateFee = returnData.late_fee || 0;
    const discount = returnData.discount || 0;
    const totalDeductions = lateFee + totalDamageCharges - discount;

    newTotalAmount = Math.max(0, newTotalAmount + totalDeductions);
    
    // Update payment status if the new total changed and is not fully paid anymore
    let paymentStatus = undefined;
    if (currentOrder && newTotalAmount > currentOrder.amount_paid) {
       paymentStatus = currentOrder.amount_paid > 0 ? 'partial' : 'pending';
    }

    // Update order status and totals
    const orderResponse = await this.client
      .from(this.tableName)
      .update({
        status: newStatus,
        total_amount: newTotalAmount,
        ...(paymentStatus ? { payment_status: paymentStatus } : {})
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderResponse.error) {
      return this.handleResponse<OrderWithRelations>(orderResponse);
    }

    // Update order items with condition and damage info
    for (const item of returnData.items) {
      // Get existing order item to prevent double-counting inventory on partial returns
      const { data: orderItem } = await this.client
        .from(this.orderItemsTable)
        .select('returned_quantity, product_id, orders(branch_id)')
        .eq('id', item.item_id)
        .single();
        
      const oldReturnedQuantity = orderItem?.returned_quantity || 0;
      const quantityToIncrement = item.returned_quantity - oldReturnedQuantity;

      await this.client
        .from(this.orderItemsTable)
        .update({
          is_returned: true,
          returned_at: new Date().toISOString(),
          returned_quantity: item.returned_quantity,
          condition_rating: item.condition_rating,
          damage_description: item.damage_description || null,
          damage_charges: item.damage_charges || 0,
        })
        .eq('id', item.item_id);

      // Increment inventory only by the difference
      if (quantityToIncrement > 0 && orderItem && orderItem.product_id) {
        const branchId = (orderItem as any).orders?.branch_id || (orderItem as any).orders?.[0]?.branch_id;
        
        const { data: inv } = await this.client
          .from('product_inventory')
          .select('available_quantity')
          .eq('product_id', orderItem.product_id)
          .eq('branch_id', branchId)
          .single();
          
        if (inv) {
          await this.client
            .from('product_inventory')
            .update({ available_quantity: inv.available_quantity + quantityToIncrement })
            .eq('product_id', orderItem.product_id)
            .eq('branch_id', branchId);
        }
        
        const { data: prod } = await this.client
          .from('products')
          .select('available_quantity')
          .eq('id', orderItem.product_id)
          .single();
          
        if (prod) {
          await this.client
            .from('products')
            .update({ available_quantity: prod.available_quantity + quantityToIncrement })
            .eq('id', orderItem.product_id);
        }
      }
    }

    // Add to status history
    await this.client
      .from(this.orderStatusHistoryTable)
      .insert({
        order_id: orderId,
        status: newStatus,
        notes: returnData.notes || null,
        changed_by: null,
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
