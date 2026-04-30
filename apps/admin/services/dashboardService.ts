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

    // 1. Fetch Revenue (Current Period)
    const { data: currentPayments } = await supabase
      .from('payments')
      .select('amount, payment_type')
      .gte('payment_date', startDate.toISOString())
      .lte('payment_date', endDate.toISOString())
      .neq('payment_type', 'refund');

    const currentRevenue = currentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // 2. Fetch Revenue (Previous Period)
    const { data: prevPayments } = await supabase
      .from('payments')
      .select('amount, payment_type')
      .gte('payment_date', prevStartDate.toISOString())
      .lte('payment_date', prevEndDate.toISOString())
      .neq('payment_type', 'refund');

    const prevRevenue = prevPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    
    const percentageChange = prevRevenue === 0 ? 100 : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

    // 3. Asset Exposure (Deposits Held & Inventory Value Out)
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id, security_deposit, status, end_date')
      .in('status', ['picked_up', 'confirmed']);

    const depositsHeld = activeOrders?.reduce((sum, o) => sum + Number(o.security_deposit || 0), 0) || 0;
    
    // 4. Overdue Orders
    const overdueOrders = activeOrders?.filter(o => o.status === 'picked_up' && new Date(o.end_date) < now) || [];

    // 5. Booking Velocity (Upcoming 15 days)
    const velocityStartDate = now;
    const velocityEndDate = addDays(now, 15);
    const { data: upcomingOrders } = await supabase
      .from('orders')
      .select('start_date, status')
      .gte('start_date', velocityStartDate.toISOString())
      .lte('start_date', velocityEndDate.toISOString())
      .neq('status', 'cancelled');

    const velocityMap = new Map<string, number>();
    upcomingOrders?.forEach(order => {
      const dateStr = format(new Date(order.start_date), 'yyyy-MM-dd');
      velocityMap.set(dateStr, (velocityMap.get(dateStr) || 0) + 1);
    });

    const bookingVelocity = Array.from({ length: 15 }).map((_, i) => {
      const d = addDays(now, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      return {
        date: format(d, 'MMM dd'),
        count: velocityMap.get(dateStr) || 0
      };
    });

    // 6. Top Performers — aggregate order items in the period
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, price_per_day, rental_days, products(name, category_id, categories:category_id(name))')
      .returns<any[]>();

    const productStats = new Map<string, {name: string, rentals: number, revenue: number}>();
    orderItems?.forEach(item => {
      if (!item.products) return;
      const pid = item.product_id;
      const stats = productStats.get(pid) || { name: item.products.name, rentals: 0, revenue: 0 };
      stats.rentals += item.quantity;
      stats.revenue += (item.quantity * Number(item.price_per_day || 0) * Number(item.rental_days || 1));
      productStats.set(pid, stats);
    });

    const topPerformers = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map((p, i) => ({ id: String(i), ...p }));

    // 7. Category Revenue — aggregate by category
    const categoryRevenueMap = new Map<string, { name: string; revenue: number }>();
    orderItems?.forEach(item => {
      if (!item.products?.categories) return;
      const catName = item.products.categories.name || 'Uncategorized';
      const existing = categoryRevenueMap.get(catName) || { name: catName, revenue: 0 };
      existing.revenue += (item.quantity * Number(item.price_per_day || 0) * Number(item.rental_days || 1));
      categoryRevenueMap.set(catName, existing);
    });

    const categoryRevenueArr = Array.from(categoryRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue);
    const totalCategoryRevenue = categoryRevenueArr.reduce((sum, c) => sum + c.revenue, 0);
    const categoryRevenue = categoryRevenueArr.slice(0, 5).map(c => ({
      name: c.name,
      revenue: c.revenue,
      percentage: totalCategoryRevenue > 0 ? Math.round((c.revenue / totalCategoryRevenue) * 100) : 0,
    }));

    // 8. Utilization — actual ratio of rented-out vs total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const rentedOutCount = activeOrders?.length || 0;
    const utilizationPercentage = totalProducts && totalProducts > 0
      ? Math.round((rentedOutCount / totalProducts) * 100)
      : 0;

    // 9. Dead Stock — products not in any recent order (90+ days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const { data: recentOrderProductIds } = await supabase
      .from('order_items')
      .select('product_id, orders!inner(created_at)')
      .gte('orders.created_at', ninetyDaysAgo.toISOString())
      .returns<any[]>();

    const recentProductIdSet = new Set(recentOrderProductIds?.map(i => i.product_id) || []);

    const { data: allActiveProducts } = await supabase
      .from('products')
      .select('id, name, price_per_day, created_at')
      .eq('is_active', true)
      .limit(100);

    const deadStock = (allActiveProducts || [])
      .filter(p => !recentProductIdSet.has(p.id))
      .map(p => {
        const daysIdle = Math.max(0, differenceInDays(now, new Date(p.created_at)));
        return { id: p.id, name: p.name, daysIdle, value: Number(p.price_per_day || 0) };
      })
      .filter(p => p.daysIdle >= 90)
      .sort((a, b) => b.daysIdle - a.daysIdle)
      .slice(0, 5);

    // Format output
    return {
      revenuePacing: {
        current: currentRevenue,
        previous: prevRevenue,
        percentageChange: Math.abs(Math.round(percentageChange)),
        isPositive: percentageChange >= 0
      },
      assetExposure: {
        inventoryValueOut: 0,
        depositsHeld: depositsHeld
      },
      utilization: {
        percentage: utilizationPercentage
      },
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
        type: 'overdue',
        message: `Order #${o.id.substring(0,8)} is overdue for return`,
        severity: 'high'
      }))
    };
  }
}

export const dashboardService = new DashboardService();
