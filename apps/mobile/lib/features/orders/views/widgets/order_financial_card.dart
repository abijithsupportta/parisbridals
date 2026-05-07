import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import '../../models/payment.dart';
import '../../providers/order_provider.dart';
import '../../providers/payment_provider.dart';
import '../order_detail_helpers.dart';
import '../payment_recording_modal.dart';

/// Financial receipt card showing breakdown, payment collection,
/// deposit status, payment history, and status timeline.
class OrderFinancialCard extends ConsumerWidget {
  final Order order;
  final String orderId;
  final bool canManage;
  final bool isDepositProcessing;
  final VoidCallback onMarkDepositReturned;

  const OrderFinancialCard({
    super.key,
    required this.order,
    required this.orderId,
    required this.canManage,
    required this.isDepositProcessing,
    required this.onMarkDepositReturned,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Use payment records as the authoritative source of truth for
    // collected amount. order.amountPaid can be stale if the backend
    // update failed silently or the cache hasn't refreshed yet.
    final paymentsAsync = ref.watch(orderPaymentsProvider(orderId));
    final double collected = paymentsAsync.when(
      data: (payments) {
        // Sum RENTAL payments only. Exclude deposit and deposit_refund —
        // they are a separate financial track managed via
        // order.depositCollected / depositReturned flags.
        double total = 0;
        for (final p in payments) {
          if (p.paymentType == PaymentType.deposit ||
              p.paymentType == PaymentType.depositRefund) {
            continue; // skip deposit-related payments
          }
          if (p.paymentType == PaymentType.refund) {
            total -= p.amount;
          } else {
            total += p.amount;
          }
        }
        return total.clamp(0, double.infinity).toDouble();
      },
      loading: () => collectedAmount(order), // fallback while loading
      error: (_, __) => collectedAmount(order), // fallback on error
    );
    final double due = (order.totalAmount - collected)
        .clamp(0, double.infinity)
        .toDouble();

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
          _buildFinancialRow(
            'Payment Collected',
            formatCurrency(collected),
            color: Colors.green[700],
          ),
          Divider(height: Responsive.h(24), thickness: 2),
          _buildPaymentCollectionCardFromValues(collected, due),
          if (order.securityDeposit > 0) ...[
            SizedBox(height: Responsive.h(14)),
            _buildDepositStatusCard(),
          ],
          if (due > 0) ...[
            SizedBox(height: Responsive.h(16)),
            _buildRecordPaymentButton(context, ref, due),
          ],
          SizedBox(height: Responsive.h(16)),
          _buildPaymentHistory(context, ref),
          SizedBox(height: Responsive.h(12)),
          _buildOrderHistoryTimeline(context, ref),
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
            color: color ?? kPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentCollectionCardFromValues(double collected, double due) {
    final Color statusColor;
    final String label;
    if (due <= 0) {
      statusColor = const Color(0xFF2ECC71);
      label = 'Payment Collected';
    } else if (collected > 0) {
      statusColor = const Color(0xFFF5A623);
      label = 'Partially Collected';
    } else {
      statusColor = const Color(0xFFFF6B8A);
      label = 'Payment Pending';
    }

    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: statusColor.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                due <= 0
                    ? Icons.check_circle_rounded
                    : Icons.account_balance_wallet_rounded,
                size: Responsive.icon(20),
                color: statusColor,
              ),
              SizedBox(width: Responsive.w(8)),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: Responsive.sp(13),
                    fontWeight: FontWeight.w900,
                    color: statusColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          SizedBox(height: Responsive.h(12)),
          Row(
            children: [
              Expanded(
                child: _buildAmountTile(
                  'Collected',
                  formatCurrency(collected),
                  Colors.green[700]!,
                ),
              ),
              SizedBox(width: Responsive.w(10)),
              Expanded(
                child: _buildAmountTile(
                  'Left to Collect',
                  formatCurrency(due),
                  due > 0 ? Colors.red[700]! : Colors.green[700]!,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }


  Widget _buildAmountTile(String label, String amount, Color color) {
    return Container(
      padding: Responsive.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w700,
              color: Colors.grey[600],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: Responsive.h(4)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              amount,
              style: TextStyle(
                fontSize: Responsive.sp(16),
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDepositStatusCard() {
    final isReturned = order.depositReturned;
    final isEligibleStatus =
        order.status == OrderStatus.returned ||
        order.status == OrderStatus.completed ||
        order.status == OrderStatus.partial ||
        order.status == OrderStatus.flagged ||
        order.status == OrderStatus.lateReturn;

    if (isReturned) {
      return Container(
        padding: Responsive.all(10),
        decoration: BoxDecoration(
          color: Colors.green[50],
          borderRadius: BorderRadius.circular(Responsive.r(10)),
          border: Border.all(color: Colors.green[200]!),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_rounded,
                size: Responsive.icon(16), color: Colors.green[700]),
            SizedBox(width: Responsive.w(6)),
            Text(
              'Deposit Refunded',
              style: TextStyle(
                fontSize: Responsive.sp(12),
                fontWeight: FontWeight.w700,
                color: Colors.green[700],
              ),
            ),
          ],
        ),
      );
    }

    if (canManage && isEligibleStatus && order.securityDeposit > 0) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: isDepositProcessing ? null : onMarkDepositReturned,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange[700],
            foregroundColor: Colors.white,
            padding: Responsive.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(Responsive.r(12)),
            ),
          ),
          child: Text(
            isDepositProcessing
                ? 'Processing...'
                : 'Refund Deposit  •  ${formatCurrency(order.securityDeposit)}',
            style: TextStyle(
              fontSize: Responsive.sp(14),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildRecordPaymentButton(BuildContext context, WidgetRef ref, double due) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => PaymentRecordingModal(
              orderId: orderId,
              amountDue: due,

              onSuccess: () async {
                // Small delay so the backend amount_paid update propagates
                // before we re-fetch. Without this the GET returns stale data.
                await Future.delayed(const Duration(milliseconds: 500));

                // Refresh order + payments data to reflect the new amount_paid
                ref.invalidate(orderByIdProvider(orderId));
                ref.invalidate(orderPaymentsProvider(orderId));
                // Background-refresh the list so it's fresh when user goes back
                ref.invalidate(ordersProvider);
              },
            ),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: kPrimary,
          foregroundColor: Colors.white,
          padding: Responsive.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Responsive.r(12)),
          ),
        ),
        child: Text(
          'Collect Remaining Payment',
          style: TextStyle(
            fontSize: Responsive.sp(14),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentHistory(BuildContext context, WidgetRef ref) {
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
                          (payment) {
                            final isRefundType =
                                payment.paymentType == PaymentType.refund ||
                                payment.paymentType == PaymentType.depositRefund;
                            final bgColor = isRefundType
                                ? Colors.orange[50]
                                : Colors.green[50];
                            final borderColor = isRefundType
                                ? Colors.orange[200]!
                                : Colors.green[200]!;
                            final iconColor = isRefundType
                                ? Colors.orange[700]
                                : Colors.green[700];
                            final amountColor = isRefundType
                                ? Colors.orange[700]
                                : Colors.green[700];
                            final icon = isRefundType
                                ? Icons.reply_rounded
                                : Icons.check_circle_rounded;

                            return Container(
                              margin: Responsive.only(bottom: 8),
                              padding: Responsive.all(12),
                              decoration: BoxDecoration(
                                color: bgColor,
                                borderRadius: BorderRadius.circular(
                                  Responsive.r(8),
                                ),
                                border: Border.all(color: borderColor),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    icon,
                                    size: Responsive.icon(20),
                                    color: iconColor,
                                  ),
                                  SizedBox(width: Responsive.w(12)),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${isRefundType ? "-" : "+"}${formatCurrency(payment.amount)}',
                                          style: TextStyle(
                                            fontSize: Responsive.sp(14),
                                            fontWeight: FontWeight.w700,
                                            color: amountColor,
                                          ),
                                        ),
                                        SizedBox(height: Responsive.h(2)),
                                        Text(
                                          '${payment.paymentType == PaymentType.depositRefund ? "DEPOSIT REFUND" : payment.paymentType.name.toUpperCase()} • ${payment.paymentMode.name.toUpperCase()}',
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
                            );
                          },
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

  Widget _buildOrderHistoryTimeline(BuildContext context, WidgetRef ref) {
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
                                color: kPrimary,
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
                                      color: kPrimary,
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
