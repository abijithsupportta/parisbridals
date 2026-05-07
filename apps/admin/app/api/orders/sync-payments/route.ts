/**
 * Sync Order Payment Totals API
 *
 * Recalculates amount_paid and payment_status for all orders based
 * on actual payment records. Use this endpoint to fix stale data.
 *
 * POST /api/orders/sync-payments
 *
 * @module app/api/orders/sync-payments
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createAdminClient();

    // Step 1: Get all orders with their payment sums
    const { data: paymentSums, error: fetchError } = await supabase
      .from('payments')
      .select('order_id, payment_type, amount');

    if (fetchError) {
      console.error('[SyncPayments] Failed to fetch payments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch payments', details: fetchError.message },
        { status: 500 }
      );
    }

    // Step 2: Aggregate by order_id
    const orderTotals = new Map<string, number>();
    for (const p of paymentSums || []) {
      const current = orderTotals.get(p.order_id) || 0;
      const signedAmount = p.payment_type === 'refund' ? -p.amount : p.amount;
      orderTotals.set(p.order_id, current + signedAmount);
    }

    // Step 3: Get all orders to compare
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, amount_paid, payment_status');

    if (ordersError) {
      console.error('[SyncPayments] Failed to fetch orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Step 4: Update each order that needs fixing
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const order of orders || []) {
      const computedPaid = Math.max(0, orderTotals.get(order.id) || 0);
      const currentPaid = Number(order.amount_paid || 0);
      const totalAmount = Number(order.total_amount || 0);

      // Determine correct payment status
      const correctStatus =
        computedPaid <= 0
          ? 'pending'
          : computedPaid >= totalAmount
            ? 'paid'
            : 'partial';

      // Only update if different
      if (
        Math.abs(currentPaid - computedPaid) > 0.01 ||
        order.payment_status !== correctStatus
      ) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            amount_paid: computedPaid,
            payment_status: correctStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateError) {
          errors.push(`Order ${order.id}: ${updateError.message}`);
        } else {
          updated++;
          console.log(
            `[SyncPayments] Fixed order ${order.id.slice(0, 8)}: ` +
            `amount_paid ${currentPaid} → ${computedPaid}, ` +
            `status ${order.payment_status} → ${correctStatus}`
          );
        }
      } else {
        skipped++;
      }
    }

    const result = {
      success: true,
      total_orders: (orders || []).length,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[SyncPayments] Complete:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[SyncPayments] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
