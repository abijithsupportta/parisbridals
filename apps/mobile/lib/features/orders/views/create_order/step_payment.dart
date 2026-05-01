import 'package:flutter/material.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import 'create_order_view.dart';

/// Step 4: Payment & finalization.
class StepPayment extends StatelessWidget {
  final double subtotal;
  final double securityDeposit;
  final double advanceAmount;
  final PaymentMethod paymentMethod;
  final TextEditingController notesController;
  final int rentalDays;
  final List<CartItem> cart;
  final ValueChanged<double> onSecurityDepositChanged;
  final ValueChanged<double> onAdvanceChanged;
  final ValueChanged<PaymentMethod> onPaymentMethodChanged;

  const StepPayment({
    super.key,
    required this.subtotal,
    required this.securityDeposit,
    required this.advanceAmount,
    required this.paymentMethod,
    required this.notesController,
    required this.rentalDays,
    required this.cart,
    required this.onSecurityDepositChanged,
    required this.onAdvanceChanged,
    required this.onPaymentMethodChanged,
  });

  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  double get _total => subtotal + securityDeposit;
  double get _balanceDue => _total - advanceAmount;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_accent.withValues(alpha: 0.15), _accent.withValues(alpha: 0.04)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(Responsive.r(14)),
            ),
            child: Row(
              children: [
                Container(
                  padding: Responsive.all(10),
                  decoration: BoxDecoration(color: _accent.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(Responsive.r(10))),
                  child: Icon(Icons.payments_rounded, size: Responsive.icon(22), color: _primary),
                ),
                SizedBox(width: Responsive.w(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Payment', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w800, color: _primary)),
                      SizedBox(height: Responsive.h(2)),
                      Text('Review totals and collect payment', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(16)),

          // Price summary
          _buildSection('ORDER SUMMARY', Column(
            children: [
              ...cart.map((item) => Padding(
                padding: Responsive.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('${item.product.name} × ${item.quantity}',
                          style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[700]),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                    Text('₹${(item.lineTotal * rentalDays).toStringAsFixed(0)}',
                        style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w600, color: _primary)),
                  ],
                ),
              )),
              Divider(height: Responsive.h(16), color: Colors.grey[200]),
              _summaryRow('Rental ($rentalDays days)', '₹${subtotal.toStringAsFixed(0)}'),
            ],
          )),
          SizedBox(height: Responsive.h(12)),

          // Security deposit
          _buildSection('SECURITY DEPOSIT', TextField(
            keyboardType: TextInputType.number,
            onChanged: (v) => onSecurityDepositChanged(double.tryParse(v) ?? 0),
            style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              hintText: '0',
              prefixText: '₹ ',
              prefixStyle: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: _primary),
              filled: true, fillColor: Colors.grey[50],
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
              contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
            ),
          )),
          SizedBox(height: Responsive.h(12)),

          // Advance payment
          _buildSection('ADVANCE PAYMENT', Column(
            children: [
              TextField(
                keyboardType: TextInputType.number,
                onChanged: (v) => onAdvanceChanged(double.tryParse(v) ?? 0),
                style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: '0',
                  prefixText: '₹ ',
                  prefixStyle: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: _primary),
                  filled: true, fillColor: Colors.grey[50],
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
                  contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              SizedBox(height: Responsive.h(12)),
              // Payment method chips
              Wrap(
                spacing: Responsive.w(8),
                runSpacing: Responsive.h(8),
                children: [
                  _buildPaymentChip(context, PaymentMethod.cash, 'Cash', Icons.money),
                  _buildPaymentChip(context, PaymentMethod.upi, 'UPI', Icons.smartphone),
                  _buildPaymentChip(context, PaymentMethod.card, 'Card', Icons.credit_card),
                  _buildPaymentChip(context, PaymentMethod.bankTransfer, 'Bank', Icons.account_balance),
                ],
              ),
            ],
          )),
          SizedBox(height: Responsive.h(12)),

          // Notes
          _buildSection('NOTES (OPTIONAL)', TextField(
            controller: notesController,
            maxLines: 3,
            style: TextStyle(fontSize: Responsive.sp(13)),
            decoration: InputDecoration(
              hintText: 'Any special instructions...',
              filled: true, fillColor: Colors.grey[50],
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
              contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
            ),
          )),
          SizedBox(height: Responsive.h(16)),

          // Total summary
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              color: _primary,
              borderRadius: BorderRadius.circular(Responsive.r(16)),
            ),
            child: Column(
              children: [
                _summaryRowWhite('Subtotal', '₹${subtotal.toStringAsFixed(0)}'),
                SizedBox(height: Responsive.h(6)),
                _summaryRowWhite('Security Deposit', '₹${securityDeposit.toStringAsFixed(0)}'),
                Divider(height: Responsive.h(16), color: Colors.white24),
                _summaryRowWhite('Total', '₹${_total.toStringAsFixed(0)}', isBold: true),
                if (advanceAmount > 0) ...[
                  SizedBox(height: Responsive.h(6)),
                  _summaryRowWhite('Advance Paid', '- ₹${advanceAmount.toStringAsFixed(0)}', color: const Color(0xFF2ECC71)),
                  SizedBox(height: Responsive.h(6)),
                  _summaryRowWhite('Balance Due', '₹${_balanceDue.toStringAsFixed(0)}', isBold: true, color: _accent),
                ],
              ],
            ),
          ),
          SizedBox(height: Responsive.h(40)),
        ],
      ),
    );
  }

  Widget _buildSection(String title, Widget child) {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.w900, color: _primary, letterSpacing: 1)),
          SizedBox(height: Responsive.h(12)),
          child,
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: Colors.grey[700])),
        Text(value, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: _primary)),
      ],
    );
  }

  Widget _summaryRowWhite(String label, String value, {bool isBold = false, Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(isBold ? 14 : 12), fontWeight: isBold ? FontWeight.w900 : FontWeight.w500, color: color ?? Colors.white70)),
        Text(value, style: TextStyle(fontSize: Responsive.sp(isBold ? 16 : 13), fontWeight: isBold ? FontWeight.w900 : FontWeight.w600, color: color ?? Colors.white)),
      ],
    );
  }

  Widget _buildPaymentChip(BuildContext context, PaymentMethod method, String label, IconData icon) {
    final isActive = paymentMethod == method;
    return InkWell(
      onTap: () => onPaymentMethodChanged(method),
      borderRadius: BorderRadius.circular(Responsive.r(10)),
      child: Container(
        padding: Responsive.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(10)),
          border: Border.all(color: isActive ? _primary : Colors.grey[300]!),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: Responsive.icon(16), color: isActive ? Colors.white : Colors.grey[600]),
            SizedBox(width: Responsive.w(4)),
            Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: isActive ? Colors.white : Colors.grey[700])),
          ],
        ),
      ),
    );
  }
}
