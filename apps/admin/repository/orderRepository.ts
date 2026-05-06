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

/** Buffer days for cleaning/prep before and after each rental (in milliseconds) */
const BUFFER_DAYS = 1;
const BUFFER_MS = BUFFER_DAYS * 86400000;

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
        customer:customer_id(id, name, phone, alt_phone, email),
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
   * Fetch active orders overlapping a specific date range for the calendar view.
   */
  async getCalendarOrders(branchId: string, startDate: string, endDate: string): Promise<RepositoryResult<OrderWithRelations[]>> {
    const response = await this.client
      .from(this.tableName)
      .select(`
        *,
        customer:customer_id(id, name, phone, alt_phone, email),
        items:order_items(*, product:product_id(id, name, images)),
        branch:branch_id(id, name)
      `)
      .eq('branch_id', branchId)
      .in('status', ['pending', 'confirmed', 'scheduled', 'ongoing', 'in_use', 'late_return', 'partial', 'flagged'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('start_date', { ascending: true });

    return this.handleResponse<OrderWithRelations[]>(response);
  }

  /**
   * Check product availability for given date range using Sweep Line algorithm.
   *
   * Instead of simply summing all overlapping reservations (which over-counts
   * when bookings don't all overlap each other simultaneously), this uses the
   * Sweep Line technique to find the PEAK concurrent usage within the
   * requested date range.
   *
   * Time complexity: O(N log N) where N = number of overlapping bookings.
   *
   * @param excludeOrderId - Exclude this order from the count (for edit scenarios)
   */
  async checkAvailability(
    productId: string,
    startDate: string,
    endDate: string,
    branchId?: string,
    excludeOrderId?: string
  ): Promise<RepositoryResult<{ available: number; total: number; peakReserved: number; overlappingOrders: any[] }>> {
    // Get product total quantity
    const productResponse = await this.client
      .from('products')
      .select('quantity, name')
      .eq('id', productId)
      .single();

    if (productResponse.error) {
      return this.handleResponse<{ available: number; total: number; peakReserved: number; overlappingOrders: any[] }>(productResponse);
    }

    const totalQuantity = productResponse.data?.quantity || 0;

    // Fetch all active order items for this product with their order date ranges
    const ordersResponse = await this.client
      .from('order_items')
      .select('quantity, returned_quantity, order_id, orders!inner(id, start_date, end_date, status, customer_id, customer:customer_id(name))')
      .eq('product_id', productId)
      .in('orders.status', ['pending', 'confirmed', 'scheduled', 'ongoing', 'in_use', 'late_return', 'partial']);

    if (ordersResponse.error) {
      return this.handleResponse<{ available: number; total: number; peakReserved: number; overlappingOrders: any[] }>(ordersResponse);
    }

    const reqStart = new Date(startDate).getTime();
    const reqEnd = new Date(endDate).getTime();

    // Collect overlapping bookings (filtering out the excluded order if editing)
    const overlappingBookings: { start: number; end: number; quantity: number; orderId: string; customerName: string; startDate: string; endDate: string; status: string }[] = [];

    for (const item of (ordersResponse.data || []) as any[]) {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      if (!order) continue;
      if (excludeOrderId && order.id === excludeOrderId) continue;

      const ordStart = new Date(order.start_date).getTime();
      const ordEnd = new Date(order.end_date).getTime();

      // Overlap condition with buffer days (±1 day for cleaning/prep)
      // A booking's effective range is [start - BUFFER, end + BUFFER]
      const effectiveStart = ordStart - BUFFER_MS;
      const effectiveEnd = ordEnd + BUFFER_MS;
      if (effectiveStart <= reqEnd && effectiveEnd >= reqStart) {
        const unreturned = item.quantity - (item.returned_quantity || 0);
        if (unreturned > 0) {
          const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;
          overlappingBookings.push({
            start: ordStart,
            end: ordEnd,
            quantity: unreturned,
            orderId: order.id,
            customerName: customer?.name || 'Unknown',
            startDate: order.start_date,
            endDate: order.end_date,
            status: order.status,
          });
        }
      }
    }

    // ─── Sweep Line Algorithm (with buffer days) ─────────────────────
    // Each booking blocks the product from (start - BUFFER) to (end + BUFFER).
    // Events: +qty at (start - BUFFER), -qty at (end + BUFFER + 1 day)
    const events: { time: number; delta: number }[] = [];
    for (const booking of overlappingBookings) {
      events.push({ time: booking.start - BUFFER_MS, delta: +booking.quantity });
      // Release: 1 day after the buffer-extended end date
      events.push({ time: booking.end + BUFFER_MS + 86400000, delta: -booking.quantity });
    }

    // Sort: by time, then releases (-delta) before acquisitions (+delta)
    events.sort((a, b) => a.time - b.time || a.delta - b.delta);

    let currentUsage = 0;
    let peakUsage = 0;
    for (const event of events) {
      // Only count events within the requested range (including buffer)
      if (event.time > reqEnd + BUFFER_MS + 86400000) break;
      currentUsage += event.delta;
      if (event.time >= reqStart - BUFFER_MS && event.time <= reqEnd + BUFFER_MS) {
        peakUsage = Math.max(peakUsage, currentUsage);
      }
    }

    // Also check usage at the very start of the requested range
    // (bookings whose buffered range covers reqStart contribute to baseline)
    let baselineAtStart = 0;
    for (const booking of overlappingBookings) {
      const bufferedStart = booking.start - BUFFER_MS;
      const bufferedEnd = booking.end + BUFFER_MS;
      if (bufferedStart <= reqStart && bufferedEnd >= reqStart) {
        baselineAtStart += booking.quantity;
      }
    }
    peakUsage = Math.max(peakUsage, baselineAtStart);

    const availableQuantity = Math.max(0, totalQuantity - peakUsage);

    return {
      data: {
        available: availableQuantity,
        total: totalQuantity,
        peakReserved: peakUsage,
        overlappingOrders: overlappingBookings.map(b => ({
          orderId: b.orderId,
          customerName: b.customerName,
          quantity: b.quantity,
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
        })),
      },
      error: null,
      success: true,
    };
  }

  /**
   * Get per-day availability calendar for a product over a date range.
   *
   * Used to render the availability calendar on the product detail page.
   * For each day in the range, computes how many units are reserved vs available.
   *
   * Uses per-day iteration (O(D × N)) which is appropriate for calendar
   * rendering where we need every single day's data.
   */
  async getAvailabilityCalendar(
    productId: string,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<RepositoryResult<{ productId: string; productName: string; totalQuantity: number; days: any[] }>> {
    // Get product info
    const productResponse = await this.client
      .from('products')
      .select('quantity, name')
      .eq('id', productId)
      .single();

    if (productResponse.error) {
      return this.handleResponse<any>(productResponse);
    }

    const totalQuantity = productResponse.data?.quantity || 0;
    const productName = productResponse.data?.name || '';

    // Fetch all active bookings that overlap with the view range
    const ordersResponse = await this.client
      .from('order_items')
      .select('quantity, returned_quantity, order_id, orders!inner(id, start_date, end_date, status, customer_id, customer:customer_id(name))')
      .eq('product_id', productId)
      .in('orders.status', ['pending', 'confirmed', 'scheduled', 'ongoing', 'in_use', 'late_return', 'partial']);

    if (ordersResponse.error) {
      return this.handleResponse<any>(ordersResponse);
    }

    const viewStart = new Date(rangeStart);
    const viewEnd = new Date(rangeEnd);

    // Parse all bookings
    const bookings: { start: Date; end: Date; quantity: number; orderId: string; customerName: string; startDate: string; endDate: string; status: string }[] = [];
    for (const item of (ordersResponse.data || []) as any[]) {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      if (!order) continue;

      const unreturned = item.quantity - (item.returned_quantity || 0);
      if (unreturned <= 0) continue;

      const bookingStart = new Date(order.start_date);
      const bookingEnd = new Date(order.end_date);

      // Include if the booking's buffered range overlaps with our view range
      const bufferedStart = new Date(bookingStart.getTime() - BUFFER_MS);
      const bufferedEnd = new Date(bookingEnd.getTime() + BUFFER_MS);
      if (bufferedStart <= viewEnd && bufferedEnd >= viewStart) {
        const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;
        bookings.push({
          start: bookingStart,
          end: bookingEnd,
          quantity: unreturned,
          orderId: order.id,
          customerName: customer?.name || 'Unknown',
          startDate: order.start_date,
          endDate: order.end_date,
          status: order.status,
        });
      }
    }

    // Build per-day availability map (with buffer day detection)
    const days: any[] = [];
    const current = new Date(viewStart);
    while (current <= viewEnd) {
      const dateStr = current.toISOString().split('T')[0];
      const currentTime = current.getTime();
      let reserved = 0;
      let bufferReserved = 0;
      const dayBookings: any[] = [];

      for (const booking of bookings) {
        const bookingStartTime = booking.start.getTime();
        const bookingEndTime = booking.end.getTime();
        const bufferedStartTime = bookingStartTime - BUFFER_MS;
        const bufferedEndTime = bookingEndTime + BUFFER_MS;

        // Check if this booking (including buffer) covers the current day
        if (bufferedStartTime <= currentTime && bufferedEndTime >= currentTime) {
          reserved += booking.quantity;

          // Determine if this day is a buffer day or an actual rental day
          const isActualRentalDay = bookingStartTime <= currentTime && bookingEndTime >= currentTime;
          const isBuffer = !isActualRentalDay;

          if (isBuffer) {
            bufferReserved += booking.quantity;
          }

          dayBookings.push({
            orderId: booking.orderId,
            customerName: booking.customerName,
            quantity: booking.quantity,
            startDate: booking.startDate,
            endDate: booking.endDate,
            status: booking.status,
            isBuffer,
          });
        }
      }

      const available = Math.max(0, totalQuantity - reserved);
      let status: 'available' | 'partial' | 'unavailable' | 'buffer' = 'available';
      if (available === 0 && bufferReserved === reserved) status = 'buffer';
      else if (available === 0) status = 'unavailable';
      else if (reserved > 0 && bufferReserved === reserved) status = 'buffer';
      else if (reserved > 0) status = 'partial';

      days.push({ date: dateStr, total: totalQuantity, reserved, bufferReserved, available, status, bookings: dayBookings });
      current.setDate(current.getDate() + 1);
    }

    return {
      data: { productId, productName, totalQuantity, days },
      error: null,
      success: true,
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
        customer:customer_id(id, name, phone, alt_phone, email),
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
    const initialStatus = 'scheduled';

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
        advance_amount: data.advance_amount || 0,
        advance_collected: data.advance_collected || false,
        advance_payment_method: data.advance_payment_method || null,
        advance_collected_at: data.advance_collected ? new Date().toISOString() : null,
        total_amount: totalAmount,
        deposit_collected: (data as any).deposit_collected || false,
        deposit_payment_method: (data as any).deposit_payment_method || null,
        deposit_collected_at: (data as any).deposit_collected_at || null,
        amount_paid: data.advance_collected && data.advance_amount ? data.advance_amount : 0,
        payment_status: data.advance_collected && data.advance_amount
          ? (data.advance_amount >= totalAmount ? 'paid' : 'partial')
          : 'pending',
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

    // NOTE: Inventory is NOT deducted at creation time.
    // Stock deduction happens only when the user manually starts the rental
    // (transitions to ongoing/in_use) via the order details page.

    // Create advance payment record if advance was collected
    if (data.advance_collected && data.advance_amount && data.advance_amount > 0) {
      await this.client
        .from('payments')
        .insert({
          order_id: order.id,
          payment_type: 'advance',
          amount: data.advance_amount,
          payment_mode: data.advance_payment_method || 'cash',
          notes: 'Advance payment collected at order creation',
          payment_date: new Date().toISOString(),
          ...this.getCreateAuditFields(),
        });
    }

    // Create deposit payment record if deposit was collected
    if ((data as any).deposit_collected && (data as any).security_deposit && (data as any).security_deposit > 0) {
      await this.client
        .from('payments')
        .insert({
          order_id: order.id,
          payment_type: 'deposit',
          amount: (data as any).security_deposit,
          payment_mode: (data as any).deposit_payment_method || 'cash',
          notes: 'Security deposit collected at order creation',
          payment_date: new Date().toISOString(),
          ...this.getCreateAuditFields(),
        });
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
    // Fetch existing order to check status transitions
    const oldOrderResponse = await this.client
      .from(this.tableName)
      .select('status, branch_id')
      .eq('id', id)
      .single();
      
    const oldStatus = oldOrderResponse.data?.status;
    const branchId = oldOrderResponse.data?.branch_id;

    const response = await this.client
      .from(this.tableName)
      .update({
        ...data,
      })
      .eq('id', id)
      .select()
      .single();

    // If status changed to ongoing/in_use, decrement stock
    if (data.status && oldStatus && branchId) {
      const isStarting = ['ongoing', 'in_use'].includes(data.status) && 
                         !['ongoing', 'in_use', 'returned', 'late_return', 'completed'].includes(oldStatus);
      const isCancelling = data.status === 'cancelled' && 
                           ['ongoing', 'in_use'].includes(oldStatus);
                           
      if (isStarting || isCancelling) {
        const itemsRes = await this.client.from(this.orderItemsTable).select('product_id, quantity').eq('order_id', id);
        if (itemsRes.data) {
          for (const item of itemsRes.data) {
            const qtyChange = isStarting ? item.quantity : -item.quantity; // positive means we subtract from available
            
            const { data: inv } = await this.client.from('product_inventory').select('available_quantity').eq('product_id', item.product_id).eq('branch_id', branchId).single();
            if (inv) {
              await this.client.from('product_inventory').update({ available_quantity: Math.max(0, inv.available_quantity - qtyChange) }).eq('product_id', item.product_id).eq('branch_id', branchId);
            }
            
            const { data: prod } = await this.client.from('products').select('available_quantity').eq('id', item.product_id).single();
            if (prod) {
              await this.client.from('products').update({ available_quantity: Math.max(0, prod.available_quantity - qtyChange) }).eq('id', item.product_id);
            }
          }
        }
      }
    }

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
    // Fetch the order to check if we need to restore stock
    const orderResponse = await this.client
      .from(this.tableName)
      .select('status, branch_id')
      .eq('id', id)
      .single();

    if (orderResponse.data) {
      const status = orderResponse.data.status;
      const branchId = orderResponse.data.branch_id;
      
      // These statuses mean the items have decremented the available_quantity
      if (['ongoing', 'in_use', 'late_return', 'partial', 'flagged'].includes(status)) {
        const itemsRes = await this.client
          .from(this.orderItemsTable)
          .select('product_id, quantity, returned_quantity')
          .eq('order_id', id);

        if (itemsRes.data) {
          for (const item of itemsRes.data) {
            const unreturnedQuantity = item.quantity - (item.returned_quantity || 0);
            if (unreturnedQuantity > 0) {
              // Restore inventory
              const { data: inv } = await this.client
                .from('product_inventory')
                .select('available_quantity')
                .eq('product_id', item.product_id)
                .eq('branch_id', branchId)
                .single();
                
              if (inv) {
                await this.client
                  .from('product_inventory')
                  .update({ available_quantity: inv.available_quantity + unreturnedQuantity })
                  .eq('product_id', item.product_id)
                  .eq('branch_id', branchId);
              }
              
              const { data: prod } = await this.client
                .from('products')
                .select('available_quantity')
                .eq('id', item.product_id)
                .single();
                
              if (prod) {
                await this.client
                  .from('products')
                  .update({ available_quantity: prod.available_quantity + unreturnedQuantity })
                  .eq('id', item.product_id);
              }
            }
          }
        }
      }
    }

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

    // Fetch existing order items to check for partial returns
    const { data: existingItems } = await this.client
      .from(this.orderItemsTable)
      .select('id, quantity, returned_quantity')
      .eq('order_id', orderId);

    for (const item of returnData.items) {
      if (item.damage_charges && item.damage_charges > 0) {
        hasDamage = true;
        totalDamageCharges += item.damage_charges;
      }
      if (item.condition_rating === 'damaged') hasDamage = true;
      
      const existingItem = existingItems?.find(i => i.id === item.item_id);
      if (existingItem) {
         const oldReturned = existingItem.returned_quantity || 0;
         // If what we are returning now + what was previously returned is less than the total quantity ordered
         if ((item.returned_quantity) < existingItem.quantity) {
           hasMissing = true;
         }
      } else if (item.returned_quantity === 0) {
         hasMissing = true;
      }
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

    let newTotalAmount = Number(currentOrder?.total_amount || 0);
    
    // Add late fee and damage charges, subtract discounts
    const lateFee = Number(returnData.late_fee || 0);
    const discount = Number(returnData.discount || 0);
    const totalDeductions = lateFee + totalDamageCharges - discount;

    newTotalAmount = Math.max(0, newTotalAmount + totalDeductions);
    
    // Update payment status if the new total changed and is not fully paid anymore
    let paymentStatus = undefined;
    const amountPaid = Number(currentOrder?.amount_paid || 0);
    console.log(`processReturn: newTotalAmount=${newTotalAmount}, amountPaid=${amountPaid}, totalDeductions=${totalDeductions}`);
    if (currentOrder && newTotalAmount > amountPaid) {
       paymentStatus = amountPaid > 0 ? 'partial' : 'pending';
    }

    // Update order status and totals
    const orderResponse = await this.client
      .from(this.tableName)
      .update({
        status: newStatus,
        total_amount: newTotalAmount,
        late_fee: lateFee,
        discount: discount,
        damage_charges_total: totalDamageCharges,
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

  /**
   * Add a status history entry for an order
   */
  async addStatusHistory(orderId: string, status: string, notes?: string): Promise<void> {
    await this.client
      .from(this.orderStatusHistoryTable)
      .insert({
        order_id: orderId,
        status,
        notes: notes || null,
        changed_by: null,
      });
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();
