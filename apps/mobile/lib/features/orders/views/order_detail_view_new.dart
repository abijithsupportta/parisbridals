import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/api_client.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import '../providers/payment_provider.dart';
import 'payment_recording_modal.dart';

String formatCurrency(double amount) {
  return '₹${amount.toStringAsFixed(0)}';
}

/// Comprehensive Order Detail View matching admin functionality
class OrderDetailViewNew extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailViewNew({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailViewNew> createState() => _OrderDetailViewNewState();
}

class _OrderDetailViewNewState extends ConsumerState<OrderDetailViewNew> {
  static const _primary = Color(0xFF434343);
  static const _bg = Color(0xFFF8F8F8);

  // Return processing state
  final Map<String, ReturnItemState> _returnItems = {};
  double _lateFee = 0;
  double _discount = 0;
  Order? _cachedOrder;

  // Product data cache
  final Map<String, Map<String, dynamic>> _productCache = {};

  @override
  void initState() {
    super.initState();
  }

  void _initializeReturnItems(Order order) {
    if (_returnItems.isNotEmpty) return;
    if (_isReturnable(order) && order.items != null) {
      for (var item in order.items!) {
        _returnItems[item.id] = ReturnItemState();
      }
    }
  }

  bool _isReturnable(Order order) {
    return order.status == OrderStatus.inUse ||
        order.status == OrderStatus.ongoing ||
        order.status == OrderStatus.lateReturn ||
        order.status == OrderStatus.partial;
  }

  double _amountDue(Order order) {
    return (order.totalAmount - order.amountPaid).clamp(0, double.infinity);
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));

    return orderAsync.when(
      data: (order) {
        if (_cachedOrder?.id != order.id) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _cachedOrder = order;
                _returnItems.clear();
                _initializeReturnItems(order);
              });
            }
          });
        } else {
          _cachedOrder = order;
        }
        return _buildContent(order, canManage);
      },
      loading: () => Scaffold(
        backgroundColor: _bg,
        appBar: AppBar(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          title: const Text('Order Details'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        backgroundColor: _bg,
        appBar: AppBar(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          title: const Text('Order Details'),
        ),
        body: Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildContent(Order order, bool canManage) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: _buildAppBar(order),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroBanner(order, canManage),
            if (canManage) _buildActionButtons(order),
            _buildLogisticsBar(order),
            _buildOrderItemsSection(order),
            _buildCustomerCard(order),
            _buildFinancialCard(order),
            SizedBox(height: Responsive.h(80)),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(Order order) {
    return AppBar(
      backgroundColor: _primary,
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

  String _formatDate(String dateStr) {
    try {
      return DateFormat('dd/MM/yyyy').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.confirmed:
      case OrderStatus.scheduled:
        return const Color(0xFF4A90D9);
      case OrderStatus.ongoing:
      case OrderStatus.inUse:
        return const Color(0xFF2ECC71);
      case OrderStatus.lateReturn:
        return const Color(0xFFFF6B8A);
      case OrderStatus.partial:
        return const Color(0xFFF5A623);
      case OrderStatus.returned:
      case OrderStatus.completed:
        return const Color(0xFF95A5A6);
      case OrderStatus.flagged:
        return const Color(0xFF9B59B6);
      case OrderStatus.cancelled:
        return const Color(0xFF7F8C8D);
      default:
        return _primary;
    }
  }

  String _getStatusLabel(OrderStatus status) {
    switch (status) {
      case OrderStatus.confirmed:
      case OrderStatus.scheduled:
        return 'Scheduled';
      case OrderStatus.ongoing:
      case OrderStatus.inUse:
        return 'Ongoing';
      case OrderStatus.lateReturn:
        return 'Late';
      case OrderStatus.partial:
        return 'Partial';
      case OrderStatus.returned:
      case OrderStatus.completed:
        return 'Returned';
      case OrderStatus.flagged:
        return 'Flagged';
      case OrderStatus.cancelled:
        return 'Cancelled';
      default:
        return status.name;
    }
  }

  Widget _buildHeroBanner(Order order, bool canManage) {
    final statusColor = _getStatusColor(order.status);
    final statusLabel = _getStatusLabel(order.status);

    return Container(
      margin: Responsive.all(16),
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.customer?.name ?? 'Unknown Customer',
                      style: TextStyle(
                        fontSize: Responsive.sp(18),
                        fontWeight: FontWeight.w900,
                        color: _primary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: Responsive.h(4)),
                    Text(
                      order.customer?.phone ?? '',
                      style: TextStyle(
                        fontSize: Responsive.sp(13),
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: Responsive.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(Responsive.r(8)),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusLabel.toUpperCase(),
                  style: TextStyle(
                    fontSize: Responsive.sp(11),
                    fontWeight: FontWeight.w900,
                    color: statusColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(12)),
          if (_amountDue(order) > 0)
            Container(
              padding: Responsive.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFEBEE),
                borderRadius: BorderRadius.circular(Responsive.r(10)),
                border: Border.all(color: const Color(0xFFFF6B8A)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_rounded,
                    size: Responsive.icon(16),
                    color: const Color(0xFFFF6B8A),
                  ),
                  SizedBox(width: Responsive.w(6)),
                  Text(
                    'DUE: ${formatCurrency(_amountDue(order))}',
                    style: TextStyle(
                      fontSize: Responsive.sp(14),
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFFFF6B8A),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: Responsive.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(Responsive.r(10)),
                border: Border.all(color: const Color(0xFF2ECC71)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.check_circle_rounded,
                    size: Responsive.icon(16),
                    color: const Color(0xFF2ECC71),
                  ),
                  SizedBox(width: Responsive.w(6)),
                  Text(
                    'PAID',
                    style: TextStyle(
                      fontSize: Responsive.sp(14),
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2ECC71),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(Order order) {
    final status = order.status;
    final isScheduled =
        status == OrderStatus.scheduled ||
        status == OrderStatus.confirmed ||
        status == OrderStatus.pending;
    final isCancellable =
        status == OrderStatus.pending ||
        status == OrderStatus.confirmed ||
        status == OrderStatus.scheduled;

    if (!isScheduled && !isCancellable) return const SizedBox.shrink();

    return Padding(
      padding: Responsive.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          if (isScheduled)
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isProcessing ? null : () => _startRental(),
                icon: Icon(Icons.play_arrow_rounded, size: Responsive.icon(20)),
                label: Text(
                  'Start Rental',
                  style: TextStyle(
                    fontSize: Responsive.sp(13),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2ECC71),
                  foregroundColor: Colors.white,
                  padding: Responsive.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Responsive.r(12)),
                  ),
                ),
              ),
            ),
          if (isScheduled && isCancellable) SizedBox(width: Responsive.w(16)),
          if (isCancellable)
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _isProcessing ? null : () => _cancelOrder(),
                icon: Icon(Icons.cancel_outlined, size: Responsive.icon(20)),
                label: Text(
                  'Cancel',
                  style: TextStyle(
                    fontSize: Responsive.sp(13),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red[700],
                  side: BorderSide(color: Colors.red[300]!),
                  padding: Responsive.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Responsive.r(12)),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  bool _isProcessing = false;
  bool _isDepositProcessing = false;

  Future<void> _startRental() async {
    if (_cachedOrder!.items == null || _cachedOrder!.items!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No items in this order'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    // Step 1: Check stock availability
    try {
      final repo = ref.read(orderRepositoryProvider);
      final today = DateTime.now().toIso8601String().split('T')[0];
      final availResult = await repo.checkStockAvailability(
        items: _cachedOrder!.items!
            .map(
              (item) => <String, dynamic>{
                'product_id': item.productId,
                'quantity': item.quantity,
              },
            )
            .toList(),
        startDate: today,
        endDate: _cachedOrder!.endDate,
        branchId: _cachedOrder!.branchId,
        excludeOrderId: _cachedOrder!.id,
      );

      if (!mounted) return;

      final allAvailable = availResult['allAvailable'] == true;
      final items = (availResult['items'] as List?) ?? [];

      // Step 2: Show stock check results
      final proceed = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
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
        ),
      );

      if (proceed != true || !mounted) {
        setState(() => _isProcessing = false);
        return;
      }

      // Step 3: Actually start the rental
      await repo.startRental(_cachedOrder!.id);
      if (mounted) {
        invalidateOrdersCache();
        ref.invalidate(ordersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rental started!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
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

  Future<void> _cancelOrder() async {
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
      await repo.cancelOrder(_cachedOrder!.id);
      if (mounted) {
        invalidateOrdersCache();
        ref.invalidate(ordersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order cancelled'),
            backgroundColor: Colors.orange,
          ),
        );
        Navigator.pop(context);
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

  Future<void> _markDepositReturned() async {
    final order = _cachedOrder;
    if (order == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Return Deposit'),
        content: const Text(
          'Mark security deposit as returned for this order?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text(
              'Yes, Return',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isDepositProcessing = true);
    try {
      final repo = ref.read(orderRepositoryProvider);
      await repo.markDepositReturned(order.id);
      invalidateOrdersCache();
      ref.invalidate(orderByIdProvider(widget.orderId));
      ref.invalidate(ordersProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Deposit marked as returned'),
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

  Widget _buildLogisticsBar(Order order) {
    final isLate = order.status == OrderStatus.lateReturn;

    return Padding(
      padding: Responsive.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: _buildLogisticsCard(
              'OUT',
              _formatDate(order.startDate),
              Colors.blue[50]!,
              Colors.blue[700]!,
            ),
          ),
          SizedBox(width: Responsive.w(16)),
          Expanded(
            child: _buildLogisticsCard(
              'IN',
              _formatDate(order.endDate),
              isLate ? Colors.red[50]! : Colors.green[50]!,
              isLate ? Colors.red[700]! : Colors.green[700]!,
              isLate: isLate,
            ),
          ),
          SizedBox(width: Responsive.w(16)),
          Expanded(
            child: _buildLogisticsCard(
              'ITEMS',
              '${order.items?.length ?? 0}',
              Colors.grey[100]!,
              _primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogisticsCard(
    String label,
    String value,
    Color bgColor,
    Color textColor, {
    bool isLate = false,
  }) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(
          color: isLate ? Colors.red[300]! : Colors.transparent,
        ),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w800,
              color: textColor.withValues(alpha: 0.7),
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: Responsive.h(4)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                fontSize: Responsive.sp(14),
                fontWeight: FontWeight.w900,
                color: textColor,
              ),
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItemsSection(Order order) {
    if (order.items == null || order.items!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: Responsive.only(left: 16, right: 16, top: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: Responsive.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'ORDER ITEMS',
                  style: TextStyle(
                    fontSize: Responsive.sp(12),
                    fontWeight: FontWeight.w900,
                    color: _primary,
                    letterSpacing: 1,
                  ),
                ),
                if (_isReturnable(order))
                  TextButton.icon(
                    onPressed: _markAllExcellent,
                    icon: Icon(
                      Icons.check_circle_rounded,
                      size: Responsive.icon(16),
                      color: const Color(0xFF2ECC71),
                    ),
                    label: Text(
                      'Mark All Good',
                      style: TextStyle(
                        fontSize: Responsive.sp(11),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF2ECC71),
                      padding: Responsive.symmetric(horizontal: 8, vertical: 4),
                    ),
                  ),
              ],
            ),
          ),
          Divider(height: 1, color: Colors.grey[200]),
          ...order.items!.map((item) => _buildOrderItem(order, item)),
          if (_isReturnable(order)) _buildSettlementFooter(),
        ],
      ),
    );
  }

  Widget _buildProductImage(String productId) {
    return FutureBuilder(
      future: _fetchProductImage(
        productId,
      ).timeout(const Duration(seconds: 5), onTimeout: () => null),
      builder: (context, snapshot) {
        if (snapshot.hasData &&
            snapshot.data != null &&
            snapshot.data!.isNotEmpty) {
          return Image.network(
            snapshot.data!,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
            loadingBuilder: (_, child, loadingProgress) {
              if (loadingProgress == null) return child;
              if (loadingProgress.expectedTotalBytes != null) {
                final progress =
                    loadingProgress.cumulativeBytesLoaded /
                    loadingProgress.expectedTotalBytes!;
                if (progress > 0.5) return child; // Show image once 50% loaded
              }
              return _buildLoadingIndicator();
            },
          );
        } else if (snapshot.hasError ||
            snapshot.connectionState == ConnectionState.waiting) {
          return _buildImagePlaceholder();
        } else {
          return _buildImagePlaceholder();
        }
      },
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Icon(
        Icons.diamond_outlined,
        size: Responsive.icon(24),
        color: Colors.grey[400],
      ),
    );
  }

  Widget _buildLoadingIndicator() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(Colors.grey[400]!),
        ),
      ),
    );
  }

  Future<Map<String, dynamic>?> _fetchProductData(String productId) async {
    // Check cache first
    if (_productCache.containsKey(productId)) {
      return _productCache[productId];
    }

    try {
      final response = await apiClient.get('/products/$productId');
      if (response.statusCode == 200) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          final product = data['data'];
          _productCache[productId] = product;
          return product;
        }
      }
    } catch (e) {
      // Silently fail and return null
    }
    return null;
  }

  Future<String?> _fetchProductImage(String productId) async {
    try {
      final productData = await _fetchProductData(productId);
      if (productData == null) return null;

      // Try different possible image URL fields
      String? imageUrl = productData['primary_image_url'] as String?;
      if (imageUrl == null || imageUrl.isEmpty) {
        imageUrl = productData['image_url'] as String?;
      }
      if (imageUrl == null || imageUrl.isEmpty) {
        imageUrl =
            productData['images'] != null && productData['images'].isNotEmpty
            ? productData['images'][0]['url'] as String?
            : null;
      }

      // Validate URL format
      if (imageUrl != null && imageUrl.isNotEmpty) {
        // If it's a relative path, make it absolute
        if (!imageUrl.startsWith('http')) {
          imageUrl =
              'https://via.placeholder.com/60x60/434343/FFFFFF?text=Jewel';
        }
        return imageUrl;
      }
    } catch (e) {
      // Silently handle errors
    }
    return null;
  }

  Future<String?> _fetchProductName(String productId) async {
    final productData = await _fetchProductData(productId);
    return productData?['name'] as String?;
  }

  Widget _buildOrderItem(Order order, OrderItem item) {
    final returnState = _returnItems[item.id];
    final isExcellent = returnState?.status == 'excellent';
    final isDamaged = returnState?.status == 'damaged';

    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: isExcellent
            ? const Color(0xFFE8F5E9)
            : isDamaged
            ? const Color(0xFFFFF3E0)
            : Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: Responsive.w(60),
                height: Responsive.w(60),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(Responsive.r(10)),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(Responsive.r(10)),
                  child: _buildProductImage(item.productId),
                ),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FutureBuilder<String?>(
                      future: item.productName != null
                          ? Future.value(item.productName)
                          : _fetchProductName(item.productId),
                      builder: (context, snapshot) {
                        final displayName =
                            snapshot.data ??
                            item.productName ??
                            'Product #${item.productId.substring(0, 8)}';
                        return Text(
                          displayName,
                          style: TextStyle(
                            fontSize: Responsive.sp(14),
                            fontWeight: FontWeight.w700,
                            color: _primary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        );
                      },
                    ),
                    SizedBox(height: Responsive.h(4)),
                    Text(
                      'Qty: ${item.quantity} • Rent: ${formatCurrency(item.pricePerDay)}',
                      style: TextStyle(
                        fontSize: Responsive.sp(12),
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (_isReturnable(order)) ...[
            SizedBox(height: Responsive.h(12)),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _updateItemStatus(item.id, 'excellent'),
                    icon: Icon(
                      Icons.check_circle_rounded,
                      size: Responsive.icon(18),
                    ),
                    label: Text(
                      'Good',
                      style: TextStyle(
                        fontSize: Responsive.sp(12),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isExcellent
                          ? const Color(0xFF2ECC71)
                          : Colors.white,
                      foregroundColor: isExcellent
                          ? Colors.white
                          : const Color(0xFF2ECC71),
                      side: BorderSide(color: const Color(0xFF2ECC71)),
                      padding: Responsive.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Responsive.r(10)),
                      ),
                    ),
                  ),
                ),
                SizedBox(width: Responsive.w(8)),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _updateItemStatus(item.id, 'damaged'),
                    icon: Icon(
                      Icons.warning_rounded,
                      size: Responsive.icon(18),
                    ),
                    label: Text(
                      'Damaged',
                      style: TextStyle(
                        fontSize: Responsive.sp(12),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDamaged
                          ? const Color(0xFFF5A623)
                          : Colors.white,
                      foregroundColor: isDamaged
                          ? Colors.white
                          : const Color(0xFFF5A623),
                      side: BorderSide(color: const Color(0xFFF5A623)),
                      padding: Responsive.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Responsive.r(10)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (isDamaged) ...[
              SizedBox(height: Responsive.h(12)),
              Container(
                padding: Responsive.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(Responsive.r(10)),
                  border: Border.all(color: const Color(0xFFF5A623)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DAMAGE NOTES',
                      style: TextStyle(
                        fontSize: Responsive.sp(10),
                        fontWeight: FontWeight.w800,
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: Responsive.h(6)),
                    TextField(
                      onChanged: (val) =>
                          setState(() => returnState?.notes = val),
                      decoration: InputDecoration(
                        hintText: 'Describe damage...',
                        hintStyle: TextStyle(fontSize: Responsive.sp(12)),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Responsive.r(8)),
                        ),
                        contentPadding: Responsive.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      style: TextStyle(fontSize: Responsive.sp(13)),
                      maxLines: 2,
                    ),
                    SizedBox(height: Responsive.h(8)),
                    Text(
                      'DAMAGE FEE (₹)',
                      style: TextStyle(
                        fontSize: Responsive.sp(10),
                        fontWeight: FontWeight.w800,
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: Responsive.h(6)),
                    TextField(
                      onChanged: (val) => setState(
                        () =>
                            returnState?.damageFee = double.tryParse(val) ?? 0,
                      ),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
                        hintStyle: TextStyle(fontSize: Responsive.sp(14)),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Responsive.r(8)),
                        ),
                        contentPadding: Responsive.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      style: TextStyle(
                        fontSize: Responsive.sp(16),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildSettlementFooter() {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'LATE FEE',
                      style: TextStyle(
                        fontSize: Responsive.sp(10),
                        fontWeight: FontWeight.w800,
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: Responsive.h(6)),
                    TextField(
                      onChanged: (val) =>
                          setState(() => _lateFee = double.tryParse(val) ?? 0),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Responsive.r(8)),
                        ),
                        contentPadding: Responsive.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      style: TextStyle(
                        fontSize: Responsive.sp(14),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DISCOUNT',
                      style: TextStyle(
                        fontSize: Responsive.sp(10),
                        fontWeight: FontWeight.w800,
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(height: Responsive.h(6)),
                    TextField(
                      onChanged: (val) =>
                          setState(() => _discount = double.tryParse(val) ?? 0),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(Responsive.r(8)),
                        ),
                        contentPadding: Responsive.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      style: TextStyle(
                        fontSize: Responsive.sp(14),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(16)),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitReturn,
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                padding: Responsive.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                ),
              ),
              child: Text(
                'Complete Return Process',
                style: TextStyle(
                  fontSize: Responsive.sp(14),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _markAllExcellent() {
    setState(() {
      for (var key in _returnItems.keys) {
        _returnItems[key]?.status = 'excellent';
        _returnItems[key]?.damageFee = 0;
        _returnItems[key]?.notes = '';
      }
    });
  }

  void _updateItemStatus(String itemId, String status) {
    setState(() {
      _returnItems[itemId]?.status = status;
      if (status == 'excellent') {
        _returnItems[itemId]?.damageFee = 0;
        _returnItems[itemId]?.notes = '';
      }
    });
  }

  Future<void> _submitReturn() async {
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

    // Build items payload matching ReturnOrderDTO from the admin API
    final orderItems = _cachedOrder!.items!;
    final returnItemsList = _returnItems.entries.map((e) {
      // Find the corresponding OrderItem to get the quantity
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
      await repo.processReturn(_cachedOrder!.id, {
        'order_id': _cachedOrder!.id,
        'items': returnItemsList,
        if (_lateFee > 0) 'late_fee': _lateFee,
        if (_discount > 0) 'discount': _discount,
      });
      if (mounted) {
        invalidateOrdersCache();
        ref.invalidate(ordersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Return processed successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Widget _buildCustomerCard(Order order) {
    return Container(
      margin: Responsive.only(left: 16, right: 16, top: 16),
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CUSTOMER',
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w900,
              color: Colors.grey[600],
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: Responsive.h(12)),
          Text(
            order.customer?.name ?? 'Unknown',
            style: TextStyle(
              fontSize: Responsive.sp(20),
              fontWeight: FontWeight.w900,
              color: _primary,
            ),
          ),
          SizedBox(height: Responsive.h(12)),
          InkWell(
            onTap: () async {
              final phone = order.customer?.phone;
              if (phone != null && phone.isNotEmpty) {
                final uri = Uri(scheme: 'tel', path: phone);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri);
                }
              }
            },
            child: Container(
              padding: Responsive.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(Responsive.r(12)),
                border: Border.all(color: const Color(0xFF2ECC71)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.phone_rounded,
                    size: Responsive.icon(20),
                    color: const Color(0xFF2ECC71),
                  ),
                  SizedBox(width: Responsive.w(8)),
                  Text(
                    order.customer?.phone ?? 'N/A',
                    style: TextStyle(
                      fontSize: Responsive.sp(16),
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2ECC71),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialCard(Order order) {
    final canManage = ref.watch(canManageProvider);
    return Container(
      margin: Responsive.only(left: 16, right: 16, top: 16),
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'FINANCIAL RECEIPT',
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w900,
              color: Colors.grey[600],
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: Responsive.h(16)),
          _buildFinancialRow('Subtotal', formatCurrency(order.subtotal)),
          if (order.gstAmount > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow('GST', formatCurrency(order.gstAmount)),
          ],
          SizedBox(height: Responsive.h(8)),
          _buildFinancialRow(
            'Security Deposit',
            formatCurrency(order.securityDeposit),
          ),
          if (order.lateFee > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow(
              'Late Fee',
              '+ ${formatCurrency(order.lateFee)}',
              color: Colors.red[700],
            ),
          ],
          if (order.damageChargesTotal > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow(
              'Damage Charges',
              '+ ${formatCurrency(order.damageChargesTotal)}',
              color: Colors.orange[700],
            ),
          ],
          if (order.discount > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow(
              'Discount',
              '- ${formatCurrency(order.discount)}',
              color: Colors.green[700],
            ),
          ],
          Divider(height: Responsive.h(24), thickness: 2),
          _buildFinancialRow(
            'Grand Total',
            formatCurrency(order.totalAmount),
            isBold: true,
          ),
          SizedBox(height: Responsive.h(8)),
          _buildFinancialRow('Total Paid', formatCurrency(order.amountPaid)),
          Divider(height: Responsive.h(24), thickness: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Remaining Due',
                style: TextStyle(
                  fontSize: Responsive.sp(16),
                  fontWeight: FontWeight.w900,
                  color: _primary,
                ),
              ),
              Text(
                formatCurrency(_amountDue(order)),
                style: TextStyle(
                  fontSize: Responsive.sp(20),
                  fontWeight: FontWeight.w900,
                  color: _amountDue(order) > 0
                      ? Colors.red[700]
                      : Colors.green[700],
                ),
              ),
            ],
          ),
          if (order.securityDeposit > 0) ...[
            SizedBox(height: Responsive.h(14)),
            _buildDepositStatusCard(order, canManage),
          ],
          if (_amountDue(order) > 0) ...[
            SizedBox(height: Responsive.h(16)),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => PaymentRecordingModal(
                      orderId: widget.orderId,
                      amountDue: _amountDue(order),
                      onSuccess: () {
                        // Force refresh of order data
                        invalidateOrdersCache();
                        ref.invalidate(orderByIdProvider(widget.orderId));
                        ref.invalidate(ordersProvider);

                        // Also refresh payments data
                        ref.invalidate(orderPaymentsProvider(widget.orderId));

                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Payment recorded successfully!'),
                              backgroundColor: Colors.green,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                      },
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Responsive.r(12)),
                  ),
                ),
                child: Text(
                  'Record Payment',
                  style: TextStyle(
                    fontSize: Responsive.sp(14),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
          SizedBox(height: Responsive.h(16)),
          _buildPaymentHistory(widget.orderId),
          SizedBox(height: Responsive.h(12)),
          _buildOrderHistoryTimeline(widget.orderId),
        ],
      ),
    );
  }

  Widget _buildFinancialRow(
    String label,
    String value, {
    bool isBold = false,
    Color? color,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: Responsive.sp(isBold ? 14 : 13),
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
            color: color ?? Colors.grey[700],
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: Responsive.sp(isBold ? 14 : 13),
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
            color: color ?? _primary,
          ),
        ),
      ],
    );
  }

  Widget _buildDepositStatusCard(Order order, bool canManage) {
    final isReturned = order.depositReturned;
    final isEligibleStatus =
        order.status == OrderStatus.returned ||
        order.status == OrderStatus.completed ||
        order.status == OrderStatus.lateReturn;

    final statusText = isReturned
        ? 'Returned'
        : (order.depositCollected == true ? 'Collected' : 'Not collected');

    final statusColor = isReturned
        ? Colors.green
        : (order.depositCollected == true ? Colors.orange : Colors.grey);

    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Responsive.r(10)),
        border: Border.all(color: statusColor.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isReturned
                    ? Icons.check_circle_rounded
                    : Icons.account_balance_wallet_rounded,
                size: Responsive.icon(18),
                color: statusColor,
              ),
              SizedBox(width: Responsive.w(8)),
              Expanded(
                child: Text(
                  'Deposit: $statusText',
                  style: TextStyle(
                    fontSize: Responsive.sp(12),
                    fontWeight: FontWeight.w700,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          if (canManage && !isReturned && order.depositCollected == true) ...[
            SizedBox(height: Responsive.h(8)),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: (_isDepositProcessing || !isEligibleStatus)
                    ? null
                    : _markDepositReturned,
                style: OutlinedButton.styleFrom(
                  foregroundColor: statusColor,
                  side: BorderSide(color: statusColor.withValues(alpha: 0.45)),
                  padding: Responsive.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Responsive.r(8)),
                  ),
                ),
                child: Text(
                  _isDepositProcessing
                      ? 'Processing...'
                      : (isEligibleStatus
                            ? 'Mark Deposit Returned'
                            : 'Return available after completion'),
                  style: TextStyle(
                    fontSize: Responsive.sp(11),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentHistory(String orderId) {
    return Container(
      margin: Responsive.only(left: 16, right: 16, top: 8),
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PAYMENT HISTORY',
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w900,
              color: Colors.grey[600],
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: Responsive.h(16)),
          Consumer(
            builder: (context, ref, _) {
              final paymentsAsync = ref.watch(orderPaymentsProvider(orderId));
              return paymentsAsync.when(
                data: (payments) {
                  if (payments.isEmpty) {
                    return Container(
                      padding: Responsive.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(Responsive.r(8)),
                      ),
                      child: Text(
                        'No payments recorded yet',
                        style: TextStyle(
                          fontSize: Responsive.sp(12),
                          color: Colors.grey[600],
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: payments
                        .map(
                          (payment) => Container(
                            margin: Responsive.only(bottom: 8),
                            padding: Responsive.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green[50],
                              borderRadius: BorderRadius.circular(
                                Responsive.r(8),
                              ),
                              border: Border.all(color: Colors.green[200]!),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.check_circle_rounded,
                                  size: Responsive.icon(20),
                                  color: Colors.green[700],
                                ),
                                SizedBox(width: Responsive.w(12)),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        formatCurrency(payment.amount),
                                        style: TextStyle(
                                          fontSize: Responsive.sp(14),
                                          fontWeight: FontWeight.w700,
                                          color: Colors.green[700],
                                        ),
                                      ),
                                      SizedBox(height: Responsive.h(2)),
                                      Text(
                                        '${payment.paymentType.name.toUpperCase()} • ${payment.paymentMode.name.toUpperCase()}',
                                        style: TextStyle(
                                          fontSize: Responsive.sp(10),
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                      if (payment.notes != null) ...[
                                        SizedBox(height: Responsive.h(2)),
                                        Text(
                                          payment.notes!,
                                          style: TextStyle(
                                            fontSize: Responsive.sp(10),
                                            color: Colors.grey[500],
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                Text(
                                  DateFormat(
                                    'dd MMM',
                                  ).format(DateTime.parse(payment.paymentDate)),
                                  style: TextStyle(
                                    fontSize: Responsive.sp(10),
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  );
                },
                loading: () => Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.grey[400]!,
                    ),
                  ),
                ),
                error: (error, _) => Container(
                  padding: Responsive.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(Responsive.r(8)),
                  ),
                  child: Text(
                    'Failed to load payment history',
                    style: TextStyle(
                      fontSize: Responsive.sp(12),
                      color: Colors.red[700],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildOrderHistoryTimeline(String orderId) {
    return Container(
      margin: Responsive.only(left: 16, right: 16, top: 8),
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'STATUS TIMELINE',
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w900,
              color: Colors.grey[600],
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: Responsive.h(12)),
          Consumer(
            builder: (context, ref, _) {
              final historyAsync = ref.watch(orderHistoryProvider(orderId));
              return historyAsync.when(
                data: (history) {
                  if (history.isEmpty) {
                    return Text(
                      'No status history available',
                      style: TextStyle(
                        fontSize: Responsive.sp(12),
                        color: Colors.grey[600],
                        fontStyle: FontStyle.italic,
                      ),
                    );
                  }

                  return Column(
                    children: history.map((entry) {
                      final status = (entry['status'] ?? '').toString();
                      final notes = (entry['notes'] ?? '').toString();
                      final createdAt = DateTime.tryParse(
                        (entry['created_at'] ?? '').toString(),
                      );
                      return Container(
                        margin: Responsive.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: Responsive.w(10),
                              height: Responsive.w(10),
                              margin: Responsive.only(top: 4),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF434343),
                              ),
                            ),
                            SizedBox(width: Responsive.w(10)),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatHistoryStatus(status),
                                    style: TextStyle(
                                      fontSize: Responsive.sp(13),
                                      fontWeight: FontWeight.w700,
                                      color: _primary,
                                    ),
                                  ),
                                  SizedBox(height: Responsive.h(2)),
                                  Text(
                                    createdAt != null
                                        ? DateFormat(
                                            'dd MMM yyyy • hh:mm a',
                                          ).format(createdAt)
                                        : 'Unknown time',
                                    style: TextStyle(
                                      fontSize: Responsive.sp(10),
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                  if (notes.isNotEmpty) ...[
                                    SizedBox(height: Responsive.h(3)),
                                    Text(
                                      notes,
                                      style: TextStyle(
                                        fontSize: Responsive.sp(10),
                                        color: Colors.grey[700],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                error: (error, _) => Text(
                  'Failed to load status timeline',
                  style: TextStyle(
                    fontSize: Responsive.sp(12),
                    color: Colors.red[700],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _formatHistoryStatus(String raw) {
    if (raw.isEmpty) return 'Unknown';
    return raw
        .split('_')
        .where((part) => part.isNotEmpty)
        .map((part) => part[0].toUpperCase() + part.substring(1))
        .join(' ');
  }
}

class ReturnItemState {
  String? status; // 'excellent', 'damaged', 'missing'
  double damageFee;
  String notes;

  ReturnItemState({this.status, this.damageFee = 0, this.notes = ''});
}
