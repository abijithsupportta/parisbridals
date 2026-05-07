/**
 * Auto-Cancel Expired Scheduled Orders — Cron Endpoint
 *
 * Cancels all orders with status 'scheduled' whose rental_start_date
 * has already passed (customer never collected).
 *
 * Triggered by:
 *   1. Vercel Cron — runs daily at 00:30 IST (19:00 UTC)
 *   2. Manual GET request (admin authenticated)
 *
 * Business Rule:
 *   If an order is scheduled for May 7th but not collected by end of day,
 *   this cron runs on May 8th and auto-cancels it.
 *
 * @module app/api/orders/auto-cancel/route
 */

import { NextRequest } from 'next/server';
import { orderService } from '@/services/orderService';
import { apiSuccess, apiInternalError, apiBadRequest } from '@/lib/apiResponse';

/**
 * GET /api/orders/auto-cancel
 *
 * Can be called by:
 *   - Vercel Cron (with CRON_SECRET header)
 *   - Authenticated admin (via apiGuard)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the caller is authorized
    // Vercel cron sends an 'authorization' header with CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow if: valid cron secret, or if no CRON_SECRET is set (dev mode)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If CRON_SECRET is set but header doesn't match, try apiGuard
      const { apiGuard } = await import('@/lib/apiGuard');
      const guard = await apiGuard(request, 'orders');
      if (guard.error) return guard.error;
    }

    const result = await orderService.autoCancelExpiredScheduledOrders();

    if (!result.success) {
      return apiBadRequest(result.error?.message || 'Auto-cancel failed');
    }

    return apiSuccess(result.data, {
      message: result.data?.count
        ? `Auto-cancelled ${result.data.count} expired scheduled order(s)`
        : 'No expired scheduled orders found',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[auto-cancel] Unhandled error:', message);
    return apiInternalError(message);
  }
}
