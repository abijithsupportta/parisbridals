/**
 * Product Orders / Analytics API Route
 *
 * GET /api/products/[id]/orders
 *
 * Returns the list of order_items referencing this product, together with
 * their parent order, plus aggregated analytics (total revenue from this
 * product, total units rented, active rentals, historical counts).
 *
 * @module app/api/products/[id]/orders/route
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiBadRequest, apiInternalError } from '@/lib/apiResponse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return apiBadRequest('Invalid product ID');
    }

    const supabase = createAdminClient();

    // Pull order_items for this product, joined with parent order + customer + branch
    const { data: items, error } = await supabase
      .from('order_items')
      .select(
        `
        id,
        order_id,
        product_id,
        quantity,
        price_per_day,
        subtotal,
        created_at,
        order:order_id(
          id,
          status,
          start_date,
          end_date,
          total_amount,
          branch_id,
          customer_id,
          created_at,
          customer:customer_id(id, name, phone),
          branch:branch_id(id, name)
        )
      `
      )
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return apiInternalError(error.message);
    }

    const rows = items || [];

    // Compute aggregate analytics
    let totalUnitsRented = 0;
    let totalRevenue = 0;
    let activeOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    const uniqueCustomers = new Set<string>();

    const ACTIVE_STATUSES = new Set([
      'pending',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'active',
      'ongoing',
    ]);
    const COMPLETED_STATUSES = new Set(['returned', 'completed']);
    const CANCELLED_STATUSES = new Set(['cancelled', 'refunded']);

    for (const item of rows as any[]) {
      const order = item.order;
      if (!order) continue;
      const status = (order.status || '').toLowerCase();

      if (CANCELLED_STATUSES.has(status)) {
        cancelledOrders += 1;
        continue;
      }

      totalUnitsRented += item.quantity || 0;
      totalRevenue += Number(item.subtotal ?? 0);

      if (order.customer_id) uniqueCustomers.add(order.customer_id);
      if (ACTIVE_STATUSES.has(status)) activeOrders += 1;
      else if (COMPLETED_STATUSES.has(status)) completedOrders += 1;
    }

    return apiSuccess({
      items: rows,
      analytics: {
        totalOrders: rows.length,
        totalUnitsRented,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        activeOrders,
        completedOrders,
        cancelledOrders,
        uniqueCustomers: uniqueCustomers.size,
      },
    });
  } catch (err) {
    console.error('Product orders analytics error:', err);
    return apiInternalError();
  }
}
