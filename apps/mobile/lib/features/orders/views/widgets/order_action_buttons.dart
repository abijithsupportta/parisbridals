import 'package:flutter/material.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';

/// Start Rental / Cancel action buttons for the order detail view.
///
/// Only shown when the order is in a schedulable or cancellable state
/// and the current user has management permissions.
class OrderActionButtons extends StatelessWidget {
  final Order order;
  final bool isProcessing;
  final VoidCallback onStartRental;
  final VoidCallback onCancelOrder;

  const OrderActionButtons({
    super.key,
    required this.order,
    required this.isProcessing,
    required this.onStartRental,
    required this.onCancelOrder,
  });

  @override
  Widget build(BuildContext context) {
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
                onPressed: isProcessing ? null : onStartRental,
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
                onPressed: isProcessing ? null : onCancelOrder,
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
}
