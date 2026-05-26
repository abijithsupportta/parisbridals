import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../providers/dashboard_provider.dart';
import '../repositories/dashboard_repository.dart';
import '../../auth/providers/auth_provider.dart';
import '../../orders/views/create_order/create_order_view.dart';
import '../../orders/providers/order_provider.dart';

class DashboardView extends ConsumerStatefulWidget {
  const DashboardView({super.key});

  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);
  static const _bg = Color(0xFFF8F8F8);
  static const _danger = Color(0xFFFF6B8A);
  static const _success = Color(0xFF10B981);

  @override
  ConsumerState<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends ConsumerState<DashboardView> {
  final _currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final metricsAsync = ref.watch(dashboardMetricsProvider);
    final user = ref.watch(authUserProvider);
    final canManage = ref.watch(canManageProvider);

    return Container(
      color: DashboardView._bg,
      child: Stack(
        children: [
          RefreshIndicator(
            onRefresh: () async => ref.invalidate(dashboardMetricsProvider),
            color: DashboardView._accent,
            child: ListView(
              padding: Responsive.only(left: 14, right: 14, top: 14, bottom: 80),
              children: [
                _buildGreetingBanner(user),
                SizedBox(height: Responsive.h(14)),
                metricsAsync.when(
                  data: (metrics) => _buildDashboardContent(metrics),
                  loading: () => _buildLoadingState(),
                  error: (error, _) => _buildErrorState(error),
                ),
              ],
            ),
          ),
          if (canManage)
            Positioned(
              right: Responsive.w(16),
              bottom: Responsive.h(16),
              child: FloatingActionButton.extended(
                heroTag: 'dashboard_order_fab',
                onPressed: () => Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => const CreateOrderView()))
                    .then((_) {
                  ref.invalidate(dashboardMetricsProvider);
                  ref.invalidate(ordersProvider);
                }),
                backgroundColor: DashboardView._accent,
                foregroundColor: DashboardView._primary,
                icon: Icon(Icons.add_rounded, size: Responsive.icon(24)),
                label: Text('New Order',
                    style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)),
                elevation: 3,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGreetingBanner(AuthUser? user) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: DashboardView._primary,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: DashboardView._primary.withValues(alpha: 0.25),
            blurRadius: Responsive.r(10),
            offset: Offset(0, Responsive.h(4)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$greeting, ${user?.name ?? 'User'}',
            style: TextStyle(fontSize: Responsive.sp(20), fontWeight: FontWeight.bold, color: Colors.white),
          ),
          SizedBox(height: Responsive.h(4)),
          Text(
            'Here is the pulse of Paris Bridals',
            style: TextStyle(fontSize: Responsive.sp(13), color: Colors.white.withValues(alpha: 0.85)),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardContent(DashboardMetrics metrics) {
    return Column(
      children: [
        _buildOverviewCards(metrics),
        SizedBox(height: Responsive.h(14)),
        _buildOrderStatusBreakdown(metrics),
        SizedBox(height: Responsive.h(20)),
      ],
    );
  }

  Widget _buildOverviewCards(DashboardMetrics metrics) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: Responsive.symmetric(horizontal: 4),
          child: Text(
            'Branch Overview',
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
        ),
        SizedBox(height: Responsive.h(8)),
        Row(
          children: [
            Expanded(child: _buildMetricCard('Total Revenue', _currencyFormat.format(metrics.totalRevenue), Icons.account_balance_wallet, DashboardView._success)),
            SizedBox(width: Responsive.w(8)),
            Expanded(child: _buildMetricCard('Revenue Today', _currencyFormat.format(metrics.revenueToday), Icons.payments, DashboardView._accent)),
          ],
        ),
        SizedBox(height: Responsive.h(8)),
        Row(
          children: [
            Expanded(child: _buildMetricCard('Total Orders', metrics.totalOrders.toString(), Icons.receipt_long, DashboardView._primary)),
            SizedBox(width: Responsive.w(8)),
            Expanded(child: _buildMetricCard('Orders Today', metrics.ordersToday.toString(), Icons.shopping_bag, Colors.blue)),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(10)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(3)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: Responsive.icon(16), color: color),
              SizedBox(width: Responsive.w(6)),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600], fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(8)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(fontSize: Responsive.sp(20), fontWeight: FontWeight.bold, color: DashboardView._primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderStatusBreakdown(DashboardMetrics metrics) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(10)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(3)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Status',
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(10)),
          GridView.count(
            crossAxisCount: 3,
            crossAxisSpacing: Responsive.w(8),
            mainAxisSpacing: Responsive.h(8),
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.0,
            children: [
              _buildStatusCard('Scheduled', metrics.totalScheduled, Icons.event_available, Colors.blue),
              _buildStatusCard('Ongoing', metrics.totalOngoing, Icons.local_shipping, DashboardView._success),
              _buildStatusCard('Late Return', metrics.totalLates, Icons.warning_amber, DashboardView._danger),
              _buildStatusCard('Partial Return', metrics.totalPartial, Icons.inventory_2_outlined, Colors.orange),
              _buildStatusCard('Flagged', metrics.totalFlagged, Icons.flag, Colors.red),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(String label, int count, IconData icon, Color color) {
    return Container(
      padding: Responsive.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Responsive.r(8)),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: Responsive.icon(18)),
          SizedBox(height: Responsive.h(4)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              count.toString(),
              style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: color),
            ),
          ),
          SizedBox(height: Responsive.h(2)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              style: TextStyle(fontSize: Responsive.sp(9), color: color, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Column(
        children: [
          _buildShimmerCard(height: 110),
          SizedBox(height: Responsive.h(16)),
          _buildShimmerGrid(),
        ],
      ),
    );
  }

  Widget _buildShimmerGrid() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: Responsive.w(10),
      mainAxisSpacing: Responsive.h(10),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.35,
      children: List.generate(4, (_) => _buildShimmerCard(height: 100)),
    );
  }

  Widget _buildShimmerCard({required double height}) {
    return Container(
      height: Responsive.h(height),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
      ),
    );
  }

  Widget _buildErrorState(Object error) {
    return Container(
      padding: Responsive.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(12))),
      child: Column(
        children: [
          Icon(Icons.error_outline, size: Responsive.icon(48), color: DashboardView._danger),
          SizedBox(height: Responsive.h(16)),
          Text(
            'Unable to load dashboard',
            style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[600], fontWeight: FontWeight.w600),
          ),
          SizedBox(height: Responsive.h(6)),
          Text(
            '$error',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[500]),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: Responsive.h(16)),
          ElevatedButton(
            onPressed: () => ref.invalidate(dashboardMetricsProvider),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
