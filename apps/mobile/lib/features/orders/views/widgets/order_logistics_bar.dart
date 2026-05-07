import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import '../order_detail_helpers.dart';

/// Logistics date bar showing OUT date, IN date, and item count.
class OrderLogisticsBar extends StatelessWidget {
  final Order order;

  const OrderLogisticsBar({super.key, required this.order});

  String _formatDate(String dateStr) {
    try {
      return DateFormat('d MMM yyyy').format(DateTime.parse(dateStr));
    } catch (_) {
      // If parsing fails, try to just return the first 10 chars (YYYY-MM-DD)
      if (dateStr.length >= 10) return dateStr.substring(0, 10);
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLate = order.status == OrderStatus.lateReturn;

    return Padding(
      padding: Responsive.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: _buildCard(
              'OUT',
              _formatDate(order.startDate),
              Colors.blue[50]!,
              Colors.blue[700]!,
            ),
          ),
          SizedBox(width: Responsive.w(16)),
          Expanded(
            child: _buildCard(
              'IN',
              _formatDate(order.endDate),
              isLate ? Colors.red[50]! : Colors.green[50]!,
              isLate ? Colors.red[700]! : Colors.green[700]!,
              isLate: isLate,
            ),
          ),
          SizedBox(width: Responsive.w(16)),
          Expanded(
            child: _buildCard(
              'ITEMS',
              '${order.items?.length ?? 0}',
              Colors.grey[100]!,
              kPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(
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
}
