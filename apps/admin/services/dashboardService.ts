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

    // 6. Top Performers
    // For this demonstration, we fetch all order items in the period and aggregate in memory.
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, price_per_day, products(name)')
      .returns<any[]>();

    const productStats = new Map<string, {name: string, rentals: number, revenue: number}>();
    orderItems?.forEach(item => {
      if (!item.products) return;
      const pid = item.product_id;
      const stats = productStats.get(pid) || { name: item.products.name, rentals: 0, revenue: 0 };
      stats.rentals += item.quantity;
      stats.revenue += (item.quantity * Number(item.price_per_day || 0));
      productStats.set(pid, stats);
    });

    const topPerformers = Array.from(productStats.values())
      .sort((a, b) => b.rentals - a.rentals)
      .slice(0, 3)
      .map((p, i) => ({ id: String(i), ...p }));

    // Format output
    return {
      revenuePacing: {
        current: currentRevenue,
        previous: prevRevenue,
        percentageChange: Math.abs(Math.round(percentageChange)),
        isPositive: percentageChange >= 0
      },
      assetExposure: {
        inventoryValueOut: 24500, // Placeholder
        depositsHeld: depositsHeld
      },
      utilization: {
        percentage: 68 // Placeholder
      },
      actionRequired: {
        totalIssues: overdueOrders.length,
        overdueCount: overdueOrders.length,
        damagedCount: 0,
        pendingApprovalCount: 0
      },
      bookingVelocity,
      topPerformers,
      deadStock: [
        { id: "1", name: "Ruby Teardrop Pendant", daysIdle: 94, value: 800 }
      ],
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
