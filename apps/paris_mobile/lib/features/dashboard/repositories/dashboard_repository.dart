import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';
import '../models/dashboard_models.dart';
import '../../../../core/supabase_client.dart';

/// Dashboard Repository - Fetches real data from Supabase
class DashboardRepository {
  final AppSupabaseClient _supabase;

  DashboardRepository(this._supabase);

  /// Fetch all dashboard metrics
  Future<DashboardMetrics> getMetrics() async {
    try {
      // Check auth state
      final session = _supabase.client.auth.currentSession;
      if (kDebugMode) {
        print('Dashboard: Auth state - User: ${session?.user?.email}, Access Token: ${session?.accessToken?.substring(0, 20)}...');
      }

      if (kDebugMode) print('Dashboard: Starting data fetch...');

      // 1. Total Revenue (all time, excluding refunds)
      final revenueResponse = await _supabase.client
          .from('payments')
          .select('amount')
          .neq('payment_type', 'refund');

      double totalRevenue = 0.0;
      if (revenueResponse != null && revenueResponse.isNotEmpty) {
        totalRevenue = revenueResponse.fold<double>(
          0.0,
          (sum, payment) {
            final amount = payment['amount'];
            if (amount == null) return sum;
            if (amount is num) return sum + amount.toDouble();
            return sum;
          },
        );
      }
      if (kDebugMode) print('Dashboard: Revenue = $totalRevenue, count = ${revenueResponse?.length ?? 0}');

      // 2. Total Orders (all time, excluding cancelled)
      final ordersResponse = await _supabase.client
          .from('orders')
          .select('id')
          .neq('status', 'cancelled');

      final totalOrders = ordersResponse?.length ?? 0;
      if (kDebugMode) print('Dashboard: Total Orders = $totalOrders');

      // 3. Scheduled Orders (upcoming, not cancelled)
      final now = DateTime.now();
      final scheduledResponse = await _supabase.client
          .from('orders')
          .select('id')
          .gte('start_date', now.toIso8601String())
          .neq('status', 'cancelled');

      final scheduledOrders = scheduledResponse?.length ?? 0;
      if (kDebugMode) print('Dashboard: Scheduled Orders = $scheduledOrders');

      // 4. In Rental (picked_up or confirmed)
      final inRentalPickedUp = await _supabase.client
          .from('orders')
          .select('id')
          .eq('status', 'picked_up');
      
      final inRentalConfirmed = await _supabase.client
          .from('orders')
          .select('id')
          .eq('status', 'confirmed');

      final inRental = (inRentalPickedUp?.length ?? 0) + (inRentalConfirmed?.length ?? 0);
      if (kDebugMode) print('Dashboard: In Rental = $inRental');

      // 5. In Stock (total products - products in rental)
      final productsResponse = await _supabase.client
          .from('products')
          .select('id, is_active')
          .eq('is_active', true);

      final inStock = productsResponse?.length ?? 0;
      if (kDebugMode) print('Dashboard: In Stock = $inStock');

      // 6. Total Customers
      final customersResponse = await _supabase.client
          .from('customers')
          .select('id');

      final totalCustomers = customersResponse?.length ?? 0;
      if (kDebugMode) print('Dashboard: Total Customers = $totalCustomers');

      // 7. Pending/Late (overdue orders)
      final overdueResponse = await _supabase.client
          .from('orders')
          .select('id, end_date')
          .eq('status', 'picked_up')
          .lt('end_date', now.toIso8601String());

      final pendingLate = overdueResponse?.length ?? 0;
      if (kDebugMode) print('Dashboard: Pending/Late = $pendingLate');

      // 8. Recent Orders (last 5)
      final recentOrdersResponse = await _supabase.client
          .from('orders')
          .select('id, status, created_at, customers(name)')
          .neq('status', 'cancelled')
          .order('created_at', ascending: false)
          .limit(5);

      final recentOrders = recentOrdersResponse?.map((order) {
        return RecentOrder(
          id: order['id'] as String,
          customerName: (order['customers'] as Map?)?['name'] as String? ?? 'Unknown',
          productName: null,
          status: order['status'] as String? ?? 'unknown',
          createdAt: DateTime.parse(order['created_at'] as String),
        );
      }).toList() ?? [];
      if (kDebugMode) print('Dashboard: Recent Orders count = ${recentOrders.length}');

      if (kDebugMode) print('Dashboard: Data fetch complete');

      return DashboardMetrics(
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        scheduledOrders: scheduledOrders,
        inRental: inRental,
        inStock: inStock,
        totalCustomers: totalCustomers,
        pendingLate: pendingLate,
        recentOrders: recentOrders,
      );
    } catch (e, stackTrace) {
      if (kDebugMode) {
        print('Dashboard Error: $e');
        print('Stack trace: $stackTrace');
      }
      // Return empty metrics on error
      return DashboardMetrics(
        totalRevenue: 0.0,
        totalOrders: 0,
        scheduledOrders: 0,
        inRental: 0,
        inStock: 0,
        totalCustomers: 0,
        pendingLate: 0,
        recentOrders: [],
      );
    }
  }
}
