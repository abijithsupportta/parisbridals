import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const supabase = createAdminClient();
    const now = new Date();

    // Default to today if no date range provided
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Calculate comparison periods for percentage change
    const yesterdayStart = startOfDay(new Date(now.setDate(now.getDate() - 1)));
    const yesterdayEnd = endOfDay(new Date(now.setDate(now.getDate() - 1)));
    const lastWeekStart = startOfWeek(new Date(now.setDate(now.getDate() - 7)), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(new Date(now.setDate(now.getDate() - 7)), { weekStartsOn: 1 });
    const lastMonthStart = startOfMonth(new Date(now.setMonth(now.getMonth() - 1)));
    const lastMonthEnd = endOfMonth(new Date(now.setMonth(now.getMonth() - 1)));

    // 1. Revenue - Today
    const { data: paymentsToday } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', todayStart.toISOString())
      .lte('payment_date', todayEnd.toISOString())
      .neq('payment_type', 'refund');

    const revenueToday = paymentsToday?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Revenue - Yesterday (for comparison)
    const { data: paymentsYesterday } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', yesterdayStart.toISOString())
      .lte('payment_date', yesterdayEnd.toISOString())
      .neq('payment_type', 'refund');

    const revenueYesterday = paymentsYesterday?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const revenueChangeToday = revenueYesterday === 0 ? 0 : ((revenueToday - revenueYesterday) / revenueYesterday) * 100;

    // 2. Revenue - This Week
    const { data: paymentsThisWeek } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', weekStart.toISOString())
      .lte('payment_date', weekEnd.toISOString())
      .neq('payment_type', 'refund');

    const revenueThisWeek = paymentsThisWeek?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Revenue - Last Week (for comparison)
    const { data: paymentsLastWeek } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', lastWeekStart.toISOString())
      .lte('payment_date', lastWeekEnd.toISOString())
      .neq('payment_type', 'refund');

    const revenueLastWeek = paymentsLastWeek?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const revenueChangeThisWeek = revenueLastWeek === 0 ? 0 : ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100;

    // 3. Revenue - This Month
    const { data: paymentsThisMonth } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', monthStart.toISOString())
      .lte('payment_date', monthEnd.toISOString())
      .neq('payment_type', 'refund');

    const revenueThisMonth = paymentsThisMonth?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Revenue - Last Month (for comparison)
    const { data: paymentsLastMonth } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', lastMonthStart.toISOString())
      .lte('payment_date', lastMonthEnd.toISOString())
      .neq('payment_type', 'refund');

    const revenueLastMonth = paymentsLastMonth?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const revenueChangeThisMonth = revenueLastMonth === 0 ? 0 : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;

    // 4. New Orders - Today
    const { count: newOrdersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    // 5. New Orders - This Week
    const { count: newOrdersThisWeek } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    // 6. Pending Orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed']);

    // 7. Overdue Returns
    const { data: overdueOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'picked_up')
      .lt('end_date', now.toISOString());

    const overdueReturns = overdueOrders?.length || 0;

    // 8. Today's Pickups
    const { count: todaysPickups } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('start_date', todayStart.toISOString())
      .lte('start_date', todayEnd.toISOString())
      .neq('status', 'cancelled');

    // 9. Today's Returns
    const { count: todaysReturns } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('end_date', todayStart.toISOString())
      .lte('end_date', todayEnd.toISOString())
      .eq('status', 'picked_up');

    // 10. Tomorrow's Pickups
    const tomorrowStart = startOfDay(new Date(now.setDate(now.getDate() + 1)));
    const tomorrowEnd = endOfDay(new Date(now.setDate(now.getDate() + 1)));
    const { count: upcomingPickupsTomorrow } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('start_date', tomorrowStart.toISOString())
      .lte('start_date', tomorrowEnd.toISOString())
      .neq('status', 'cancelled');

    // 11. Active Rentals
    const { count: activeRentals } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['picked_up', 'confirmed']);

    // 12. Total Customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // 13. Deposits Held
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('security_deposit')
      .in('status', ['picked_up', 'confirmed']);

    const depositsHeld = activeOrders?.reduce((sum, o) => sum + Number(o.security_deposit || 0), 0) || 0;

    // 14. Low Stock Count
    const { count: lowStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('available_quantity', 10)
      .eq('track_inventory', true)
      .eq('is_active', true);

    // 15. Damaged Items Count (placeholder - need damaged_items table)
    const damagedItemsCount = 0;

    const metrics: MobileDashboardMetrics = {
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      newOrdersToday: newOrdersToday || 0,
      newOrdersThisWeek: newOrdersThisWeek || 0,
      pendingOrders: pendingOrders || 0,
      overdueReturns,
      todaysPickups: todaysPickups || 0,
      todaysReturns: todaysReturns || 0,
      upcomingPickupsTomorrow: upcomingPickupsTomorrow || 0,
      activeRentals: activeRentals || 0,
      totalCustomers: totalCustomers || 0,
      depositsHeld,
      lowStockCount: lowStockCount || 0,
      damagedItemsCount,
      revenueChangeToday: Math.round(revenueChangeToday * 100) / 100,
      revenueChangeThisWeek: Math.round(revenueChangeThisWeek * 100) / 100,
      revenueChangeThisMonth: Math.round(revenueChangeThisMonth * 100) / 100,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching mobile dashboard metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard metrics',
      },
      { status: 500 }
    );
  }
}
