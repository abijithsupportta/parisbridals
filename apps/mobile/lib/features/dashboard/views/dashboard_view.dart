import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../providers/dashboard_provider.dart';
import '../repositories/dashboard_repository.dart';
import '../../auth/providers/auth_provider.dart';

class DashboardView extends ConsumerStatefulWidget {
  const DashboardView({super.key});

  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);
  static const _surface = Color(0xFFFAEBCD);
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

    return Container(
      color: DashboardView._bg,
      child: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardMetricsProvider),
        color: DashboardView._accent,
        child: ListView(
          padding: Responsive.all(14),
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
            'Here is the pulse of Paris Bridals today',
            style: TextStyle(fontSize: Responsive.sp(13), color: Colors.white.withValues(alpha: 0.85)),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardContent(DashboardMetrics metrics) {
    final hasAlerts = metrics.lowStockCount > 0 || metrics.overdueReturns > 0 || metrics.upcomingPickupsTomorrow > 0;

    return Column(
      children: [
        _buildRevenuePacingCards(metrics),
        SizedBox(height: Responsive.h(14)),
        _buildOperationsGrid(metrics),
        if (hasAlerts) ...[
          SizedBox(height: Responsive.h(14)),
          _buildAlertSection(metrics),
        ],
        SizedBox(height: Responsive.h(14)),
        _buildInventoryStats(metrics),
        SizedBox(height: Responsive.h(14)),
        _buildRecentProductsSection(metrics),
        SizedBox(height: Responsive.h(20)),
      ],
    );
  }

  Widget _buildRevenuePacingCards(DashboardMetrics metrics) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: Responsive.symmetric(horizontal: 4),
          child: Text(
            'Revenue Pacing',
            style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
        ),
        SizedBox(height: Responsive.h(10)),
        Row(
          children: [
            Expanded(child: _buildRevenueCard('Today', metrics.revenueToday, metrics.revenueChangeToday)),
            SizedBox(width: Responsive.w(10)),
            Expanded(child: _buildRevenueCard('This Week', metrics.revenueThisWeek, metrics.revenueChangeThisWeek)),
          ],
        ),
        SizedBox(height: Responsive.h(10)),
        _buildRevenueCard('This Month', metrics.revenueThisMonth, metrics.revenueChangeThisMonth, isWide: true),
      ],
    );
  }

  Widget _buildRevenueCard(String period, double amount, double changePercent, {bool isWide = false}) {
    final isPositive = changePercent >= 0;
    return Container(
      padding: Responsive.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(10),
            offset: Offset(0, Responsive.h(4)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            period,
            style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600], fontWeight: FontWeight.w500),
          ),
          SizedBox(height: Responsive.h(8)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              _currencyFormat.format(amount),
              style: TextStyle(fontSize: Responsive.sp(20), fontWeight: FontWeight.bold, color: DashboardView._primary),
            ),
          ),
          SizedBox(height: Responsive.h(6)),
          Row(
            children: [
              Icon(
                isPositive ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                size: Responsive.icon(14),
                color: isPositive ? DashboardView._success : DashboardView._danger,
              ),
              SizedBox(width: Responsive.w(4)),
              Text(
                '${changePercent.abs().toStringAsFixed(1)}%',
                style: TextStyle(
                  fontSize: Responsive.sp(11),
                  fontWeight: FontWeight.w600,
                  color: isPositive ? DashboardView._success : DashboardView._danger,
                ),
              ),
              SizedBox(width: Responsive.w(4)),
              Expanded(
                child: Text(
                  'vs last period',
                  style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[500]),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOperationsGrid(DashboardMetrics metrics) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: Responsive.symmetric(horizontal: 4),
          child: Text(
            'Operations Today',
            style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
        ),
        SizedBox(height: Responsive.h(10)),
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: Responsive.w(10),
          mainAxisSpacing: Responsive.h(10),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.4,
          children: [
            _buildOperationCard('New Orders', metrics.newOrdersToday, Icons.receipt_long_outlined, DashboardView._accent),
            _buildOperationCard('Pending', metrics.pendingOrders, Icons.pending_actions_rounded, Colors.orange),
            _buildOperationCard('Pickups Today', metrics.todaysPickups, Icons.event_available_outlined, Colors.blue),
            _buildOperationCard('Returns Today', metrics.todaysReturns, Icons.assignment_return_outlined, Colors.green),
            _buildOperationCard('Active Rentals', metrics.activeRentals, Icons.local_shipping_outlined, DashboardView._primary),
            _buildOperationCard('Overdue', metrics.overdueReturns, Icons.warning_amber_outlined, DashboardView._danger),
          ],
        ),
      ],
    );
  }

  Widget _buildOperationCard(String title, int value, IconData icon, Color color) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, size: Responsive.icon(20), color: color),
              if (value > 0 && (title.contains('Overdue') || title.contains('Pending')))
                Container(
                  padding: Responsive.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(Responsive.r(8)),
                  ),
                  child: Text(
                    'Action',
                    style: TextStyle(fontSize: Responsive.sp(8), color: color, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value.toString(),
              style: TextStyle(fontSize: Responsive.sp(24), fontWeight: FontWeight.bold, color: DashboardView._primary),
            ),
          ),
          Text(
            title,
            style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600], fontWeight: FontWeight.w500),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildAlertSection(DashboardMetrics metrics) {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: DashboardView._danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: DashboardView._danger.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: DashboardView._danger, size: Responsive.icon(20)),
              SizedBox(width: Responsive.w(8)),
              Text(
                'Action Required',
                style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._danger),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(12)),
          if (metrics.overdueReturns > 0) _buildAlertItem('${metrics.overdueReturns} overdue returns - immediate action needed'),
          if (metrics.lowStockCount > 0) _buildAlertItem('${metrics.lowStockCount} products below stock threshold'),
          if (metrics.upcomingPickupsTomorrow > 0) _buildAlertItem('${metrics.upcomingPickupsTomorrow} pickups scheduled for tomorrow'),
        ],
      ),
    );
  }

  Widget _buildAlertItem(String message) {
    return Padding(
      padding: Responsive.only(bottom: 6),
      child: Row(
        children: [
          Container(
            width: Responsive.w(6),
            height: Responsive.w(6),
            decoration: const BoxDecoration(shape: BoxShape.circle, color: DashboardView._danger),
          ),
          SizedBox(width: Responsive.w(8)),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: Responsive.sp(12), color: DashboardView._danger, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryStats(DashboardMetrics metrics) {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: Responsive.r(6),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Inventory Overview',
            style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(14)),
          Row(
            children: [
              Expanded(child: _buildInventoryItem('Total Products', metrics.totalProducts, Icons.inventory_2_outlined)),
              SizedBox(width: Responsive.w(10)),
              Expanded(child: _buildInventoryItem('Available', metrics.availableProducts, Icons.check_circle_outline)),
            ],
          ),
          SizedBox(height: Responsive.h(10)),
          Row(
            children: [
              Expanded(child: _buildInventoryItem('Featured', metrics.featuredProducts, Icons.star_outline)),
              SizedBox(width: Responsive.w(10)),
              Expanded(child: _buildInventoryItem('Customers', metrics.totalCustomers, Icons.people_outline)),
            ],
          ),
          SizedBox(height: Responsive.h(14)),
          Container(
            padding: Responsive.all(12),
            decoration: BoxDecoration(
              color: DashboardView._accent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(Responsive.r(10)),
            ),
            child: Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined, color: DashboardView._accent, size: Responsive.icon(20)),
                SizedBox(width: Responsive.w(10)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Security Deposits Held',
                        style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[700]),
                      ),
                      SizedBox(height: Responsive.h(2)),
                      Text(
                        _currencyFormat.format(metrics.depositsHeld),
                        style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: DashboardView._primary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryItem(String label, int value, IconData icon) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: DashboardView._surface.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Responsive.icon(18), color: DashboardView._primary),
          SizedBox(height: Responsive.h(8)),
          Text(
            value.toString(),
            style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(2)),
          Text(
            label,
            style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[600]),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildRecentProductsSection(DashboardMetrics metrics) {
    if (metrics.recentProducts.isEmpty) {
      return Container(
        padding: Responsive.all(20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(12))),
        child: Text(
          'No recent products for this branch',
          style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[500]),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: Responsive.r(6),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Recent Products',
            style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(12)),
          ...metrics.recentProducts.map(_buildProductCard),
        ],
      ),
    );
  }

  Widget _buildProductCard(DashboardProduct product) {
    return Container(
      margin: Responsive.only(bottom: 12),
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: DashboardView._surface.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(Responsive.r(8)),
            child: product.imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: product.imageUrl!,
                    width: Responsive.w(50),
                    height: Responsive.h(50),
                    fit: BoxFit.cover,
                    placeholder: (context, url) => _buildImageFallback(),
                    errorWidget: (context, url, error) => _buildImageFallback(),
                  )
                : _buildImageFallback(),
          ),
          SizedBox(width: Responsive.w(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: Responsive.sp(13), color: DashboardView._primary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (product.categoryName != null) ...[
                  SizedBox(height: Responsive.h(2)),
                  Text(
                    product.categoryName!,
                    style: TextStyle(color: Colors.grey[600], fontSize: Responsive.sp(11)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                SizedBox(height: Responsive.h(4)),
                Text(
                  '${_currencyFormat.format(product.pricePerDay)}/day',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: Responsive.sp(12), color: DashboardView._accent),
                ),
              ],
            ),
          ),
          Text(
            '${product.availableQuantity} in stock',
            style: TextStyle(
              fontSize: Responsive.sp(10),
              color: product.availableQuantity < 10 ? DashboardView._danger : Colors.green,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageFallback() {
    return Container(
      width: Responsive.w(50),
      height: Responsive.h(50),
      color: Colors.grey[200],
      child: Icon(Icons.inventory_2_outlined, color: Colors.grey[400], size: Responsive.icon(22)),
    );
  }

  Widget _buildLoadingState() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Column(
        children: [
          _buildShimmerGrid(),
          SizedBox(height: Responsive.h(16)),
          _buildShimmerGrid(),
          SizedBox(height: Responsive.h(16)),
          _buildShimmerCard(),
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
      children: List.generate(4, (_) => _buildShimmerCard()),
    );
  }

  Widget _buildShimmerCard() {
    return Container(
      height: Responsive.h(110),
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
