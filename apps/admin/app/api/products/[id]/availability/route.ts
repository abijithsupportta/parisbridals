/**
 * Product Availability Calendar API
 *
 * GET /api/products/[id]/availability?start=2026-05-01&end=2026-06-30
 *
 * Returns per-day availability data for a product over a date range.
 * Powers the booking calendar on the product detail page and
 * availability checks in the order form.
 *
 * Uses interval-based scheduling with the Sweep Line algorithm
 * to accurately compute concurrent reservations.
 *
 * @module app/api/products/[id]/availability/route
 */

import { NextRequest } from 'next/server';
import { orderService } from '@/services/orderService';
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

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return apiBadRequest('start and end query parameters are required (YYYY-MM-DD)');
    }

    // Validate date format
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return apiBadRequest('Invalid date format. Use YYYY-MM-DD.');
    }
    if (startDate > endDate) {
      return apiBadRequest('start date must be before end date');
    }

    // Limit range to 90 days to prevent abuse
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return apiBadRequest('Date range cannot exceed 90 days');
    }

    const result = await orderService.getProductAvailabilityCalendar(id, start, end);

    if (!result.success) {
      return apiInternalError(result.error?.message || 'Failed to fetch availability');
    }

    return apiSuccess(result.data);
  } catch (err) {
    console.error('Product availability error:', err);
    return apiInternalError();
  }
}
