import { createAdminClient } from '@/lib/supabase/server';
import { format, differenceInDays, addDays } from 'date-fns';

export interface DashboardMetrics {
  revenuePacing: {
    current: number;
    previous: number;
    percentageChange: number;
    isPositive: boolean;
  };
  assetExposure: {
    inventoryValueOut: number;
    depositsHeld: number;
  };
  utilization: {
    percentage: number;
  };
  actionRequired: {
    totalIssues: number;
    overdueCount: number;
    damagedCount: number;
    pendingApprovalCount: number;
  };
  bookingVelocity: {
    date: string;
    count: number;
  }[];
  topPerformers: {
    id: string;
    name: string;
    rentals: number;
    revenue: number;
  }[];
  deadStock: {
    id: string;
    name: string;
    daysIdle: number;
    value: number;
  }[];
  categoryRevenue: {
    name: string;
    revenue: number;
    percentage: number;
  }[];
  bottlenecks: {
    id: string;
    type: 'cleaning' | 'approval' | 'overdue';
    message: string;
    severity: 'high' | 'medium';
  }[];
}

export class DashboardService {
  async getMetrics(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date): Promise<DashboardMetrics> {
    const supabase = createAdminClient();
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const velocityEnd = addDays(now, 15);

    // ── BATCH: Fire ALL independent queries in PARALLEL ──────────────
    // Before: 8 sequential queries × ~50ms = ~400ms
    // After:  1 parallel batch = ~50ms (limited by slowest query)
    const [
      currentPaymentsResult,
      prevPaymentsResult,
      activeOrdersResult,
      upcomingOrdersResult,
      orderItemsResult,
      totalProductsResult,
      recentOrderProductIdsResult,
      allActiveProductsResult,
    ] = await Promise.all([
      // 1. Current period revenue
      supabase
        .from('payments')
        .select('amount, payment_type')
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString())
        .neq('payment_type', 'refund'),

      // 2. Previous period revenue
      supabase
        .from('payments')
        .select('amount, payment_type')
        .gte('payment_date', prevStartDate.toISOString())
        .lte('payment_date', prevEndDate.toISOString())
        .neq('payment_type', 'refund'),

      // 3. Active orders (for deposits + overdue)
      supabase
        .from('orders')
        .select('id, security_deposit, status, end_date')
        .in('status', ['picked_up', 'confirmed']),

      // 4. Booking velocity (upcoming 15 days)
      supabase
        .from('orders')
        .select('start_date, status')
        .gte('start_date', now.toISOString())
        .lte('start_date', velocityEnd.toISOString())
        .neq('status', 'cancelled'),

      // 5. Order items — FILTERED to last 90 days (was fetching ALL rows!)
      supabase
        .from('order_items')
        .select('product_id, quantity, price_per_day, rental_days, orders!inner(created_at), products(name, category_id, categories:category_id(name))')
        .gte('orders.created_at', ninetyDaysAgo.toISOString())
        .returns<any[]>(),

      // 6. Total active products count
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // 7. Recent order product IDs (for dead stock)
      supabase
        .from('order_items')
        .select('product_id, orders!inner(created_at)')
        .gte('orders.created_at', ninetyDaysAgo.toISOString())
        .returns<any[]>(),

      // 8. All active products (for dead stock)
      supabase
        .from('products')
        .select('id, name, price_per_day, created_at')
        .eq('is_active', true)
        .limit(100),
    ]);

    // ── Process results ────────────────────────────────────────────────

    // Revenue
    const currentRevenue = currentPaymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const prevRevenue = prevPaymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const percentageChange = prevRevenue === 0 ? 100 : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

    // Asset exposure
    const activeOrders = activeOrdersResult.data || [];
    const depositsHeld = activeOrders.reduce((sum, o) => sum + Number(o.security_deposit || 0), 0);

    // Overdue
    const overdueOrders = activeOrders.filter(o => o.status === 'picked_up' && new Date(o.end_date) < now);

    // Booking velocity
    const velocityMap = new Map<string, number>();
    upcomingOrdersResult.data?.forEach(order => {
      const dateStr = format(new Date(order.start_date), 'yyyy-MM-dd');
      velocityMap.set(dateStr, (velocityMap.get(dateStr) || 0) + 1);
    });
    const bookingVelocity = Array.from({ length: 15 }).map((_, i) => {
      const d = addDays(now, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      return { date: format(d, 'MMM dd'), count: velocityMap.get(dateStr) || 0 };
    });

    // Top performers + category revenue (from same order_items result — single loop)
    const orderItems = orderItemsResult.data || [];
    const productStats = new Map<string, {name: string, rentals: number, revenue: number}>();
    const categoryRevenueMap = new Map<string, { name: string; revenue: number }>();

    for (const item of orderItems) {
      if (!item.products) continue;
      const pid = item.product_id;
      const itemRevenue = item.quantity * Number(item.price_per_day || 0) * Number(item.rental_days || 1);

      // Product stats
      const stats = productStats.get(pid) || { name: item.products.name, rentals: 0, revenue: 0 };
      stats.rentals += item.quantity;
      stats.revenue += itemRevenue;
      productStats.set(pid, stats);

      // Category stats (merged into same loop — was separate loop before)
      if (item.products?.categories) {
        const catName = item.products.categories.name || 'Uncategorized';
        const existing = categoryRevenueMap.get(catName) || { name: catName, revenue: 0 };
        existing.revenue += itemRevenue;
        categoryRevenueMap.set(catName, existing);
      }
    }

    const topPerformers = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map((p, i) => ({ id: String(i), ...p }));

    const categoryRevenueArr = Array.from(categoryRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue);
    const totalCategoryRevenue = categoryRevenueArr.reduce((sum, c) => sum + c.revenue, 0);
    const categoryRevenue = categoryRevenueArr.slice(0, 5).map(c => ({
      name: c.name,
      revenue: c.revenue,
      percentage: totalCategoryRevenue > 0 ? Math.round((c.revenue / totalCategoryRevenue) * 100) : 0,
    }));

    // Utilization
    const totalProducts = totalProductsResult.count || 0;
    const utilizationPercentage = totalProducts > 0
      ? Math.round((activeOrders.length / totalProducts) * 100)
      : 0;

    // Dead stock
    const recentProductIdSet = new Set(recentOrderProductIdsResult.data?.map(i => i.product_id) || []);
    const deadStock = (allActiveProductsResult.data || [])
      .filter(p => !recentProductIdSet.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        daysIdle: Math.max(0, differenceInDays(now, new Date(p.created_at))),
        value: Number(p.price_per_day || 0),
      }))
      .filter(p => p.daysIdle >= 90)
      .sort((a, b) => b.daysIdle - a.daysIdle)
      .slice(0, 5);

    return {
      revenuePacing: {
        current: currentRevenue,
        previous: prevRevenue,
        percentageChange: Math.abs(Math.round(percentageChange)),
        isPositive: percentageChange >= 0
      },
      assetExposure: { inventoryValueOut: 0, depositsHeld },
      utilization: { percentage: utilizationPercentage },
      actionRequired: {
        totalIssues: overdueOrders.length,
        overdueCount: overdueOrders.length,
        damagedCount: 0,
        pendingApprovalCount: 0
      },
      bookingVelocity,
      topPerformers,
      deadStock,
      categoryRevenue,
      bottlenecks: overdueOrders.slice(0, 3).map(o => ({
        id: o.id,
        type: 'overdue' as const,
        message: `Order #${o.id.substring(0,8)} is overdue for return`,
        severity: 'high' as const
      }))
    };
  }
}

export const dashboardService = new DashboardService();
