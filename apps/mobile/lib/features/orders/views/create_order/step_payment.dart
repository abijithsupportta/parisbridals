import 'package:flutter/material.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import 'create_order_view.dart';

/// Step 4: Payment & finalization with toggle switches for deposit and advance.
class StepPayment extends StatelessWidget {
  final double subtotal;
  final bool collectDeposit;
  final double securityDeposit;
  final PaymentMethod depositPaymentMethod;
  final bool collectAdvance;
  final double advanceAmount;
  final PaymentMethod advancePaymentMethod;
  final TextEditingController notesController;
  final int rentalDays;
  final List<CartItem> cart;
  final ValueChanged<bool> onCollectDepositChanged;
  final ValueChanged<double> onSecurityDepositChanged;
  final ValueChanged<PaymentMethod> onDepositPaymentMethodChanged;
  final ValueChanged<bool> onCollectAdvanceChanged;
  final ValueChanged<double> onAdvanceChanged;
  final ValueChanged<PaymentMethod> onAdvancePaymentMethodChanged;

  const StepPayment({
    super.key,
    required this.subtotal,
    required this.collectDeposit,
    required this.securityDeposit,
    required this.depositPaymentMethod,
    required this.collectAdvance,
    required this.advanceAmount,
    required this.advancePaymentMethod,
    required this.notesController,
    required this.rentalDays,
    required this.cart,
    required this.onCollectDepositChanged,
    required this.onSecurityDepositChanged,
    required this.onDepositPaymentMethodChanged,
    required this.onCollectAdvanceChanged,
    required this.onAdvanceChanged,
    required this.onAdvancePaymentMethodChanged,
  });

  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  double get _total => subtotal + (collectDeposit ? securityDeposit : 0);
  double get _balanceDue => _total - (collectAdvance ? advanceAmount : 0);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          _buildHeader(),
          SizedBox(height: Responsive.h(16)),

          // Order summary
          _buildSection('ORDER SUMMARY', Column(
            children: [
              ...cart.map((item) => Padding(
                padding: Responsive.only(bottom: 6),
                child: Row(children: [
                  Expanded(child: Text('${item.product.name} × ${item.quantity}',
                      style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[700]),
                      maxLines: 1, overflow: TextOverflow.ellipsis)),
                  Text('₹${(item.lineTotal * rentalDays).toStringAsFixed(0)}',
                      style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w600, color: _primary)),
                ]),
              )),
              Divider(height: Responsive.h(16), color: Colors.grey[200]),
              _summaryRow('Rental ($rentalDays days)', '₹${subtotal.toStringAsFixed(0)}'),
            ],
          )),
          SizedBox(height: Responsive.h(12)),

          // Security Deposit with switch
          _buildToggleSection(
            title: 'SECURITY DEPOSIT',
            icon: Icons.shield_outlined,
            isOn: collectDeposit,
            onToggle: onCollectDepositChanged,
            expandedChild: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: Responsive.h(12)),
                _buildAmountField((v) => onSecurityDepositChanged(double.tryParse(v) ?? 0)),
                SizedBox(height: Responsive.h(12)),
                _buildMethodLabel(),
                SizedBox(height: Responsive.h(8)),
                _buildPaymentChips(depositPaymentMethod, onDepositPaymentMethodChanged),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(12)),

          // Advance Payment with switch
          _buildToggleSection(
            title: 'ADVANCE PAYMENT',
            icon: Icons.payments_outlined,
            isOn: collectAdvance,
            onToggle: onCollectAdvanceChanged,
            expandedChild: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: Responsive.h(12)),
                _buildAmountField((v) => onAdvanceChanged(double.tryParse(v) ?? 0)),
                SizedBox(height: Responsive.h(12)),
                _buildMethodLabel(),
                SizedBox(height: Responsive.h(8)),
                _buildPaymentChips(advancePaymentMethod, onAdvancePaymentMethodChanged),
              ],
            ),
          ),
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

          // Total summary card
          _buildTotalCard(),
          SizedBox(height: Responsive.h(40)),
        ],
      ),
    );
  }

  // ── Header ──

  Widget _buildHeader() {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [_accent.withValues(alpha: 0.15), _accent.withValues(alpha: 0.04)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(Responsive.r(14)),
      ),
      child: Row(children: [
        Container(
          padding: Responsive.all(10),
          decoration: BoxDecoration(color: _accent.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(Responsive.r(10))),
          child: Icon(Icons.payments_rounded, size: Responsive.icon(22), color: _primary),
        ),
        SizedBox(width: Responsive.w(12)),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Payment', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w800, color: _primary)),
            SizedBox(height: Responsive.h(2)),
            Text('Review totals and collect payment', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
          ],
        )),
      ]),
    );
  }

  // ── Toggle section (switch + expandable content) ──

  Widget _buildToggleSection({
    required String title,
    required IconData icon,
    required bool isOn,
    required ValueChanged<bool> onToggle,
    required Widget expandedChild,
  }) {
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
          Row(children: [
            Icon(icon, size: Responsive.icon(18), color: isOn ? _primary : Colors.grey[400]),
            SizedBox(width: Responsive.w(8)),
            Expanded(
              child: Text(title, style: TextStyle(
                fontSize: Responsive.sp(10), fontWeight: FontWeight.w900,
                color: isOn ? _primary : Colors.grey[400], letterSpacing: 1,
              )),
            ),
            SizedBox(
              height: Responsive.h(28),
              child: Switch(
                value: isOn,
                onChanged: onToggle,
                activeThumbColor: _primary,
                activeTrackColor: _primary.withValues(alpha: 0.3),
                inactiveThumbColor: Colors.grey[400],
                inactiveTrackColor: Colors.grey[200],
              ),
            ),
          ]),
          // Animated expand/collapse
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: expandedChild,
            crossFadeState: isOn ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 250),
          ),
        ],
      ),
    );
  }

  // ── Amount input field ──

  Widget _buildAmountField(ValueChanged<String> onChanged) {
    return TextField(
      keyboardType: TextInputType.number,
      onChanged: onChanged,
      style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold),
      decoration: InputDecoration(
        hintText: '0',
        prefixText: '₹ ',
        prefixStyle: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: _primary),
        filled: true, fillColor: Colors.grey[50],
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
        contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  // ── "Payment Method" label ──

  Widget _buildMethodLabel() {
    return Text('Payment Method', style: TextStyle(
      fontSize: Responsive.sp(10), fontWeight: FontWeight.w700,
      color: Colors.grey[600], letterSpacing: 0.5,
    ));
  }

  // ── Payment method chips row ──

  Widget _buildPaymentChips(PaymentMethod selected, ValueChanged<PaymentMethod> onChanged) {
    return Wrap(
      spacing: Responsive.w(8),
      runSpacing: Responsive.h(8),
      children: [
        _chip(selected, onChanged, PaymentMethod.cash, 'Cash', Icons.money),
        _chip(selected, onChanged, PaymentMethod.upi, 'UPI', Icons.smartphone),
        _chip(selected, onChanged, PaymentMethod.card, 'Card', Icons.credit_card),
        _chip(selected, onChanged, PaymentMethod.bankTransfer, 'Bank', Icons.account_balance),
      ],
    );
  }

  Widget _chip(PaymentMethod selected, ValueChanged<PaymentMethod> onChanged, PaymentMethod method, String label, IconData icon) {
    final isActive = selected == method;
    return InkWell(
      onTap: () => onChanged(method),
      borderRadius: BorderRadius.circular(Responsive.r(10)),
      child: Container(
        padding: Responsive.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(10)),
          border: Border.all(color: isActive ? _primary : Colors.grey[300]!),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: Responsive.icon(16), color: isActive ? Colors.white : Colors.grey[600]),
          SizedBox(width: Responsive.w(4)),
          Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: isActive ? Colors.white : Colors.grey[700])),
        ]),
      ),
    );
  }

  // ── Section wrapper ──

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

  // ── Summary rows ──

  Widget _summaryRow(String label, String value) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: Colors.grey[700])),
      Text(value, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: _primary)),
    ]);
  }

  Widget _summaryRowWhite(String label, String value, {bool isBold = false, Color? color}) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: Responsive.sp(isBold ? 14 : 12), fontWeight: isBold ? FontWeight.w900 : FontWeight.w500, color: color ?? Colors.white70)),
      Text(value, style: TextStyle(fontSize: Responsive.sp(isBold ? 16 : 13), fontWeight: isBold ? FontWeight.w900 : FontWeight.w600, color: color ?? Colors.white)),
    ]);
  }

  // ── Total summary card ──

  Widget _buildTotalCard() {
    final effectiveDeposit = collectDeposit ? securityDeposit : 0.0;
    final effectiveAdvance = collectAdvance ? advanceAmount : 0.0;

    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: _primary,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
      ),
      child: Column(children: [
        _summaryRowWhite('Subtotal', '₹${subtotal.toStringAsFixed(0)}'),
        if (collectDeposit && securityDeposit > 0) ...[
          SizedBox(height: Responsive.h(6)),
          _summaryRowWhite('Security Deposit', '₹${effectiveDeposit.toStringAsFixed(0)}'),
        ],
        Divider(height: Responsive.h(16), color: Colors.white24),
        _summaryRowWhite('Total', '₹${_total.toStringAsFixed(0)}', isBold: true),
        if (collectAdvance && advanceAmount > 0) ...[
          SizedBox(height: Responsive.h(6)),
          _summaryRowWhite('Advance Paid', '- ₹${effectiveAdvance.toStringAsFixed(0)}', color: const Color(0xFF2ECC71)),
          SizedBox(height: Responsive.h(6)),
          _summaryRowWhite('Balance Due', '₹${_balanceDue.toStringAsFixed(0)}', isBold: true, color: _accent),
        ],
      ]),
    );
  }
}
