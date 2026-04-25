import { NextRequest } from 'next/server';
import { orderRepository } from '@/repository/orderRepository';
import { apiSuccess, apiError, apiUnauthorized, apiBadRequest } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const branchId = searchParams.get('branch_id');

    if (!startDate || !endDate || !branchId) {
      return apiBadRequest('Missing required parameters: start_date, end_date, branch_id');
    }

    orderRepository.setUserContext(authUser.id, authUser.store_id || '');

    const result = await orderRepository.getCalendarOrders(branchId, startDate, endDate);

    if (!result.success) {
      return apiError(result.error?.message || 'Failed to fetch calendar orders');
    }

    return apiSuccess(result.data || []);
  } catch (error) {
    console.error('Calendar API Error:', error);
    return apiError('Internal server error', { status: 500 });
  }
}
