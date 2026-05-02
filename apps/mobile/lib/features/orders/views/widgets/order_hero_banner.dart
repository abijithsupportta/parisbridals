import 'package:flutter/material.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import '../order_detail_helpers.dart';

/// Hero banner at the top of order detail showing customer name,
/// status badge, and payment due/paid indicator.
class OrderHeroBanner extends StatelessWidget {
  final Order order;

  const OrderHeroBanner({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final statusColor = getStatusColor(order.status);
    final statusLabel = getStatusLabel(order.status);
    final due = amountDue(order);

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
                        color: kPrimary,
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
          if (due > 0)
            _buildDueBadge(due)
          else
            _buildPaidBadge(),
        ],
      ),
    );
  }

  Widget _buildDueBadge(double due) {
    return Container(
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
            'DUE: ${formatCurrency(due)}',
            style: TextStyle(
              fontSize: Responsive.sp(14),
              fontWeight: FontWeight.w900,
              color: const Color(0xFFFF6B8A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaidBadge() {
    return Container(
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
    );
  }
}
