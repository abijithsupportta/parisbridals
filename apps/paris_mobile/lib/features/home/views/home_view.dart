import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../core/components/index.dart';
import '../../../core/responsive.dart';
import '../../../core/theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';

class HomeView extends ConsumerWidget {
  const HomeView({super.key});

  String _formatCurrency(double amount) {
    final formatter = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
    );
    formatter.maximumFractionDigits = 0;
    return formatter.format(amount);
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM dd').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authUser = ref.watch(authUserProvider);
    final dashboardAsync = ref.watch(dashboardMetricsProvider);

    return Scaffold(
      backgroundColor: AppColors.lightGrey,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.sp(16)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Dashboard',
                        style: AppTextStyles.headline4(context).copyWith(
                          color: AppColors.secondary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(height: context.hs(4)),
                      Text(
                        'Welcome, ${authUser?.email?.split('@')[0] ?? 'User'}',
                        style: AppTextStyles.bodySmall(context).copyWith(
                          color: AppColors.grey,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.logout, color: AppColors.secondary),
                    onPressed: () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: Text(
                            'Logout',
                            style: AppTextStyles.headline6(context).copyWith(
                              color: AppColors.secondary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          content: Text(
                            'Are you sure you want to logout?',
                            style: AppTextStyles.bodyMedium(context),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context, false),
                              child: Text(
                                'Cancel',
                                style: AppTextStyles.bodyMedium(context).copyWith(
                                  color: AppColors.grey,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: Text(
                                'Logout',
                                style: AppTextStyles.bodyMedium(context).copyWith(
                                  color: AppColors.error,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );

                      if (confirmed == true) {
                        await ref.read(authProvider.notifier).signOut();
                        if (context.mounted) {
                          context.go('/login');
                        }
                      }
                    },
                  ),
                ],
              ),
              SizedBox(height: context.hs(24)),

              // Dashboard Content
              dashboardAsync.when(
                data: (metrics) => _DashboardContent(
                  metrics: metrics,
                  formatCurrency: _formatCurrency,
                  formatTimeAgo: _formatTimeAgo,
                ),
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (error, stack) => Center(
                  child: Text('Error loading dashboard: $error'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  final dynamic metrics;
  final String Function(double) formatCurrency;
  final String Function(DateTime) formatTimeAgo;

  const _DashboardContent({
    required this.metrics,
    required this.formatCurrency,
    required this.formatTimeAgo,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Revenue Card (Full Width) - Highlighted with larger size
        HomeStatCard(
          title: 'Total Revenue',
          value: formatCurrency(metrics.totalRevenue),
          subtitle: 'All time earnings',
          icon: Icons.account_balance_wallet_outlined,
          iconColor: AppColors.secondary,
          backgroundColor: AppColors.primary.withOpacity(0.15),
          isLarge: true,
        ),
        SizedBox(height: context.hs(20)),

        // Section Header
        Text(
          'Business Overview',
          style: AppTextStyles.headline6(context).copyWith(
            color: AppColors.secondary,
            fontWeight: FontWeight.w700,
          ),
        ),
        SizedBox(height: context.hs(16)),

        // Stats Grid (2 columns) - Better alignment
        Row(
          children: [
            Expanded(
              child: HomeStatCard(
                title: 'Total Orders',
                value: metrics.totalOrders.toString(),
                subtitle: 'All time',
                icon: Icons.receipt_long,
                iconColor: AppColors.secondary,
              ),
            ),
            SizedBox(width: context.ws(16)),
            Expanded(
              child: HomeStatCard(
                title: 'Scheduled',
                value: metrics.scheduledOrders.toString(),
                subtitle: 'Upcoming pickups',
                icon: Icons.event,
                iconColor: Colors.blue,
                backgroundColor: Colors.blue.withOpacity(0.1),
              ),
            ),
          ],
        ),
        SizedBox(height: context.hs(16)),

        Row(
          children: [
            Expanded(
              child: HomeStatCard(
                title: 'In Rental',
                value: metrics.inRental.toString(),
                subtitle: 'Currently rented',
                icon: Icons.local_shipping_outlined,
                iconColor: Colors.orange,
                backgroundColor: Colors.orange.withOpacity(0.1),
              ),
            ),
            SizedBox(width: context.ws(16)),
            Expanded(
              child: HomeStatCard(
                title: 'In Stock',
                value: metrics.inStock.toString(),
                subtitle: 'Available stock',
                icon: Icons.inventory_2,
                iconColor: Colors.green,
                backgroundColor: Colors.green.withOpacity(0.1),
              ),
            ),
          ],
        ),
        SizedBox(height: context.hs(16)),

        Row(
          children: [
            Expanded(
              child: HomeStatCard(
                title: 'Customers',
                value: metrics.totalCustomers.toString(),
                subtitle: 'Registered users',
                icon: Icons.people_alt,
                iconColor: AppColors.secondary,
              ),
            ),
            SizedBox(width: context.ws(16)),
            Expanded(
              child: HomeStatCard(
                title: 'Late Orders',
                value: metrics.pendingLate.toString(),
                subtitle: 'Needs attention',
                icon: Icons.warning_amber_rounded,
                iconColor: Colors.red,
                backgroundColor: Colors.red.withOpacity(0.1),
              ),
            ),
          ],
        ),
        SizedBox(height: context.hs(28)),

        // Quick Actions Section
        Text(
          'Quick Actions',
          style: AppTextStyles.headline6(context).copyWith(
            color: AppColors.secondary,
            fontWeight: FontWeight.w700,
          ),
        ),
        SizedBox(height: context.hs(16)),
        Row(
          children: [
            Expanded(
              child: HomeQuickAction(
                icon: Icons.add_circle_outline,
                label: 'New Order',
                iconColor: AppColors.secondary,
                backgroundColor: AppColors.primary.withOpacity(0.12),
                onTap: () {
                  // Navigate to new order
                },
              ),
            ),
            SizedBox(width: context.ws(16)),
            Expanded(
              child: HomeQuickAction(
                icon: Icons.person_add_outlined,
                label: 'Add Customer',
                iconColor: AppColors.secondary,
                backgroundColor: AppColors.primary.withOpacity(0.12),
                onTap: () {
                  // Navigate to add customer
                },
              ),
            ),
          ],
        ),
        SizedBox(height: context.hs(28)),

        // Recent Orders Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Orders',
              style: AppTextStyles.headline6(context).copyWith(
                color: AppColors.secondary,
                fontWeight: FontWeight.w700,
              ),
            ),
            GestureDetector(
              onTap: () {
                // Navigate to all orders
              },
              child: Text(
                'View All',
                style: AppTextStyles.bodySmall(context).copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: context.hs(16)),
        
        if (metrics.recentOrders.isEmpty)
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(context.sp(32)),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(context.sr(16)),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.inbox_outlined,
                  size: context.sicon(48),
                  color: AppColors.grey,
                ),
                SizedBox(height: context.hs(16)),
                Text(
                  'No recent orders',
                  style: AppTextStyles.bodyMedium(context).copyWith(
                    color: AppColors.grey,
                  ),
                ),
              ],
            ),
          )
        else
          ...metrics.recentOrders.map((order) => HomeRecentOrder(
                orderId: order.id.substring(0, 8),
                customerName: order.customerName,
                productName: order.productName,
                status: order.status,
                time: formatTimeAgo(order.createdAt),
              )),
        SizedBox(height: context.hs(24)),
      ],
    );
  }
}
