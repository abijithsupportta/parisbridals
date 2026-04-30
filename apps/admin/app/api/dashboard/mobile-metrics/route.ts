import { NextRequest } from 'next/server';
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/server';
import { apiGuard } from '@/lib/apiGuard';
import { apiInternalError, apiSuccess } from '@/lib/apiResponse';

export interface MobileDashboardMetrics {
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  newOrdersToday: number;
  newOrdersThisWeek: number;
  pendingOrders: number;
  overdueReturns: number;
  todaysPickups: number;
  todaysReturns: number;
  upcomingPickupsTomorrow: number;
  activeRentals: number;
  totalCustomers: number;
  depositsHeld: number;
  lowStockCount: number;
  damagedItemsCount: number;
  revenueChangeToday: number;
  revenueChangeThisWeek: number;
  revenueChangeThisMonth: number;
  totalProducts: number;
  availableProducts: number;
  featuredProducts: number;
  recentProducts: unknown[];
}

const pendingStatuses = ['pending', 'confirmed', 'scheduled'];
const activeRentalStatuses = ['delivered', 'in_use', 'ongoing', 'partial', 'flagged', 'late_return'];

export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'dashboard');
    if (guard.error) return guard.error;

    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const requestedBranchId = searchParams.get('branch_id') || undefined;
    const canSwitchBranches = guard.user.role === 'super_admin' || guard.user.role === 'admin';
    const branchId = canSwitchBranches ? requestedBranchId : guard.user.branch_id || undefined;
    const storeId = guard.user.store_id || undefined;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yesterday = addDays(now, -1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);
    const lastWeek = addDays(now, -7);
    const lastWeekStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
    const lastMonth = addMonths(now, -1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);
    const tomorrow = addDays(now, 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const [
      revenueToday,
      revenueYesterday,
      revenueThisWeek,
      revenueLastWeek,
      revenueThisMonth,
      revenueLastMonth,
      newOrdersToday,
      newOrdersThisWeek,
      pendingOrders,
      overdueReturns,
      todaysPickups,
      todaysReturns,
      upcomingPickupsTomorrow,
      activeRentals,
      totalCustomers,
      depositsHeld,
      productStats,
      recentProducts,
    ] = await Promise.all([
      sumPayments(supabase, todayStart, todayEnd, branchId, storeId),
      sumPayments(supabase, yesterdayStart, yesterdayEnd, branchId, storeId),
      sumPayments(supabase, weekStart, weekEnd, branchId, storeId),
      sumPayments(supabase, lastWeekStart, lastWeekEnd, branchId, storeId),
      sumPayments(supabase, monthStart, monthEnd, branchId, storeId),
      sumPayments(supabase, lastMonthStart, lastMonthEnd, branchId, storeId),
      countOrders(supabase, { branchId, storeId, createdFrom: todayStart, createdTo: todayEnd }),
      countOrders(supabase, { branchId, storeId, createdFrom: weekStart, createdTo: weekEnd }),
      countOrders(supabase, { branchId, storeId, statuses: pendingStatuses }),
      countOrders(supabase, { branchId, storeId, statuses: activeRentalStatuses, endBefore: todayStart }),
      countOrders(supabase, { branchId, storeId, startFrom: todayStart, startTo: todayEnd, excludeStatuses: ['cancelled'] }),
      countOrders(supabase, { branchId, storeId, endFrom: todayStart, endTo: todayEnd, statuses: activeRentalStatuses }),
      countOrders(supabase, { branchId, storeId, startFrom: tomorrowStart, startTo: tomorrowEnd, excludeStatuses: ['cancelled'] }),
      countOrders(supabase, { branchId, storeId, statuses: activeRentalStatuses }),
      countCustomers(supabase, branchId, storeId),
      sumDepositsHeld(supabase, branchId, storeId),
      getProductStats(supabase, branchId, storeId),
      getRecentProducts(supabase, branchId, storeId),
    ]);

    const metrics: MobileDashboardMetrics = {
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      newOrdersToday,
      newOrdersThisWeek,
      pendingOrders,
      overdueReturns,
      todaysPickups,
      todaysReturns,
      upcomingPickupsTomorrow,
      activeRentals,
      totalCustomers,
      depositsHeld,
      lowStockCount: productStats.lowStockCount,
      damagedItemsCount: 0,
      revenueChangeToday: percentageChange(revenueToday, revenueYesterday),
      revenueChangeThisWeek: percentageChange(revenueThisWeek, revenueLastWeek),
      revenueChangeThisMonth: percentageChange(revenueThisMonth, revenueLastMonth),
      totalProducts: productStats.totalProducts,
      availableProducts: productStats.availableProducts,
      featuredProducts: productStats.featuredProducts,
      recentProducts,
    };

    return apiSuccess(metrics);
  } catch (error) {
    console.error('Error fetching mobile dashboard metrics:', error);
    return apiInternalError('Failed to fetch dashboard metrics');
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function scopeOrderQuery(query: any, branchId?: string, storeId?: string) {
  if (branchId) return query.eq('branch_id', branchId);
  if (storeId) return query.eq('store_id', storeId);
  return query;
}

function scopePaymentQuery(query: any, branchId?: string, storeId?: string) {
  if (branchId) return query.eq('orders.branch_id', branchId);
  if (storeId) return query.eq('orders.store_id', storeId);
  return query;
}

async function sumPayments(supabase: any, from: Date, to: Date, branchId?: string, storeId?: string) {
  let query = supabase
    .from('payments')
    .select('amount, orders!inner(branch_id, store_id)')
    .gte('payment_date', from.toISOString())
    .lte('payment_date', to.toISOString())
    .neq('payment_type', 'refund');

  query = scopePaymentQuery(query, branchId, storeId);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
}

interface OrderCountParams {
  branchId?: string;
  storeId?: string;
  statuses?: string[];
  excludeStatuses?: string[];
  createdFrom?: Date;
  createdTo?: Date;
  startFrom?: Date;
  startTo?: Date;
  endFrom?: Date;
  endTo?: Date;
  endBefore?: Date;
}

async function countOrders(supabase: any, params: OrderCountParams) {
  let query = supabase.from('orders').select('*', { count: 'exact', head: true });
  query = scopeOrderQuery(query, params.branchId, params.storeId);

  if (params.statuses?.length) query = query.in('status', params.statuses);
  if (params.excludeStatuses?.length) query = query.not('status', 'in', `(${params.excludeStatuses.join(',')})`);
  if (params.createdFrom) query = query.gte('created_at', params.createdFrom.toISOString());
  if (params.createdTo) query = query.lte('created_at', params.createdTo.toISOString());
  if (params.startFrom) query = query.gte('start_date', params.startFrom.toISOString().split('T')[0]);
  if (params.startTo) query = query.lte('start_date', params.startTo.toISOString().split('T')[0]);
  if (params.endFrom) query = query.gte('end_date', params.endFrom.toISOString().split('T')[0]);
  if (params.endTo) query = query.lte('end_date', params.endTo.toISOString().split('T')[0]);
  if (params.endBefore) query = query.lt('end_date', params.endBefore.toISOString().split('T')[0]);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function countCustomers(supabase: any, branchId?: string, storeId?: string) {
  let query = supabase.from('customers').select('*', { count: 'exact', head: true });
  if (branchId) query = query.eq('created_at_branch_id', branchId);
  if (storeId) query = query.eq('store_id', storeId);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function sumDepositsHeld(supabase: any, branchId?: string, storeId?: string) {
  let query = supabase
    .from('orders')
    .select('security_deposit')
    .in('status', activeRentalStatuses);

  query = scopeOrderQuery(query, branchId, storeId);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce((sum: number, order: any) => sum + Number(order.security_deposit || 0), 0);
}

async function getProductStats(supabase: any, branchId?: string, storeId?: string) {
  if (branchId) {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('available_quantity, low_stock_threshold, product:products(id, is_featured, is_active)')
      .eq('branch_id', branchId);

    if (error) throw error;

    const rows = data || [];
    return {
      totalProducts: rows.length,
      availableProducts: rows.filter((row: any) => Number(row.available_quantity || 0) > 0).length,
      featuredProducts: rows.filter((row: any) => row.product?.is_featured === true).length,
      lowStockCount: rows.filter((row: any) => {
        const available = Number(row.available_quantity || 0);
        const threshold = Number(row.low_stock_threshold || 0);
        return row.product?.is_active !== false && available <= threshold;
      }).length,
    };
  }

  let query = supabase
    .from('products')
    .select('available_quantity, low_stock_threshold, is_featured, is_active');

  if (storeId) query = query.eq('store_id', storeId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  return {
    totalProducts: rows.length,
    availableProducts: rows.filter((row: any) => Number(row.available_quantity || 0) > 0).length,
    featuredProducts: rows.filter((row: any) => row.is_featured === true).length,
    lowStockCount: rows.filter((row: any) => {
      const available = Number(row.available_quantity || 0);
      const threshold = Number(row.low_stock_threshold || 0);
      return row.is_active !== false && available <= threshold;
    }).length,
  };
}

async function getRecentProducts(supabase: any, branchId?: string, storeId?: string) {
  if (branchId) {
    const { data, error } = await supabase
      .from('product_inventory')
      .select(`
        available_quantity,
        updated_at,
        product:products(
          id,
          name,
          price_per_day,
          images,
          is_active,
          category:category_id(id, name)
        )
      `)
      .eq('branch_id', branchId)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return (data || [])
      .filter((row: any) => row.product)
      .map((row: any) => ({
        ...row.product,
        available_quantity: row.available_quantity,
      }));
  }

  let query = supabase
    .from('products')
    .select('id, name, price_per_day, available_quantity, images, is_active, category:category_id(id, name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (storeId) query = query.eq('store_id', storeId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
