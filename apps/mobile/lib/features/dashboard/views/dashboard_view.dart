import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../providers/dashboard_provider.dart';
import '../repositories/dashboard_repository.dart';
import '../../auth/providers/auth_provider.dart';
import '../../orders/views/order_form_view.dart';
import '../../customers/views/customer_form_view.dart';
import '../../products/views/product_form_view.dart';

enum TimeRange { all, today, yesterday, thisWeek, thisMonth }

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
  TimeRange _selectedRange = TimeRange.all;

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
            _buildQuickActions(),
            SizedBox(height: Responsive.h(14)),
            _buildTimeRangeSelector(),
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

  Widget _buildQuickActions() {
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
        children: [
          Text(
            'Quick Actions',
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(10)),
          Row(
            children: [
              Expanded(child: _buildActionButton('New Order', Icons.add_shopping_cart, DashboardView._accent, () => _navigateToOrderForm())),
              SizedBox(width: Responsive.w(8)),
              Expanded(child: _buildActionButton('New Customer', Icons.person_add, Colors.blue, () => _navigateToCustomerForm())),
            ],
          ),
          SizedBox(height: Responsive.h(8)),
          _buildActionButton('New Product', Icons.inventory_2, DashboardView._primary, () => _navigateToProductForm()),
        ],
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(Responsive.r(8)),
      child: Container(
        padding: Responsive.symmetric(vertical: 10, horizontal: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(Responsive.r(8)),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: Responsive.icon(18)),
            SizedBox(width: Responsive.w(6)),
            Flexible(
              child: Text(
                label,
                style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w600, color: color),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToOrderForm() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const OrderFormView()));
  }

  void _navigateToCustomerForm() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomerFormView()));
  }

  void _navigateToProductForm() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const ProductFormView()));
  }

  Widget _buildTimeRangeSelector() {
    return Container(
      height: Responsive.h(40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(10)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(6),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildTimeRangeChip('All', TimeRange.all),
          _buildTimeRangeChip('Today', TimeRange.today),
          _buildTimeRangeChip('Yesterday', TimeRange.yesterday),
          _buildTimeRangeChip('Week', TimeRange.thisWeek),
          _buildTimeRangeChip('Month', TimeRange.thisMonth),
        ],
      ),
    );
  }

  Widget _buildTimeRangeChip(String label, TimeRange range) {
    final isSelected = _selectedRange == range;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedRange = range),
        child: Container(
          alignment: Alignment.center,
          margin: Responsive.symmetric(horizontal: 2, vertical: 4),
          decoration: BoxDecoration(
            color: isSelected ? DashboardView._primary : Colors.transparent,
            borderRadius: BorderRadius.circular(Responsive.r(8)),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              style: TextStyle(
                fontSize: Responsive.sp(10),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : Colors.grey[600],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardContent(DashboardMetrics metrics) {
    final hasAlerts = metrics.lowStockCount > 0 || metrics.overdueReturns > 0;

    return Column(
      children: [
        _buildRevenuePacingCards(metrics),
        SizedBox(height: Responsive.h(14)),
        _buildOrderStatusBreakdown(metrics),
        SizedBox(height: Responsive.h(14)),
        _buildInventoryDetails(metrics),
        if (hasAlerts) ...[
          SizedBox(height: Responsive.h(14)),
          _buildAlertSection(metrics),
        ],
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
            'Revenue Overview',
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
        ),
        SizedBox(height: Responsive.h(8)),
        Row(
          children: [
            Expanded(child: _buildRevenueCard('Today', metrics.revenueToday, metrics.revenueChangeToday)),
            SizedBox(width: Responsive.w(8)),
            Expanded(child: _buildRevenueCard('Week', metrics.revenueThisWeek, metrics.revenueChangeThisWeek)),
          ],
        ),
        SizedBox(height: Responsive.h(8)),
        _buildRevenueCard('Month', metrics.revenueThisMonth, metrics.revenueChangeThisMonth),
      ],
    );
  }

  Widget _buildRevenueCard(String period, double amount, double changePercent) {
    final isPositive = changePercent >= 0;
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
            period,
            style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600], fontWeight: FontWeight.w500),
          ),
          SizedBox(height: Responsive.h(6)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              _currencyFormat.format(amount),
              style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: DashboardView._primary),
            ),
          ),
          SizedBox(height: Responsive.h(4)),
          Row(
            children: [
              Icon(
                isPositive ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                size: Responsive.icon(12),
                color: isPositive ? DashboardView._success : DashboardView._danger,
              ),
              SizedBox(width: Responsive.w(3)),
              Flexible(
                child: Text(
                  '${changePercent.abs().toStringAsFixed(1)}% vs last',
                  style: TextStyle(
                    fontSize: Responsive.sp(9),
                    fontWeight: FontWeight.w600,
                    color: isPositive ? DashboardView._success : DashboardView._danger,
                  ),
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
              _buildStatusCard('Total', metrics.newOrdersToday + metrics.pendingOrders + metrics.activeRentals, Icons.receipt_long, DashboardView._primary),
              _buildStatusCard('Pending', metrics.pendingOrders, Icons.pending_actions, Colors.orange),
              _buildStatusCard('Scheduled', metrics.todaysPickups, Icons.event_available, Colors.blue),
              _buildStatusCard('Ongoing', metrics.activeRentals, Icons.local_shipping, DashboardView._success),
              _buildStatusCard('Late', metrics.overdueReturns, Icons.warning_amber, DashboardView._danger),
              _buildStatusCard('Flagged', 0, Icons.flag, Colors.red),
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

  Widget _buildInventoryDetails(DashboardMetrics metrics) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(10)),
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
            'Branch Inventory',
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(10)),
          Row(
            children: [
              Expanded(child: _buildInventoryItem('Total', metrics.totalProducts, Icons.inventory_2_outlined, DashboardView._primary)),
              SizedBox(width: Responsive.w(8)),
              Expanded(child: _buildInventoryItem('Available', metrics.availableProducts, Icons.check_circle_outline, DashboardView._success)),
            ],
          ),
          SizedBox(height: Responsive.h(8)),
          Row(
            children: [
              Expanded(child: _buildInventoryItem('Low Stock', metrics.lowStockCount, Icons.warning_amber_outlined, DashboardView._danger)),
              SizedBox(width: Responsive.w(8)),
              Expanded(child: _buildInventoryItem('Featured', metrics.featuredProducts, Icons.star_outline, DashboardView._accent)),
            ],
          ),
          SizedBox(height: Responsive.h(10)),
          Container(
            padding: Responsive.all(10),
            decoration: BoxDecoration(
              color: DashboardView._accent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(Responsive.r(8)),
            ),
            child: Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined, color: DashboardView._accent, size: Responsive.icon(18)),
                SizedBox(width: Responsive.w(8)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Security Deposits',
                        style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[700]),
                      ),
                      SizedBox(height: Responsive.h(2)),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _currencyFormat.format(metrics.depositsHeld),
                          style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(8)),
          Container(
            padding: Responsive.all(10),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(Responsive.r(8)),
            ),
            child: Row(
              children: [
                Icon(Icons.people_outline, color: Colors.blue, size: Responsive.icon(18)),
                SizedBox(width: Responsive.w(8)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Customers',
                        style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[700]),
                      ),
                      SizedBox(height: Responsive.h(2)),
                      Text(
                        metrics.totalCustomers.toString(),
                        style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
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

  Widget _buildInventoryItem(String label, int value, IconData icon, Color color) {
    return Container(
      padding: Responsive.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Responsive.r(8)),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Responsive.icon(16), color: color),
          SizedBox(height: Responsive.h(6)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value.toString(),
              style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: color),
            ),
          ),
          SizedBox(height: Responsive.h(2)),
          Text(
            label,
            style: TextStyle(fontSize: Responsive.sp(9), color: color, fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildAlertSection(DashboardMetrics metrics) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: DashboardView._danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Responsive.r(10)),
        border: Border.all(color: DashboardView._danger.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: DashboardView._danger, size: Responsive.icon(18)),
              SizedBox(width: Responsive.w(6)),
              Flexible(
                child: Text(
                  'Action Required',
                  style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold, color: DashboardView._danger),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(8)),
          if (metrics.overdueReturns > 0) _buildAlertItem('${metrics.overdueReturns} overdue returns'),
          if (metrics.lowStockCount > 0) _buildAlertItem('${metrics.lowStockCount} low stock items'),
          if (metrics.upcomingPickupsTomorrow > 0) _buildAlertItem('${metrics.upcomingPickupsTomorrow} pickups tomorrow'),
        ],
      ),
    );
  }

  Widget _buildAlertItem(String message) {
    return Padding(
      padding: Responsive.only(bottom: 4),
      child: Row(
        children: [
          Container(
            width: Responsive.w(5),
            height: Responsive.w(5),
            decoration: const BoxDecoration(shape: BoxShape.circle, color: DashboardView._danger),
          ),
          SizedBox(width: Responsive.w(6)),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: Responsive.sp(11), color: DashboardView._danger, fontWeight: FontWeight.w600),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentProductsSection(DashboardMetrics metrics) {
    if (metrics.recentProducts.isEmpty) {
      return Container(
        padding: Responsive.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(10))),
        child: Text(
          'No recent products',
          style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[500]),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(10)),
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
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(10)),
          ...metrics.recentProducts.take(5).map(_buildProductCard),
        ],
      ),
    );
  }

  Widget _buildProductCard(DashboardProduct product) {
    return Container(
      margin: Responsive.only(bottom: 8),
      padding: Responsive.all(10),
      decoration: BoxDecoration(
        color: DashboardView._surface.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(Responsive.r(8)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(Responsive.r(6)),
            child: product.imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: product.imageUrl!,
                    width: Responsive.w(45),
                    height: Responsive.h(45),
                    fit: BoxFit.cover,
                    placeholder: (context, url) => _buildImageFallback(),
                    errorWidget: (context, url, error) => _buildImageFallback(),
                  )
                : _buildImageFallback(),
          ),
          SizedBox(width: Responsive.w(10)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: Responsive.sp(12), color: DashboardView._primary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (product.categoryName != null) ...[
                  SizedBox(height: Responsive.h(2)),
                  Text(
                    product.categoryName!,
                    style: TextStyle(color: Colors.grey[600], fontSize: Responsive.sp(10)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                SizedBox(height: Responsive.h(3)),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '${_currencyFormat.format(product.pricePerDay)}/day',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: Responsive.sp(11), color: DashboardView._accent),
                  ),
                ),
              ],
            ),
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              '${product.availableQuantity}',
              style: TextStyle(
                fontSize: Responsive.sp(10),
                color: product.availableQuantity < 10 ? DashboardView._danger : Colors.green,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageFallback() {
    return Container(
      width: Responsive.w(45),
      height: Responsive.h(45),
      color: Colors.grey[200],
      child: Icon(Icons.inventory_2_outlined, color: Colors.grey[400], size: Responsive.icon(20)),
    );
  }

  Widget _buildLoadingState() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Column(
        children: [
          _buildShimmerCard(),
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
