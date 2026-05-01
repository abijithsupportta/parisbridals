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

    // Run all queries in parallel. Each is wrapped with safe() so one failure
    // doesn't crash the entire endpoint — it just returns 0 for that metric.
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
      safe(countOrders(supabase, { branchId })),
      safe(countOrders(supabase, { branchId, createdFrom: todayStart, createdTo: todayEnd })),
      safe(sumRevenue(supabase, branchId)),
      safe(sumRevenue(supabase, branchId, todayStart, todayEnd)),
      safe(countOrders(supabase, { branchId, statuses: ['scheduled'] })),
      safe(countOrders(supabase, { branchId, statuses: ['ongoing', 'in_use'] })),
      safe(countOrders(supabase, { branchId, statuses: ['late_return'] })),
      safe(countOrders(supabase, { branchId, statuses: ['partial'] })),
      safe(countOrders(supabase, { branchId, statuses: ['flagged'] }))
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

/** Wraps a promise so it returns 0 on failure instead of throwing. */
async function safe(promise: Promise<number>): Promise<number> {
  try {
    return await promise;
  } catch (e) {
    console.error('Dashboard metric query failed:', e);
    return 0;
  }
}

/**
 * Sum revenue from payments table. Uses a simple select without FK joins
 * (matching how dashboardService.ts queries payments) to avoid Supabase
 * relationship errors. Branch filtering is done by fetching order IDs first.
 */
async function sumRevenue(supabase: any, branchId?: string, from?: Date, to?: Date): Promise<number> {
  // If branch filtering is needed, get order IDs for that branch first
  let orderIds: string[] | undefined;
  if (branchId) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('branch_id', branchId);
    if (ordersError) throw ordersError;
    orderIds = (orders || []).map((o: any) => o.id);
    if (!orderIds || orderIds.length === 0) return 0;
  }

  let query = supabase
    .from('payments')
    .select('amount, payment_type')
    .neq('payment_type', 'refund');

  if (from) query = query.gte('payment_date', from.toISOString());
  if (to) query = query.lte('payment_date', to.toISOString());
  if (orderIds) query = query.in('order_id', orderIds);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
}

interface OrderCountParams {
  branchId?: string;
  statuses?: string[];
  createdFrom?: Date;
  createdTo?: Date;
}

async function countOrders(supabase: any, params: OrderCountParams): Promise<number> {
  let query = supabase.from('orders').select('*', { count: 'exact', head: true });
  if (params.branchId) query = query.eq('branch_id', params.branchId);

  if (params.statuses?.length) query = query.in('status', params.statuses);
  if (params.createdFrom) query = query.gte('created_at', params.createdFrom.toISOString());
  if (params.createdTo) query = query.lte('created_at', params.createdTo.toISOString());

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}
