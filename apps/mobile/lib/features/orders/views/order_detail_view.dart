import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import 'order_form_view.dart';

class OrderDetailView extends ConsumerWidget {
  final Order order;

  const OrderDetailView({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${order.id.substring(0, 8)}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => OrderFormView(order: order),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Delete Order'),
                  content: const Text('Are you sure you want to delete this order?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                      child: const Text('Delete'),
                    ),
                  ],
                ),
              );

              if (confirmed == true && context.mounted) {
                await ref.read(orderOperationsProvider).deleteOrder(order.id);
                if (context.mounted) {
                  ref.invalidate(ordersProvider);
                  Navigator.pop(context);
                }
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Order Information',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _buildDetailRow('Customer', order.customer?.name ?? 'N/A'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Status', _formatStatus(order.status)),
                    const SizedBox(height: 8),
                    _buildDetailRow('Payment Status', _formatPaymentStatus(order.paymentStatus)),
                    const SizedBox(height: 8),
                    _buildDetailRow('Start Date', _formatDate(order.startDate)),
                    const SizedBox(height: 8),
                    _buildDetailRow('End Date', _formatDate(order.endDate)),
                    const SizedBox(height: 8),
                    _buildDetailRow('Event Date', _formatDate(order.eventDate)),
                    if (order.branch != null) ...[
                      const SizedBox(height: 8),
                      _buildDetailRow('Branch', order.branch!.name),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Financial Information',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _buildDetailRow('Subtotal', '₹${order.subtotal.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('GST Amount', '₹${order.gstAmount.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Total Amount', '₹${order.totalAmount.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Security Deposit', '₹${order.securityDeposit.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Amount Paid', '₹${order.amountPaid.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Late Fee', '₹${order.lateFee.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Discount', '₹${order.discount.toStringAsFixed(2)}'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Damage Charges', '₹${order.damageChargesTotal.toStringAsFixed(2)}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (order.items != null && order.items!.isNotEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Order Items',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      ...order.items!.map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Product ID: ${item.productId}'),
                                Text('Quantity: ${item.quantity}'),
                                Text('Price/Day: ₹${item.pricePerDay.toStringAsFixed(2)}'),
                                Text('Total: ₹${item.totalPrice.toStringAsFixed(2)}'),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            if (order.deliveryAddress != null || order.pickupAddress != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Delivery Information',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      if (order.deliveryMethod != null)
                        _buildDetailRow('Method', _formatDeliveryMethod(order.deliveryMethod!)),
                      if (order.deliveryAddress != null) ...[
                        const SizedBox(height: 8),
                        _buildDetailRow('Delivery Address', order.deliveryAddress!),
                      ],
                      if (order.pickupAddress != null) ...[
                        const SizedBox(height: 8),
                        _buildDetailRow('Pickup Address', order.pickupAddress!),
                      ],
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            if (order.notes != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Notes',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      Text(order.notes!),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 140,
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Text(value),
        ),
      ],
    );
  }

  String _formatStatus(OrderStatus status) {
    return status.name.split('_').map((e) => e[0].toUpperCase() + e.substring(1)).join(' ');
  }

  String _formatPaymentStatus(PaymentStatus status) {
    return status.name[0].toUpperCase() + status.name.substring(1);
  }

  String _formatDeliveryMethod(DeliveryMethod method) {
    return method.name[0].toUpperCase() + method.name.substring(1);
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }
}
