import { NextRequest } from 'next/server';
import { endOfDay, startOfDay } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/server';
import { apiGuard } from '@/lib/apiGuard';
import { apiInternalError, apiSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'dashboard');
    if (guard.error) return guard.error;

    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get('branch_id') || guard.user.branch_id || undefined;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [
      totalOrders,
      ordersToday,
      totalRevenue,
      revenueToday,
      totalScheduled,
      totalOngoing,
      totalLates,
      totalPartial,
      totalFlagged
    ] = await Promise.all([
      countOrders(supabase, { branchId }),
      countOrders(supabase, { branchId, createdFrom: todayStart, createdTo: todayEnd }),
      sumPayments(supabase, undefined, undefined, branchId),
      sumPayments(supabase, todayStart, todayEnd, branchId),
      countOrders(supabase, { branchId, statuses: ['scheduled'] }),
      countOrders(supabase, { branchId, statuses: ['ongoing', 'in_use'] }),
      countOrders(supabase, { branchId, statuses: ['late_return'] }),
      countOrders(supabase, { branchId, statuses: ['partial'] }),
      countOrders(supabase, { branchId, statuses: ['flagged'] })
    ]);

    return apiSuccess({
      totalOrders,
      ordersToday,
      totalRevenue,
      revenueToday,
      totalScheduled,
      totalOngoing,
      totalLates,
      totalPartial,
      totalFlagged
    });
  } catch (error) {
    console.error('Error fetching mobile dashboard metrics:', error);
    return apiInternalError('Failed to fetch dashboard metrics');
  }
}

function scopeOrderQuery(query: any, branchId?: string) {
  if (branchId) return query.eq('branch_id', branchId);
  return query;
}

function scopePaymentQuery(query: any, branchId?: string) {
  if (branchId) return query.eq('orders.branch_id', branchId);
  return query;
}

async function sumPayments(supabase: any, from?: Date, to?: Date, branchId?: string) {
  let query = supabase
    .from('payments')
    .select('amount, orders!inner(branch_id)')
    .neq('payment_type', 'refund');

  if (from) query = query.gte('payment_date', from.toISOString());
  if (to) query = query.lte('payment_date', to.toISOString());
  
  query = scopePaymentQuery(query, branchId);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
}

interface OrderCountParams {
  branchId?: string;
  statuses?: string[];
  createdFrom?: Date;
  createdTo?: Date;
}

async function countOrders(supabase: any, params: OrderCountParams) {
  let query = supabase.from('orders').select('*', { count: 'exact', head: true });
  query = scopeOrderQuery(query, params.branchId);

  if (params.statuses?.length) query = query.in('status', params.statuses);
  if (params.createdFrom) query = query.gte('created_at', params.createdFrom.toISOString());
  if (params.createdTo) query = query.lte('created_at', params.createdTo.toISOString());

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

