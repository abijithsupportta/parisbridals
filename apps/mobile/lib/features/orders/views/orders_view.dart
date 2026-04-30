import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../../branches/providers/branch_provider.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import 'order_detail_view.dart';
import 'order_form_view.dart';

/// Orders list view with tab-based daily dashboard.
/// Tabs: All | Today's Pickups | Today's Returns | Overdue
class OrdersView extends ConsumerStatefulWidget {
  const OrdersView({super.key});

  @override
  ConsumerState<OrdersView> createState() => _OrdersViewState();
}

class _OrdersViewState extends ConsumerState<OrdersView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);
  static const _bg = Color(0xFFF8F8F8);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String val) {
    setState(() => _searchQuery = val);
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);
    final branchId = ref.watch(effectiveBranchIdProvider);

    return Container(
      color: _bg,
      child: Stack(
        children: [
          Column(
            children: [
              // Search bar
              _buildSearchBar(),

              // Tab bar
              Container(
                color: Colors.white,
                child: TabBar(
                  controller: _tabController,
                  labelColor: _primary,
                  unselectedLabelColor: Colors.grey[400],
                  indicatorColor: _accent,
                  indicatorWeight: 3,
                  labelStyle: TextStyle(
                    fontSize: Responsive.sp(12),
                    fontWeight: FontWeight.w700,
                  ),
                  unselectedLabelStyle: TextStyle(
                    fontSize: Responsive.sp(12),
                    fontWeight: FontWeight.w500,
                  ),
                  tabs: const [
                    Tab(text: 'All'),
                    Tab(text: 'Pickups'),
                    Tab(text: 'Returns'),
                    Tab(text: 'Overdue'),
                  ],
                ),
              ),

              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOrderList(branchId: branchId, query: _searchQuery),
                    _buildOrderList(
                      branchId: branchId,
                      query: _searchQuery,
                      dateFilter: 'pickup_today',
                    ),
                    _buildOrderList(
                      branchId: branchId,
                      query: _searchQuery,
                      dateFilter: 'return_today',
                    ),
                    _buildOrderList(
                      branchId: branchId,
                      query: _searchQuery,
                      status: 'late_return',
                    ),
                  ],
                ),
              ),
            ],
          ),

          // FAB
          if (canManage)
            Positioned(
              right: Responsive.w(16),
              bottom: Responsive.h(16),
              child: FloatingActionButton.extended(
                heroTag: 'order_fab',
                onPressed: () {
                  Navigator.of(context)
                      .push(MaterialPageRoute(
                          builder: (_) => const OrderFormView()))
                      .then((_) => ref.invalidate(ordersProvider));
                },
                backgroundColor: _accent,
                foregroundColor: _primary,
                icon: Icon(Icons.add_rounded, size: Responsive.icon(24)),
                label: Text(
                  'New Order',
                  style: TextStyle(
                    fontSize: Responsive.sp(14),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                elevation: 3,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: Responsive.only(left: 16, right: 16, top: 12, bottom: 6),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(14)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: Responsive.r(12),
              offset: Offset(0, Responsive.h(2)),
            ),
          ],
        ),
        child: TextField(
          controller: _searchController,
          onSubmitted: _onSearchChanged,
          textInputAction: TextInputAction.search,
          style: TextStyle(fontSize: Responsive.sp(15)),
          decoration: InputDecoration(
            hintText: 'Search by customer name or order ID...',
            hintStyle:
                TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[400]),
            prefixIcon: Icon(Icons.search_rounded,
                size: Responsive.icon(24), color: _primary),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: Icon(Icons.close_rounded,
                        size: Responsive.icon(22), color: Colors.grey),
                    onPressed: () {
                      _searchController.clear();
                      _onSearchChanged('');
                    },
                  )
                : null,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding:
                Responsive.symmetric(horizontal: 18, vertical: 16),
          ),
        ),
      ),
    );
  }

  Widget _buildOrderList({
    String? branchId,
    String? query,
    String? dateFilter,
    String? status,
  }) {
    final ordersAsync = ref.watch(ordersProvider({
      'page': 1,
      'limit': 50,
      'query': query != null && query.isNotEmpty ? query : null,
      'status': status,
      'branchId': branchId,
      'dateFilter': dateFilter,
    }));

    return ordersAsync.when(
      data: (paginatedOrders) {
        final orders = paginatedOrders.orders;
        if (orders.isEmpty) {
          return _buildEmptyState(dateFilter, status);
        }
        return RefreshIndicator(
          color: _primary,
          onRefresh: () async => ref.invalidate(ordersProvider),
          child: ListView.separated(
            padding: Responsive.only(left: 16, right: 16, top: 12, bottom: 80),
            itemCount: orders.length,
            separatorBuilder: (_, __) => SizedBox(height: Responsive.h(10)),
            itemBuilder: (_, index) => _buildOrderCard(orders[index]),
          ),
        );
      },
      loading: () => _buildShimmerList(),
      error: (error, _) => _buildErrorState(error.toString()),
    );
  }

  Widget _buildOrderCard(Order order) {
    final statusColor = _getStatusColor(order.status);
    final statusLabel = _formatStatus(order.status);
    final customerName = order.customer?.name ?? 'Unknown Customer';
    final customerPhone = order.customer?.phone ?? '';
    final itemCount = order.items?.length ?? 0;
    final balanceDue = order.totalAmount - order.amountPaid;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        child: InkWell(
          borderRadius: BorderRadius.circular(Responsive.r(14)),
          onTap: () {
            Navigator.of(context)
                .push(MaterialPageRoute(
                    builder: (_) => OrderDetailView(order: order)))
                .then((_) => ref.invalidate(ordersProvider));
          },
          child: Padding(
            padding: Responsive.all(12),
            child: Column(
              children: [
                // Row 1: Customer + Status
                Row(
                  children: [
                    // Avatar
                    Container(
                      width: Responsive.w(40),
                      height: Responsive.w(40),
                      decoration: BoxDecoration(
                        color: _primary.withValues(alpha: 0.08),
                        borderRadius:
                            BorderRadius.circular(Responsive.r(10)),
                      ),
                      child: Center(
                        child: Text(
                          customerName.isNotEmpty
                              ? customerName[0].toUpperCase()
                              : 'C',
                          style: TextStyle(
                            fontSize: Responsive.sp(16),
                            fontWeight: FontWeight.w800,
                            color: _primary,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: Responsive.w(10)),
                    // Name & Phone
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            customerName,
                            style: TextStyle(
                              fontSize: Responsive.sp(14),
                              fontWeight: FontWeight.w700,
                              color: _primary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (customerPhone.isNotEmpty)
                            Text(
                              customerPhone,
                              style: TextStyle(
                                fontSize: Responsive.sp(11),
                                color: Colors.grey[500],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    // Status Badge
                    Container(
                      padding:
                          Responsive.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius:
                            BorderRadius.circular(Responsive.r(8)),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                          fontSize: Responsive.sp(10),
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                SizedBox(height: Responsive.h(10)),
                Divider(height: 1, color: Colors.grey[200]),
                SizedBox(height: Responsive.h(10)),

                // Row 2: Dates, Items, Amount
                Row(
                  children: [
                    // Dates
                    Expanded(
                      child: Row(
                        children: [
                          Icon(Icons.calendar_today_rounded,
                              size: Responsive.icon(14),
                              color: Colors.grey[400]),
                          SizedBox(width: Responsive.w(4)),
                          Expanded(
                            child: Text(
                              '${_formatDate(order.startDate)} — ${_formatDate(order.endDate)}',
                              style: TextStyle(
                                fontSize: Responsive.sp(11),
                                color: Colors.grey[600],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: Responsive.w(8)),
                    // Items count
                    Container(
                      padding:
                          Responsive.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius:
                            BorderRadius.circular(Responsive.r(6)),
                      ),
                      child: Text(
                        '$itemCount item${itemCount != 1 ? 's' : ''}',
                        style: TextStyle(
                          fontSize: Responsive.sp(10),
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[600],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    SizedBox(width: Responsive.w(8)),
                    // Amount
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${order.totalAmount.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: Responsive.sp(14),
                            fontWeight: FontWeight.w800,
                            color: _primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (balanceDue > 0)
                          Text(
                            'Due: ₹${balanceDue.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontSize: Responsive.sp(10),
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFFFF6B8A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String? dateFilter, String? status) {
    String title;
    String subtitle;
    IconData icon;

    if (dateFilter == 'pickup_today') {
      title = 'No Pickups Today';
      subtitle = 'No orders are scheduled for pickup today.';
      icon = Icons.inventory_2_outlined;
    } else if (dateFilter == 'return_today') {
      title = 'No Returns Today';
      subtitle = 'No orders are due for return today.';
      icon = Icons.assignment_return_outlined;
    } else if (status == 'late_return') {
      title = 'No Overdue Orders';
      subtitle = 'All orders have been returned on time!';
      icon = Icons.check_circle_outline_rounded;
    } else {
      title = 'No Orders Found';
      subtitle = _searchQuery.isNotEmpty
          ? 'No orders matched your search.'
          : 'Create your first order to get started.';
      icon = Icons.receipt_long_outlined;
    }

    return Center(
      child: Padding(
        padding: Responsive.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: Responsive.all(18),
              decoration: BoxDecoration(
                color: _primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon,
                  size: Responsive.icon(36), color: _primary),
            ),
            SizedBox(height: Responsive.h(16)),
            Text(
              title,
              style: TextStyle(
                fontSize: Responsive.sp(15),
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: Responsive.h(6)),
            Text(
              subtitle,
              style: TextStyle(
                  fontSize: Responsive.sp(12), color: Colors.grey[500]),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: Responsive.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded,
                color: const Color(0xFFFF6B8A), size: Responsive.icon(36)),
            SizedBox(height: Responsive.h(12)),
            Text(
              'Failed to Load Orders',
              style: TextStyle(
                  fontSize: Responsive.sp(15), fontWeight: FontWeight.bold),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: Responsive.h(6)),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: Responsive.sp(12), color: Colors.grey[600]),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: Responsive.h(16)),
            ElevatedButton.icon(
              onPressed: () => ref.invalidate(ordersProvider),
              icon: Icon(Icons.refresh_rounded, size: Responsive.icon(18)),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(Responsive.r(10))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmerList() {
    return ListView.separated(
      padding: Responsive.only(left: 16, right: 16, top: 12, bottom: 70),
      itemCount: 5,
      separatorBuilder: (_, __) => SizedBox(height: Responsive.h(10)),
      itemBuilder: (_, __) => _buildShimmerCard(),
    );
  }

  Widget _buildShimmerCard() {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: Responsive.w(40),
                  height: Responsive.w(40),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(10)),
                  ),
                ),
                SizedBox(width: Responsive.w(10)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: Responsive.h(14),
                        width: Responsive.w(120),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius:
                              BorderRadius.circular(Responsive.r(4)),
                        ),
                      ),
                      SizedBox(height: Responsive.h(6)),
                      Container(
                        height: Responsive.h(10),
                        width: Responsive.w(80),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius:
                              BorderRadius.circular(Responsive.r(4)),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  height: Responsive.h(22),
                  width: Responsive.w(60),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(8)),
                  ),
                ),
              ],
            ),
            SizedBox(height: Responsive.h(14)),
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: Responsive.h(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(Responsive.r(4)),
                    ),
                  ),
                ),
                SizedBox(width: Responsive.w(12)),
                Container(
                  height: Responsive.h(16),
                  width: Responsive.w(60),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(6)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return const Color(0xFFF5A623);
      case OrderStatus.confirmed:
      case OrderStatus.scheduled:
        return const Color(0xFF4A90D9);
      case OrderStatus.delivered:
      case OrderStatus.inUse:
      case OrderStatus.ongoing:
        return const Color(0xFF7B68EE);
      case OrderStatus.returned:
      case OrderStatus.completed:
        return const Color(0xFF2ECC71);
      case OrderStatus.cancelled:
        return const Color(0xFF95A5A6);
      case OrderStatus.flagged:
      case OrderStatus.lateReturn:
        return const Color(0xFFFF6B8A);
      case OrderStatus.partial:
        return const Color(0xFFF5A623);
    }
  }

  String _formatStatus(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.scheduled:
        return 'Scheduled';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.inUse:
        return 'In Use';
      case OrderStatus.ongoing:
        return 'Ongoing';
      case OrderStatus.partial:
        return 'Partial';
      case OrderStatus.returned:
        return 'Returned';
      case OrderStatus.completed:
        return 'Completed';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.flagged:
        return 'Flagged';
      case OrderStatus.lateReturn:
        return 'Overdue';
    }
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('d MMM').format(date);
    } catch (e) {
      return dateStr;
    }
  }
}
