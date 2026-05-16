/**
 * Order Availability Check API
 *
 * POST /api/orders/check-availability
 *
 * Batch-checks availability for all items in a potential order.
 * Used by the Order Form to show real-time availability before checkout.
 *
 * Body: {
 *   items: [{ product_id, quantity }],
 *   start_date: "YYYY-MM-DD",
 *   end_date: "YYYY-MM-DD",
 *   branch_id: "uuid",
 *   exclude_order_id?: "uuid"  // for edit scenarios
 * }
 *
 * @module app/api/orders/check-availability/route
 */

import { NextRequest } from 'next/server';
import { orderService } from '@/services/orderService';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiBadRequest, apiInternalError } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const body = await request.json();
    const { items, start_date, end_date, branch_id, exclude_order_id } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return apiBadRequest('items array is required');
    }
    if (!start_date || !end_date) {
      return apiBadRequest('start_date and end_date are required');
    }

    // Validate all items upfront
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        return apiBadRequest('Each item must have product_id and quantity');
      }
    }

    // Batch-check all items in a SINGLE DB round-trip (2 queries total)
    // Before: N items × 2 queries each = 2N DB round-trips
    // After:  1 batch = 2 DB queries regardless of item count
    const batchResult = await orderService.checkBatchAvailability(
      items.map((item: any) => ({ product_id: item.product_id, quantity: item.quantity })),
      start_date,
      end_date,
      branch_id,
      exclude_order_id
    );

    if (!batchResult.success || !batchResult.data) {
      return apiInternalError(batchResult.error?.message || 'Failed to check availability');
    }

    const results = items.map((item: any) => {
      const result = batchResult.data!.results.get(item.product_id);
      if (!result) {
        return {
          product_id: item.product_id,
          product_name: item.product_name || 'Unknown',
          requested: item.quantity,
          available: 0,
          isAvailable: false,
          peakReserved: 0,
          overlappingOrders: [],
          error: 'Product not found',
        };
      }

      return {
        product_id: item.product_id,
        product_name: item.product_name || 'Unknown',
        requested: item.quantity,
        available: result.available,
        isAvailable: result.available >= item.quantity,
        peakReserved: result.peakReserved,
        overlappingOrders: [],
      };
    });

    const allAvailable = results.every((r: any) => r.isAvailable);

    return apiSuccess({ allAvailable, items: results });
  } catch (err) {
    console.error('Order availability check error:', err);
    return apiInternalError();
  }
}
