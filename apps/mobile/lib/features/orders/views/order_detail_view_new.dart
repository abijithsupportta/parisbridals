import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order.dart';
import '../models/payment.dart';
import '../providers/order_provider.dart';
import '../providers/payment_provider.dart';
import 'order_detail_helpers.dart';
import 'widgets/order_action_buttons.dart';
import 'widgets/order_customer_card.dart';
import 'widgets/order_financial_card.dart';
import 'widgets/order_hero_banner.dart';
import 'widgets/order_items_section.dart';
import 'widgets/order_logistics_bar.dart';

/// Comprehensive Order Detail View matching admin functionality.
///
/// Composes extracted widgets:
///  - [OrderHeroBanner] — customer name, status badge, due/paid indicator
///  - [OrderActionButtons] — start rental / cancel buttons
///  - [OrderLogisticsBar] — OUT / IN dates and item count
///  - [OrderItemsSection] — product list with return inspection controls
///  - [OrderCustomerCard] — customer info with tap-to-call
///  - [OrderFinancialCard] — financial breakdown, payment history, timeline
class OrderDetailViewNew extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailViewNew({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailViewNew> createState() => _OrderDetailViewNewState();
}

class _OrderDetailViewNewState extends ConsumerState<OrderDetailViewNew> {
  // Return processing state
  final Map<String, ReturnItemState> _returnItems = {};
  double _lateFee = 0;
  double _discount = 0;
  Order? _cachedOrder;

  // Processing flags
  bool _isProcessing = false;
  bool _isDepositProcessing = false;

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));

    return orderAsync.when(
      data: (order) {
        _cachedOrder = order;
        if (_returnItems.isEmpty) {
          _initializeReturnItems(order);
        }
        return _buildContent(order, canManage);
      },
      loading: () => Scaffold(
        backgroundColor: kBg,
        appBar: AppBar(
          backgroundColor: kPrimary,
          foregroundColor: Colors.white,
          title: const Text('Order Details'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        backgroundColor: kBg,
        appBar: AppBar(
          backgroundColor: kPrimary,
          foregroundColor: Colors.white,
          title: const Text('Order Details'),
        ),
        body: Center(
          child: Padding(
            padding: Responsive.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline_rounded,
                    color: const Color(0xFFFF6B8A),
                    size: Responsive.icon(36)),
                SizedBox(height: Responsive.h(12)),
                Text(
                  'Failed to Load Order',
                  style: TextStyle(
                      fontSize: Responsive.sp(15),
                      fontWeight: FontWeight.bold),
                ),
                SizedBox(height: Responsive.h(6)),
                Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: Responsive.sp(12),
                      color: Colors.grey[600]),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: Responsive.h(16)),
                ElevatedButton.icon(
                  onPressed: () =>
                      ref.invalidate(orderByIdProvider(widget.orderId)),
                  icon: Icon(Icons.refresh_rounded,
                      size: Responsive.icon(18)),
                  label: const Text('Retry'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(Responsive.r(10))),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _initializeReturnItems(Order order) {
    if (_returnItems.isNotEmpty) return;
    if (isReturnable(order) && order.items != null) {
      for (var item in order.items!) {
        _returnItems[item.id] = ReturnItemState();
      }
    }
  }

  Widget _buildContent(Order order, bool canManage) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: _buildAppBar(order),
      body: SingleChildScrollView(
        child: Column(
          children: [
            OrderHeroBanner(order: order),
            if (canManage)
              OrderActionButtons(
                order: order,
                isProcessing: _isProcessing,
                onStartRental: _startRental,
                onCancelOrder: _cancelOrder,
              ),
            OrderLogisticsBar(order: order),
            OrderItemsSection(
              order: order,
              returnItems: _returnItems,
              onReturnSubmit: _submitReturn,
              lateFee: _lateFee,
              discount: _discount,
              onLateFeeChanged: (v) => setState(() => _lateFee = v),
              onDiscountChanged: (v) => setState(() => _discount = v),
            ),
            OrderCustomerCard(order: order),
            OrderFinancialCard(
              order: order,
              orderId: widget.orderId,
              canManage: canManage,
              isDepositProcessing: _isDepositProcessing,
              onMarkDepositReturned: _refundSecurityDeposit,
            ),
            SizedBox(height: Responsive.h(80)),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(Order order) {
    return AppBar(
      backgroundColor: kPrimary,
      foregroundColor: Colors.white,
      elevation: 0,
      title: Text(
        'Order #${order.id.substring(0, 6).toUpperCase()}',
        style: TextStyle(
          fontSize: Responsive.sp(16),
          fontWeight: FontWeight.bold,
        ),
      ),
      actions: [
        IconButton(
          icon: Icon(Icons.refresh_rounded, size: Responsive.icon(24)),
          onPressed: () => ref.invalidate(orderByIdProvider(widget.orderId)),
        ),
      ],
    );
  }

  // ── Business actions (delegate to server via repository) ─────────────

  Future<void> _startRental() async {
    final order = _cachedOrder;
    if (order == null) return;
    if (order.items == null || order.items!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No items in this order'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final repo = ref.read(orderRepositoryProvider);
      final today = DateTime.now().toIso8601String().split('T')[0];
      final availResult = await repo.checkStockAvailability(
        items: order.items!
            .map(
              (item) => <String, dynamic>{
                'product_id': item.productId,
                'quantity': item.quantity,
              },
            )
            .toList(),
        startDate: today,
        endDate: order.endDate,
        branchId: order.branchId,
        excludeOrderId: order.id,
      );

      if (!mounted) return;

      final allAvailable = availResult['allAvailable'] == true;
      final items = (availResult['items'] as List?) ?? [];

      final proceed = await showDialog<bool>(
        context: context,
        builder: (_) => _buildAvailabilityDialog(allAvailable, items),
      );

      if (proceed != true || !mounted) {
        setState(() => _isProcessing = false);
        return;
      }

      // Fire the API call — don't await it for instant feel
      () async {
        try {
          await repo.startRental(order.id);
          ref.invalidate(orderByIdProvider(widget.orderId));
          ref.invalidate(ordersProvider);
        } catch (e) {
          ref.invalidate(orderByIdProvider(widget.orderId));
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Server error: $e. Refreshing...'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }();

      // Show success immediately (optimistic)
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rental started!'),
            backgroundColor: Colors.green,
          ),
        );
        // Immediately invalidate to start fetching the new state
        ref.invalidate(orderByIdProvider(widget.orderId));
        ref.invalidate(ordersProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Widget _buildAvailabilityDialog(bool allAvailable, List items) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Responsive.r(16)),
      ),
      title: Row(
        children: [
          Icon(
            allAvailable
                ? Icons.check_circle_rounded
                : Icons.warning_rounded,
            color: allAvailable
                ? const Color(0xFF2ECC71)
                : const Color(0xFFFF6B8A),
            size: Responsive.icon(24),
          ),
          SizedBox(width: Responsive.w(8)),
          Text(
            allAvailable ? 'Stock Available' : 'Stock Issue',
            style: TextStyle(
              fontSize: Responsive.sp(16),
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...items.map((item) {
            final isOk = item['isAvailable'] == true;
            return Padding(
              padding: Responsive.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    isOk ? Icons.check_circle : Icons.cancel,
                    size: Responsive.icon(18),
                    color: isOk
                        ? const Color(0xFF2ECC71)
                        : const Color(0xFFFF6B8A),
                  ),
                  SizedBox(width: Responsive.w(8)),
                  Expanded(
                    child: Text(
                      '${item['product_name'] ?? 'Product'}: ${item['requested']} requested, ${item['available']} available',
                      style: TextStyle(fontSize: Responsive.sp(13)),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            );
          }),
          if (!allAvailable) ...[
            SizedBox(height: Responsive.h(8)),
            Text(
              'Some items are not available. Starting the rental may cause conflicts.',
              style: TextStyle(
                fontSize: Responsive.sp(12),
                color: Colors.red[700],
              ),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, true),
          style: ElevatedButton.styleFrom(
            backgroundColor: allAvailable
                ? const Color(0xFF2ECC71)
                : const Color(0xFFF5A623),
          ),
          child: Text(
            allAvailable ? 'Start Rental' : 'Start Anyway',
            style: const TextStyle(color: Colors.white),
          ),
        ),
      ],
    );
  }

  Future<void> _cancelOrder() async {
    final order = _cachedOrder;
    if (order == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text(
          'Are you sure you want to cancel this order? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text(
              'Cancel Order',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isProcessing = true);
    try {
      final repo = ref.read(orderRepositoryProvider);
      await repo.cancelOrder(order.id);
      if (mounted) {
        ref.invalidate(orderByIdProvider(widget.orderId));
        ref.invalidate(ordersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order cancelled'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _refundSecurityDeposit() async {
    final order = _cachedOrder;
    if (order == null || _isDepositProcessing) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Responsive.r(16)),
        ),
        title: Row(
          children: [
            Icon(Icons.account_balance_wallet_rounded,
                color: Colors.orange[700], size: Responsive.icon(24)),
            SizedBox(width: Responsive.w(8)),
            const Text('Refund Security Deposit'),
          ],
        ),
        content: Text(
          'Refund ${formatCurrency(order.securityDeposit)} security deposit to the customer?\n\nThis will be recorded in the payment history.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[700]),
            child: const Text(
              'Refund Deposit',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isDepositProcessing = true);
    try {
      // Create refund payment record (matching admin behavior)
      final paymentRepo = ref.read(paymentRepositoryProvider);
      await paymentRepo.createPayment(CreatePaymentDTO(
        orderId: order.id,
        paymentType: PaymentType.refund,
        amount: order.securityDeposit,
        paymentMode: PaymentMode.cash,
        notes: 'Security Deposit Refund',
      ));

      // Also mark deposit as returned on the order (fire-and-forget)
      final repo = ref.read(orderRepositoryProvider);
      () async { try { await repo.markDepositReturned(order.id); } catch (_) {} }();

      if (mounted) {
        ref.invalidate(orderByIdProvider(widget.orderId));
        ref.invalidate(orderPaymentsProvider(widget.orderId));
        ref.invalidate(ordersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Security deposit of ${formatCurrency(order.securityDeposit)} refunded'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isDepositProcessing = false);
    }
  }

  Future<void> _submitReturn() async {
    // Prevent double-taps
    if (_isProcessing) return;

    // Validate all items have been inspected
    final uninspected = _returnItems.entries
        .where((e) => e.value.status == null)
        .toList();
    if (uninspected.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please inspect all items before completing return'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    // Build items payload matching ReturnOrderDTO from the admin API
    final orderItems = _cachedOrder!.items!;
    final returnItemsList = _returnItems.entries.map((e) {
      final orderItem = orderItems.firstWhere((oi) => oi.id == e.key);
      return {
        'item_id': e.key,
        'returned_quantity': orderItem.quantity,
        'condition_rating': e.value.status == 'excellent'
            ? 'excellent'
            : (e.value.status == 'damaged' ? 'damaged' : 'good'),
        if (e.value.notes.isNotEmpty) 'damage_description': e.value.notes,
        if (e.value.damageFee > 0) 'damage_charges': e.value.damageFee,
      };
    }).toList();

    try {
      final repo = ref.read(orderRepositoryProvider);

      // Fire-and-forget for instant feel
      final returnData = {
        'order_id': _cachedOrder!.id,
        'items': returnItemsList,
        if (_lateFee > 0) 'late_fee': _lateFee,
        if (_discount > 0) 'discount': _discount,
      };
      () async {
        try {
          await repo.processReturn(_cachedOrder!.id, returnData);
          ref.invalidate(orderByIdProvider(widget.orderId));
          ref.invalidate(ordersProvider);
        } catch (e) {
          ref.invalidate(orderByIdProvider(widget.orderId));
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Server error: $e. Refreshing...'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }();

      // Show success immediately
      if (mounted) {
        ref.invalidate(orderByIdProvider(widget.orderId));
        ref.invalidate(ordersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Return processed successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }
}
