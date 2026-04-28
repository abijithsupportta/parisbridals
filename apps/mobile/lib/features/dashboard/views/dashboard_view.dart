import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/responsive.dart';
import '../providers/dashboard_provider.dart';
import '../repositories/dashboard_repository.dart';
import 'package:cached_network_image/cached_network_image.dart';

class DashboardView extends ConsumerStatefulWidget {
  const DashboardView({super.key});

  static const _primary = Color(0xFF434343); // Charcoal
  static const _accent  = Color(0xFFF7C873); // Golden
  static const _surface = Color(0xFFFAEBCD); // Almond
  static const _bg      = Color(0xFFF8F8F8); // Off-white
  static const _danger  = Color(0xFFFF6B8A); // Red for alerts

  @override
  ConsumerState<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends ConsumerState<DashboardView> {
  @override
  Widget build(BuildContext context) {
    final metricsAsync = ref.watch(dashboardMetricsProvider);

    return Container(
      color: DashboardView._bg,
      child: ListView(
        padding: Responsive.all(14),
        children: [
          _buildGreetingBanner(),
          SizedBox(height: Responsive.h(14)),
          metricsAsync.when(
            data: (metrics) => _buildDashboardContent(metrics),
            loading: () => _buildLoadingState(),
            error: (_, __) => _buildErrorState(),
          ),
        ],
      ),
    );
  }

  Widget _buildGreetingBanner() {
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
            'Welcome Back!',
            style: TextStyle(fontSize: Responsive.sp(24), fontWeight: FontWeight.bold, color: Colors.white),
          ),
          SizedBox(height: Responsive.h(4)),
          Text(
            'Here\'s your product overview',
            style: TextStyle(fontSize: Responsive.sp(14), color: Colors.white.withValues(alpha: 0.8)),
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
          _buildShimmerCard(),
          SizedBox(height: Responsive.h(14)),
          _buildShimmerGrid(),
          SizedBox(height: Responsive.h(16)),
          _buildShimmerCard(),
        ],
      ),
    );
  }

  Widget _buildShimmerCard() {
    return Container(
      height: Responsive.h(120),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
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
      childAspectRatio: 1.4,
      children: List.generate(4, (_) => _buildShimmerCard()),
    );
  }

  Widget _buildDashboardContent(DashboardMetrics metrics) {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(dashboardMetricsProvider);
      },
      color: DashboardView._accent,
      child: Column(
        children: [
          // Quick Stats Grid
          _buildQuickStatsGrid(metrics),
          SizedBox(height: Responsive.h(16)),
          // Alert Section (if any)
          if (metrics.lowStockCount > 0)
            _buildAlertSection(metrics),
          if (metrics.lowStockCount > 0)
            SizedBox(height: Responsive.h(16)),
          // Recent Products
          _buildRecentProductsSection(metrics),
          SizedBox(height: Responsive.h(20)),
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
                'Low Stock Alert',
                style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: DashboardView._danger),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(12)),
          _buildAlertItem(
            '📦 ${metrics.lowStockCount} items with low stock',
            'View Products',
            onTap: () => Navigator.pushNamed(context, '/products'),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertItem(String message, String action, {VoidCallback? onTap}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            message,
            style: TextStyle(fontSize: Responsive.sp(12), color: DashboardView._danger),
          ),
        ),
        TextButton(
          onPressed: onTap,
          child: Text(
            action,
            style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w600, color: DashboardView._danger),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentProductsSection(DashboardMetrics metrics) {
    if (metrics.recentProducts.isEmpty) {
      return Container(
        padding: Responsive.all(20),
        child: Text(
          'No products available',
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
          ...metrics.recentProducts.map((product) => _buildProductCard(product)).toList(),
        ],
      ),
    );
  }

  Widget _buildProductCard(Product product) {
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
                    placeholder: (context, url) => Container(
                      width: Responsive.w(50),
                      height: Responsive.h(50),
                      color: Colors.grey[200],
                      child: Icon(Icons.image, color: Colors.grey[400]),
                    ),
                    errorWidget: (context, url, error) => Container(
                      width: Responsive.w(50),
                      height: Responsive.h(50),
                      color: Colors.grey[200],
                      child: Icon(Icons.image, color: Colors.grey[400]),
                    ),
                  )
                : Container(
                    width: Responsive.w(50),
                    height: Responsive.h(50),
                    color: Colors.grey[200],
                    child: Icon(Icons.image, color: Colors.grey[400]),
                  ),
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
                  ),
                ],
                SizedBox(height: Responsive.h(4)),
                Text(
                  '₹${product.pricePerDay.toStringAsFixed(0)}/day',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: Responsive.sp(12), color: DashboardView._accent),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${product.availableQuantity} in stock',
                style: TextStyle(fontSize: Responsive.sp(10), color: product.availableQuantity < 10 ? DashboardView._danger : Colors.green),
              ),
              if (!product.isActive)
                Container(
                  margin: EdgeInsets.only(top: Responsive.h(4)),
                  padding: Responsive.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(Responsive.r(4)),
                  ),
                  child: Text(
                    'Inactive',
                    style: TextStyle(fontSize: Responsive.sp(9), color: Colors.grey[700]),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStatsGrid(DashboardMetrics metrics) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: Responsive.w(10),
      mainAxisSpacing: Responsive.h(10),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.4,
      children: [
        _buildStatCard(
          'Total Products',
          '${metrics.totalProducts}',
          Icons.inventory_2_outlined,
          DashboardView._primary,
        ),
        _buildStatCard(
          'Available',
          '${metrics.availableProducts}',
          Icons.check_circle_outline,
          Colors.green,
        ),
        _buildStatCard(
          'Low Stock',
          '${metrics.lowStockCount}',
          Icons.warning_amber_outlined,
          DashboardView._danger,
        ),
        _buildStatCard(
          'Featured',
          '${metrics.featuredProducts}',
          Icons.star_outline,
          DashboardView._accent,
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
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
          Icon(icon, size: Responsive.icon(24), color: color),
          SizedBox(height: Responsive.h(8)),
          Text(
            value,
            style: TextStyle(fontSize: Responsive.sp(24), fontWeight: FontWeight.bold, color: DashboardView._primary),
          ),
          SizedBox(height: Responsive.h(4)),
          Text(
            title,
            style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Container(
      padding: Responsive.all(20),
      child: Column(
        children: [
          Icon(Icons.error_outline, size: Responsive.icon(48), color: Colors.red),
          SizedBox(height: Responsive.h(16)),
          Text(
            'Unable to load dashboard',
            style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[600]),
          ),
          SizedBox(height: Responsive.h(16)),
          ElevatedButton(
            onPressed: () => ref.invalidate(dashboardMetricsProvider),
            child: Text('Retry'),
          ),
        ],
      ),
    );
  }
}
