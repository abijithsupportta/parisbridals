import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Reusable Recent Order Item Widget
class HomeRecentOrder extends StatelessWidget {
  final String orderId;
  final String customerName;
  final String? productName;
  final String status;
  final String time;
  final Color? statusColor;
  final VoidCallback? onTap;

  const HomeRecentOrder({
    super.key,
    required this.orderId,
    required this.customerName,
    this.productName,
    required this.status,
    required this.time,
    this.statusColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusClr = statusColor ?? _getStatusColor(status);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: EdgeInsets.only(bottom: context.hs(12)),
        padding: EdgeInsets.all(context.sp(16)),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(context.sr(16)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: context.ws(48),
              height: context.ws(48),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(context.sr(12)),
              ),
              child: Icon(
                Icons.receipt_long,
                color: AppColors.secondary,
                size: context.sicon(24),
              ),
            ),
            SizedBox(width: context.ws(16)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order #$orderId',
                    style: AppTextStyles.bodyMedium(context).copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                  SizedBox(height: context.hs(4)),
                  Text(
                    customerName,
                    style: AppTextStyles.bodySmall(context).copyWith(
                      color: AppColors.grey,
                    ),
                  ),
                  if (productName != null) ...[
                    SizedBox(height: context.hs(2)),
                    Text(
                      productName!,
                      style: AppTextStyles.caption(context).copyWith(
                        color: AppColors.grey,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: context.ws(8),
                    vertical: context.hs(4),
                  ),
                  decoration: BoxDecoration(
                    color: statusClr.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(context.sr(8)),
                  ),
                  child: Text(
                    status,
                    style: AppTextStyles.caption(context).copyWith(
                      color: statusClr,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                SizedBox(height: context.hs(8)),
                Text(
                  time,
                  style: AppTextStyles.caption(context).copyWith(
                    color: AppColors.grey,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'active':
      case 'in rental':
        return Colors.blue;
      case 'completed':
      case 'returned':
        return Colors.green;
      case 'overdue':
      case 'late':
        return Colors.red;
      default:
        return AppColors.grey;
    }
  }
}
