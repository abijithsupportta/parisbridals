import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../../core/constants.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import '../providers/order_counts_provider.dart';
import 'order_detail_view_new.dart';
import 'create_order/create_order_view.dart';

/// Orders list with horizontal filter chips matching DB statuses.
class OrdersView extends ConsumerStatefulWidget {
  const OrdersView({super.key});

  @override
  ConsumerState<OrdersView> createState() => _OrdersViewState();
}

class _OrdersViewState extends ConsumerState<OrdersView> {
  final _searchController = TextEditingController();
  String? _selectedChip; // null = All

  static const _primary = AppColors.primary;
  static const _accent = AppColors.accent;
  static const _bg = AppColors.background;

  static const _statusFilters = <String, String?>{
    'All': null,
    'Ongoing': 'ongoing',
    'Scheduled': 'scheduled',
    'Late': 'late_return',
    'Partial': 'partial',
    'Returned': 'returned',
    'Flagged': 'flagged',
  };

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);
    final ordersAsync = ref.watch(ordersProvider);

    return Container(
      color: _bg,
      child: Stack(
        children: [
          Column(
            children: [
              _buildSearchBar(),
              _buildFilterChips(),
              Expanded(
                child: ordersAsync.when(
                  data: (paginated) {
                    if (paginated.orders.isEmpty) return _buildEmptyState();
                    return RefreshIndicator(
                      color: _primary,
                      onRefresh: () async => ref.invalidate(ordersProvider),
                      child: ListView.separated(
                        padding: Responsive.only(
                          left: 16,
                          right: 16,
                          top: 8,
                          bottom: 80,
                        ),
                        itemCount:
                            paginated.orders.length +
                            (paginated.hasNext ? 1 : 0),
                        separatorBuilder: (context, index) =>
                            SizedBox(height: Responsive.h(10)),
                        itemBuilder: (context, index) {
                          if (index == paginated.orders.length) {
                            // Load more button
                            return Padding(
                              padding: Responsive.symmetric(vertical: 12),
                              child: Center(
                                child: ElevatedButton.icon(
                                  onPressed: () => ref
                                      .read(ordersProvider.notifier)
                                      .loadMore(),
                                  icon: Icon(
                                    Icons.refresh_rounded,
                                    size: Responsive.icon(18),
                                  ),
                                  label: Text(
                                    'Load More',
                                    style: TextStyle(
                                      fontSize: Responsive.sp(13),
                                    ),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _primary,
                                    foregroundColor: Colors.white,
                                    padding: Responsive.symmetric(
                                      horizontal: 24,
                                      vertical: 12,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }
                          return _buildOrderCard(paginated.orders[index]);
                        },
                      ),
                    );
                  },
                  loading: () => _buildShimmerList(),
                  error: (e, _) => _buildErrorState(e.toString()),
                ),
              ),
            ],
          ),
          if (canManage)
            Positioned(
              right: Responsive.w(16),
              bottom: Responsive.h(16),
              child: FloatingActionButton.extended(
                heroTag: 'order_fab',
                onPressed: () => Navigator.of(context)
                    .push(
                      MaterialPageRoute(
                        builder: (_) => const CreateOrderView(),
                      ),
                    )
                    .then((_) => ref.invalidate(ordersProvider)),
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
          onSubmitted: (val) {
            ref.read(ordersProvider.notifier).search(val);
          },
          textInputAction: TextInputAction.search,
          style: TextStyle(fontSize: Responsive.sp(15)),
          decoration: InputDecoration(
            hintText: 'Search by customer name...',
            hintStyle: TextStyle(
              fontSize: Responsive.sp(14),
              color: Colors.grey[400],
            ),
            prefixIcon: Icon(
              Icons.search_rounded,
              size: Responsive.icon(24),
              color: _primary,
            ),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      size: Responsive.icon(22),
                      color: Colors.grey,
                    ),
                    onPressed: () {
                      _searchController.clear();
                      ref.read(ordersProvider.notifier).search('');
                    },
                  )
                : null,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: Responsive.symmetric(horizontal: 18, vertical: 16),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    final countsAsync = ref.watch(orderCountsProvider);

    return countsAsync.when(
      data: (counts) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: Responsive.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          children: _statusFilters.entries.map((entry) {
            final isActive = entry.value == _selectedChip;
            // Use accurate server-side counts from mobile-only provider
            final count = counts[entry.key.toLowerCase()] ?? 0;
            return Padding(
              padding: Responsive.only(right: 8),
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedChip = entry.value);
                  ref.read(ordersProvider.notifier).filterByStatus(entry.value);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: Responsive.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? _primary : Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(20)),
                    border: Border.all(
                      color: isActive ? _primary : Colors.grey.shade300,
                    ),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: _primary.withValues(alpha: 0.15),
                              blurRadius: Responsive.r(8),
                              offset: Offset(0, Responsive.h(2)),
                            ),
                          ]
                        : [],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        entry.key,
                        style: TextStyle(
                          fontSize: Responsive.sp(12),
                          fontWeight: FontWeight.w600,
                          color: isActive ? Colors.white : _primary,
                        ),
                      ),
                      SizedBox(width: Responsive.w(4)),
                      Container(
                        padding: Responsive.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: isActive
                              ? Colors.white.withValues(alpha: 0.25)
                              : _primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(Responsive.r(10)),
                        ),
                        child: Text(
                          '$count',
                          style: TextStyle(
                            fontSize: Responsive.sp(10),
                            fontWeight: FontWeight.w700,
                            color: isActive ? Colors.white : _primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
      loading: () => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: Responsive.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          children: _statusFilters.entries.map((entry) {
            final isActive = entry.value == _selectedChip;
            return Padding(
              padding: Responsive.only(right: 8),
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedChip = entry.value);
                  ref.read(ordersProvider.notifier).filterByStatus(entry.value);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: Responsive.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? _primary : Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(20)),
                    border: Border.all(
                      color: isActive ? _primary : Colors.grey.shade300,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        entry.key,
                        style: TextStyle(
                          fontSize: Responsive.sp(12),
                          fontWeight: FontWeight.w600,
                          color: isActive ? Colors.white : _primary,
                        ),
                      ),
                      SizedBox(width: Responsive.w(4)),
                      SizedBox(
                        width: Responsive.w(16),
                        height: Responsive.h(16),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: isActive ? Colors.white : _primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
      error: (_, __) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: Responsive.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          children: _statusFilters.entries.map((entry) {
            final isActive = entry.value == _selectedChip;
            return Padding(
              padding: Responsive.only(right: 8),
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedChip = entry.value);
                  ref.read(ordersProvider.notifier).filterByStatus(entry.value);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: Responsive.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? _primary : Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(20)),
                    border: Border.all(
                      color: isActive ? _primary : Colors.grey.shade300,
                    ),
                  ),
                  child: Text(
                    entry.key,
                    style: TextStyle(
                      fontSize: Responsive.sp(12),
                      fontWeight: FontWeight.w600,
                      color: isActive ? Colors.white : _primary,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    final statusColor = _getStatusColor(order.status);
    final customerName = order.customer?.name ?? 'Unknown';
    final customerPhone = order.customer?.phone ?? '';
    final itemCount = order.items?.length ?? 0;
    final balanceDue = (order.totalAmount - order.amountPaid)
        .clamp(0, double.infinity)
        .toDouble();

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
          onTap: () => Navigator.of(context)
              .push(
                MaterialPageRoute(
                  builder: (_) => OrderDetailViewNew(orderId: order.id),
                ),
              )
              .then((_) => ref.invalidate(ordersProvider)),
          child: Padding(
            padding: Responsive.all(12),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: Responsive.w(40),
                      height: Responsive.w(40),
                      decoration: BoxDecoration(
                        color: _primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(Responsive.r(10)),
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
                    Container(
                      padding: Responsive.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(Responsive.r(8)),
                      ),
                      child: Text(
                        _formatStatus(order.status),
                        style: TextStyle(
                          fontSize: Responsive.sp(10),
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (ref.watch(canManageProvider) && [
                      OrderStatus.pending,
                      OrderStatus.confirmed,
                      OrderStatus.scheduled,
                    ].contains(order.status))
                      GestureDetector(
                        onTap: () => Navigator.of(context)
                            .push(
                              MaterialPageRoute(
                                builder: (_) => CreateOrderView(existingOrder: order),
                              ),
                            )
                            .then((_) => ref.invalidate(ordersProvider)),
                        child: Padding(
                          padding: Responsive.only(left: 6),
                          child: Icon(
                            Icons.edit_rounded,
                            size: Responsive.icon(18),
                            color: _primary.withValues(alpha: 0.5),
                          ),
                        ),
                      ),
                  ],
                ),
                SizedBox(height: Responsive.h(10)),
                Divider(height: 1, color: Colors.grey[200]),
                SizedBox(height: Responsive.h(10)),
                Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Icon(
                            Icons.calendar_today_rounded,
                            size: Responsive.icon(14),
                            color: Colors.grey[400],
                          ),
                          SizedBox(width: Responsive.w(4)),
                          Expanded(
                            child: Text(
                              '${_fmtDate(order.startDate)} — ${_fmtDate(order.endDate)}',
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
                    Container(
                      padding: Responsive.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(Responsive.r(6)),
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: Responsive.icon(48),
            color: Colors.grey[300],
          ),
          SizedBox(height: Responsive.h(12)),
          Text(
            'No Orders Found',
            style: TextStyle(
              fontSize: Responsive.sp(15),
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline_rounded,
            color: const Color(0xFFFF6B8A),
            size: Responsive.icon(36),
          ),
          SizedBox(height: Responsive.h(12)),
          Text(
            'Failed to Load',
            style: TextStyle(
              fontSize: Responsive.sp(15),
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: Responsive.h(6)),
          Padding(
            padding: Responsive.symmetric(horizontal: 32),
            child: Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: Responsive.sp(12),
                color: Colors.grey[600],
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          SizedBox(height: Responsive.h(16)),
          ElevatedButton.icon(
            onPressed: () => ref.invalidate(ordersProvider),
            icon: Icon(Icons.refresh_rounded, size: Responsive.icon(18)),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _primary,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmerList() {
    return ListView.builder(
      padding: Responsive.only(left: 16, right: 16, top: 12),
      itemCount: 5,
      itemBuilder: (context, index) => Padding(
        padding: Responsive.only(bottom: 10),
        child: Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Container(
            height: Responsive.h(100),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(14)),
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(OrderStatus s) {
    switch (s) {
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

  String _statusToString(OrderStatus s) {
    switch (s) {
      case OrderStatus.pending:
        return 'pending';
      case OrderStatus.confirmed:
        return 'confirmed';
      case OrderStatus.scheduled:
        return 'scheduled';
      case OrderStatus.delivered:
        return 'delivered';
      case OrderStatus.inUse:
        return 'in_use';
      case OrderStatus.ongoing:
        return 'ongoing';
      case OrderStatus.partial:
        return 'partial';
      case OrderStatus.returned:
        return 'returned';
      case OrderStatus.completed:
        return 'completed';
      case OrderStatus.cancelled:
        return 'cancelled';
      case OrderStatus.flagged:
        return 'flagged';
      case OrderStatus.lateReturn:
        return 'late_return';
    }
  }

  String _formatStatus(OrderStatus s) {
    switch (s) {
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

  String _fmtDate(String dateStr) {
    try {
      return DateFormat('d MMM').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }
}
