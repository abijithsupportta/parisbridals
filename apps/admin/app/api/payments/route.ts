/**
 * Payments API Route
 * GET  /api/payments — list all payments (admin only)
 * POST /api/payments — create a new payment (admin only)
 */

import { NextRequest } from 'next/server';
import { paymentService } from '@/services/paymentService';
import { apiGuard } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiRepositoryError, apiInternalError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const params: any = {};
    
    if (searchParams.get('order_id')) params.order_id = searchParams.get('order_id');
    if (searchParams.get('payment_type')) params.payment_type = searchParams.get('payment_type');
    if (searchParams.get('payment_mode')) params.payment_mode = searchParams.get('payment_mode');
    if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('offset')) params.offset = parseInt(searchParams.get('offset')!);

    const result = await paymentService.getAllPayments(params);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch payments');
    }
    return apiSuccess(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/payments error:', error);
    return apiInternalError(error.message || 'Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    paymentService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const body = await request.json();
    const result = await paymentService.createPayment(body);
    
    if (!result.success || !result.data) {
      return apiRepositoryError(result.error, 'Failed to create payment');
    }
    return apiSuccess(result.data, { status: 201, message: 'Payment recorded successfully' });
  } catch (error: any) {
    console.error('[API] POST /api/payments error:', error);
    return apiInternalError(error.message || 'Internal server error');
  }
}
