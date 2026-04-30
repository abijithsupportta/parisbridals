import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import 'payment_recording_modal.dart';

String formatCurrency(double amount) {
  return '₹${amount.toStringAsFixed(0)}';
}

/// Comprehensive Order Detail View matching admin functionality
class OrderDetailViewNew extends ConsumerStatefulWidget {
  final Order order;

  const OrderDetailViewNew({super.key, required this.order});

  @override
  ConsumerState<OrderDetailViewNew> createState() => _OrderDetailViewNewState();
}

class _OrderDetailViewNewState extends ConsumerState<OrderDetailViewNew> {
  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);
  static const _bg = Color(0xFFF8F8F8);

  // Return processing state
  final Map<String, ReturnItemState> _returnItems = {};
  double _lateFee = 0;
  double _discount = 0;

  @override
  void initState() {
    super.initState();
    _initializeReturnItems();
  }

  void _initializeReturnItems() {
    if (_isReturnable && widget.order.items != null) {
      for (var item in widget.order.items!) {
        _returnItems[item.id] = ReturnItemState();
      }
    }
  }

  bool get _isReturnable {
    return widget.order.status == OrderStatus.inUse ||
        widget.order.status == OrderStatus.ongoing ||
        widget.order.status == OrderStatus.lateReturn ||
        widget.order.status == OrderStatus.partial;
  }

  double get _amountDue {
    return (widget.order.totalAmount - widget.order.amountPaid).clamp(0, double.infinity);
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);

    return Scaffold(
      backgroundColor: _bg,
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroBanner(canManage),
            _buildLogisticsBar(),
            _buildOrderItemsSection(),
            _buildCustomerCard(),
            _buildFinancialCard(),
            SizedBox(height: Responsive.h(80)),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: _primary,
      foregroundColor: Colors.white,
      elevation: 0,
      title: Text(
        'Order #${widget.order.id.substring(0, 6).toUpperCase()}',
        style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold),
      ),
      actions: [
        IconButton(
          icon: Icon(Icons.refresh_rounded, size: Responsive.icon(24)),
          onPressed: () => ref.invalidate(orderByIdProvider(widget.order.id)),
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

  Widget _buildHeroBanner(bool canManage) {
    final statusColor = _getStatusColor(widget.order.status);
    final statusLabel = _getStatusLabel(widget.order.status);

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
                      widget.order.customer?.name ?? 'Unknown Customer',
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
                      widget.order.customer?.phone ?? '',
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
          if (_amountDue > 0)
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
                  Icon(Icons.warning_rounded, size: Responsive.icon(16), color: const Color(0xFFFF6B8A)),
                  SizedBox(width: Responsive.w(6)),
                  Text(
                    'DUE: ${formatCurrency(_amountDue)}',
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
                  Icon(Icons.check_circle_rounded, size: Responsive.icon(16), color: const Color(0xFF2ECC71)),
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

  Widget _buildLogisticsBar() {
    final isLate = widget.order.status == OrderStatus.lateReturn;

    return Padding(
      padding: Responsive.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: _buildLogisticsCard(
              'OUT',
              _formatDate(widget.order.startDate),
              Colors.blue[50]!,
              Colors.blue[700]!,
            ),
          ),
          SizedBox(width: Responsive.w(12)),
          Expanded(
            child: _buildLogisticsCard(
              'IN',
              _formatDate(widget.order.endDate),
              isLate ? Colors.red[50]! : Colors.green[50]!,
              isLate ? Colors.red[700]! : Colors.green[700]!,
              isLate: isLate,
            ),
          ),
          SizedBox(width: Responsive.w(12)),
          Expanded(
            child: _buildLogisticsCard(
              'ITEMS',
              '${widget.order.items?.length ?? 0}',
              Colors.grey[100]!,
              _primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogisticsCard(String label, String value, Color bgColor, Color textColor, {bool isLate = false}) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: isLate ? Colors.red[300]! : Colors.transparent),
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

  Widget _buildOrderItemsSection() {
    if (widget.order.items == null || widget.order.items!.isEmpty) {
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
                if (_isReturnable)
                  TextButton.icon(
                    onPressed: _markAllExcellent,
                    icon: Icon(Icons.check_circle_rounded, size: Responsive.icon(16), color: const Color(0xFF2ECC71)),
                    label: Text(
                      'Mark All Good',
                      style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.bold),
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
          ...widget.order.items!.map((item) => _buildOrderItem(item)),
          if (_isReturnable) _buildSettlementFooter(),
        ],
      ),
    );
  }

  Widget _buildOrderItem(OrderItem item) {
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
                child: Icon(Icons.image_outlined, size: Responsive.icon(24), color: Colors.grey[400]),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Product #${item.productId.substring(0, 8)}',
                      style: TextStyle(
                        fontSize: Responsive.sp(14),
                        fontWeight: FontWeight.w700,
                        color: _primary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: Responsive.h(4)),
                    Text(
                      'Qty: ${item.quantity} • ${formatCurrency(item.pricePerDay)}/day',
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
          if (_isReturnable) ...[
            SizedBox(height: Responsive.h(12)),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _updateItemStatus(item.id, 'excellent'),
                    icon: Icon(Icons.check_circle_rounded, size: Responsive.icon(18)),
                    label: Text('Good', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isExcellent ? const Color(0xFF2ECC71) : Colors.white,
                      foregroundColor: isExcellent ? Colors.white : const Color(0xFF2ECC71),
                      side: BorderSide(color: const Color(0xFF2ECC71)),
                      padding: Responsive.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
                    ),
                  ),
                ),
                SizedBox(width: Responsive.w(8)),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _updateItemStatus(item.id, 'damaged'),
                    icon: Icon(Icons.warning_rounded, size: Responsive.icon(18)),
                    label: Text('Damaged', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDamaged ? const Color(0xFFF5A623) : Colors.white,
                      foregroundColor: isDamaged ? Colors.white : const Color(0xFFF5A623),
                      side: BorderSide(color: const Color(0xFFF5A623)),
                      padding: Responsive.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
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
                      onChanged: (val) => setState(() => returnState?.notes = val),
                      decoration: InputDecoration(
                        hintText: 'Describe damage...',
                        hintStyle: TextStyle(fontSize: Responsive.sp(12)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(8))),
                        contentPadding: Responsive.symmetric(horizontal: 12, vertical: 10),
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
                      onChanged: (val) => setState(() => returnState?.damageFee = double.tryParse(val) ?? 0),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
                        hintStyle: TextStyle(fontSize: Responsive.sp(14)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(8))),
                        contentPadding: Responsive.symmetric(horizontal: 12, vertical: 10),
                      ),
                      style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold),
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
                      onChanged: (val) => setState(() => _lateFee = double.tryParse(val) ?? 0),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(8))),
                        contentPadding: Responsive.symmetric(horizontal: 12, vertical: 10),
                      ),
                      style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
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
                      onChanged: (val) => setState(() => _discount = double.tryParse(val) ?? 0),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(8))),
                        contentPadding: Responsive.symmetric(horizontal: 12, vertical: 10),
                      ),
                      style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
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
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
              ),
              child: Text(
                'Complete Return Process',
                style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
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

  void _submitReturn() {
    // TODO: Implement return submission
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Return processing not yet implemented')),
    );
  }

  Widget _buildCustomerCard() {
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
            widget.order.customer?.name ?? 'Unknown',
            style: TextStyle(
              fontSize: Responsive.sp(20),
              fontWeight: FontWeight.w900,
              color: _primary,
            ),
          ),
          SizedBox(height: Responsive.h(12)),
          InkWell(
            onTap: () {
              // TODO: Implement phone call
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
                  Icon(Icons.phone_rounded, size: Responsive.icon(20), color: const Color(0xFF2ECC71)),
                  SizedBox(width: Responsive.w(8)),
                  Text(
                    widget.order.customer?.phone ?? 'N/A',
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

  Widget _buildFinancialCard() {
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
          _buildFinancialRow('Subtotal', formatCurrency(widget.order.subtotal)),
          if (widget.order.gstAmount > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow('GST', formatCurrency(widget.order.gstAmount)),
          ],
          SizedBox(height: Responsive.h(8)),
          _buildFinancialRow('Security Deposit', formatCurrency(widget.order.securityDeposit)),
          if (widget.order.lateFee > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow('Late Fee', '+ ${formatCurrency(widget.order.lateFee)}', color: Colors.red[700]),
          ],
          if (widget.order.damageChargesTotal > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow('Damage Charges', '+ ${formatCurrency(widget.order.damageChargesTotal)}', color: Colors.orange[700]),
          ],
          if (widget.order.discount > 0) ...[
            SizedBox(height: Responsive.h(8)),
            _buildFinancialRow('Discount', '- ${formatCurrency(widget.order.discount)}', color: Colors.green[700]),
          ],
          Divider(height: Responsive.h(24), thickness: 2),
          _buildFinancialRow(
            'Grand Total',
            formatCurrency(widget.order.totalAmount),
            isBold: true,
          ),
          SizedBox(height: Responsive.h(8)),
          _buildFinancialRow('Total Paid', formatCurrency(widget.order.amountPaid)),
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
                formatCurrency(_amountDue),
                style: TextStyle(
                  fontSize: Responsive.sp(20),
                  fontWeight: FontWeight.w900,
                  color: _amountDue > 0 ? Colors.red[700] : Colors.green[700],
                ),
              ),
            ],
          ),
          if (_amountDue > 0) ...[
            SizedBox(height: Responsive.h(16)),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // TODO: Implement payment recording
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => PaymentRecordingModal(
                      orderId: widget.order.id,
                      amountDue: _amountDue,
                      onSuccess: () {
                        ref.invalidate(orderByIdProvider(widget.order.id));
                        ref.invalidate(ordersProvider);
                      },
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
                ),
                child: Text(
                  'Record Payment',
                  style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFinancialRow(String label, String value, {bool isBold = false, Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: Responsive.sp(isBold ? 14 : 13),
            fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
            color: color ?? Colors.grey[700],
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: Responsive.sp(isBold ? 14 : 13),
            fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
            color: color ?? _primary,
          ),
        ),
      ],
    );
  }
}

class ReturnItemState {
  String? status; // 'excellent', 'damaged', 'missing'
  double damageFee;
  String notes;

  ReturnItemState({
    this.status,
    this.damageFee = 0,
    this.notes = '',
  });
}
