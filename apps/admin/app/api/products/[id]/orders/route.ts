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

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiGuard } from '@/lib/apiGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID' },
        { status: 400 }
      );
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
        total_price,
        subtotal,
        created_at,
        order:order_id(
          id,
          status,
          rental_start_date,
          rental_end_date,
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
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
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
      totalUnitsRented += item.quantity || 0;
      totalRevenue += Number(item.subtotal ?? item.total_price ?? 0);

      const order = item.order;
      if (!order) continue;
      const status = (order.status || '').toLowerCase();

      if (order.customer_id) uniqueCustomers.add(order.customer_id);
      if (ACTIVE_STATUSES.has(status)) activeOrders += 1;
      else if (COMPLETED_STATUSES.has(status)) completedOrders += 1;
      else if (CANCELLED_STATUSES.has(status)) cancelledOrders += 1;
    }

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (err) {
    console.error('Product orders analytics error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
