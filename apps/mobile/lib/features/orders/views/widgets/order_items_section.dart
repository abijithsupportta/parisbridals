import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import '../order_detail_helpers.dart';

/// Mutable state for a single order item during the return process.
class ReturnItemState {
  String? status; // 'excellent', 'damaged', 'missing'
  double damageFee;
  String notes;

  ReturnItemState({this.status, this.damageFee = 0, this.notes = ''});
}

/// Order items section with product images, return inspection controls,
/// and the settlement footer for processing returns.
class OrderItemsSection extends StatefulWidget {
  final Order order;
  final Map<String, ReturnItemState> returnItems;
  final VoidCallback onReturnSubmit;
  final double lateFee;
  final double discount;
  final ValueChanged<double> onLateFeeChanged;
  final ValueChanged<double> onDiscountChanged;

  const OrderItemsSection({
    super.key,
    required this.order,
    required this.returnItems,
    required this.onReturnSubmit,
    required this.lateFee,
    required this.discount,
    required this.onLateFeeChanged,
    required this.onDiscountChanged,
  });

  @override
  State<OrderItemsSection> createState() => _OrderItemsSectionState();
}

class _OrderItemsSectionState extends State<OrderItemsSection> {
  void _markAllExcellent() {
    setState(() {
      for (var key in widget.returnItems.keys) {
        widget.returnItems[key]?.status = 'excellent';
        widget.returnItems[key]?.damageFee = 0;
        widget.returnItems[key]?.notes = '';
      }
    });
  }

  void _updateItemStatus(String itemId, String status) {
    setState(() {
      widget.returnItems[itemId]?.status = status;
      if (status == 'excellent') {
        widget.returnItems[itemId]?.damageFee = 0;
        widget.returnItems[itemId]?.notes = '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
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
                    color: kPrimary,
                    letterSpacing: 1,
                  ),
                ),
                if (isReturnable(widget.order))
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
          ...widget.order.items!.map((item) => _buildOrderItem(item)),
          if (isReturnable(widget.order)) _buildSettlementFooter(),
        ],
      ),
    );
  }

  Widget _buildProductImage(OrderItem item) {
    final imageUrl = item.productImageUrl;

    if (imageUrl != null && imageUrl.isNotEmpty && imageUrl.startsWith('http')) {
      return CachedNetworkImage(
        imageUrl: imageUrl,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        placeholder: (context, url) => _buildImagePlaceholder(),
        errorWidget: (context, url, error) => _buildImagePlaceholder(),
      );
    }
    return _buildImagePlaceholder();
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

  Widget _buildOrderItem(OrderItem item) {
    final returnState = widget.returnItems[item.id];
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
                  child: _buildProductImage(item),
                ),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.productName ?? 'Product #${item.productId.substring(0, 8)}',
                      style: TextStyle(
                        fontSize: Responsive.sp(14),
                        fontWeight: FontWeight.w700,
                        color: kPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: Responsive.h(4)),
                    Text(
                      'Qty: ${item.quantity} • Rent Price: ${formatCurrency(item.pricePerDay)}',
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
          if (isReturnable(widget.order)) ...[
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
                      side: const BorderSide(color: Color(0xFF2ECC71)),
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
                      side: const BorderSide(color: Color(0xFFF5A623)),
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
                          widget.onLateFeeChanged(double.tryParse(val) ?? 0),
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
                          widget.onDiscountChanged(double.tryParse(val) ?? 0),
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
              onPressed: widget.onReturnSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
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
}
