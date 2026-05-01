import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../models/payment.dart';
import '../providers/payment_provider.dart';

String formatCurrency(double amount) => '₹${amount.toStringAsFixed(0)}';

class PaymentRecordingModal extends ConsumerStatefulWidget {
  final String orderId;
  final double amountDue;
  final VoidCallback onSuccess;

  const PaymentRecordingModal({
    super.key,
    required this.orderId,
    required this.amountDue,
    required this.onSuccess,
  });

  @override
  ConsumerState<PaymentRecordingModal> createState() => _PaymentRecordingModalState();
}

class _PaymentRecordingModalState extends ConsumerState<PaymentRecordingModal> {
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  PaymentMode _selectedMode = PaymentMode.cash;
  PaymentType _selectedType = PaymentType.final_;
  bool _isSubmitting = false;

  static const _primary = Color(0xFF434343);

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    
    if (amount <= 0) {
      _showError('Amount must be greater than 0');
      return;
    }

    if (amount > widget.amountDue) {
      _showError('Amount cannot exceed due amount');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final repository = ref.read(paymentRepositoryProvider);
      await repository.createPayment(CreatePaymentDTO(
        orderId: widget.orderId,
        paymentType: _selectedType,
        amount: amount,
        paymentMode: _selectedMode,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      ));

      if (mounted) {
        Navigator.pop(context);
        widget.onSuccess();
        _showSuccess('Payment recorded successfully');
      }
    } catch (e) {
      if (mounted) {
        _showError(e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red[700]),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green[700]),
    );
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final amount = double.tryParse(_amountController.text) ?? 0;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(20))),
      ),
      child: SingleChildScrollView(
        padding: Responsive.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Record Payment',
                  style: TextStyle(
                    fontSize: Responsive.sp(18),
                    fontWeight: FontWeight.w900,
                    color: _primary,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close_rounded, size: Responsive.icon(24)),
                ),
              ],
            ),
            SizedBox(height: Responsive.h(16)),
            
            // Summary Box
            Container(
              padding: Responsive.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(Responsive.r(12)),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'REMAINING DUE',
                        style: TextStyle(
                          fontSize: Responsive.sp(10),
                          fontWeight: FontWeight.w800,
                          color: Colors.grey[600],
                          letterSpacing: 0.5,
                        ),
                      ),
                      SizedBox(height: Responsive.h(4)),
                      Text(
                        formatCurrency(widget.amountDue),
                        style: TextStyle(
                          fontSize: Responsive.sp(20),
                          fontWeight: FontWeight.w900,
                          color: _primary,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'PAYING',
                        style: TextStyle(
                          fontSize: Responsive.sp(10),
                          fontWeight: FontWeight.w800,
                          color: Colors.grey[600],
                          letterSpacing: 0.5,
                        ),
                      ),
                      SizedBox(height: Responsive.h(4)),
                      Text(
                        formatCurrency(amount),
                        style: TextStyle(
                          fontSize: Responsive.sp(20),
                          fontWeight: FontWeight.w900,
                          color: amount > widget.amountDue ? Colors.red[700] : Colors.green[700],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(height: Responsive.h(20)),

            // Payment Method
            Text(
              'PAYMENT METHOD',
              style: TextStyle(
                fontSize: Responsive.sp(11),
                fontWeight: FontWeight.w800,
                color: Colors.grey[700],
                letterSpacing: 0.5,
              ),
            ),
            SizedBox(height: Responsive.h(12)),
            Wrap(
              spacing: Responsive.w(8),
              runSpacing: Responsive.h(8),
              children: [
                _buildPaymentModeButton(PaymentMode.cash, 'Cash', Icons.money_rounded),
                _buildPaymentModeButton(PaymentMode.upi, 'UPI', Icons.smartphone_rounded),
                _buildPaymentModeButton(PaymentMode.card, 'Card', Icons.credit_card_rounded),
                _buildPaymentModeButton(PaymentMode.bankTransfer, 'Bank', Icons.account_balance_rounded),
              ],
            ),
            SizedBox(height: Responsive.h(20)),

            // Amount
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'AMOUNT (₹)',
                  style: TextStyle(
                    fontSize: Responsive.sp(11),
                    fontWeight: FontWeight.w800,
                    color: Colors.grey[700],
                    letterSpacing: 0.5,
                  ),
                ),
                TextButton(
                  onPressed: () => _amountController.text = widget.amountDue.toStringAsFixed(0),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.green[50],
                    foregroundColor: Colors.green[700],
                    padding: Responsive.symmetric(horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'PAY FULL',
                    style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            SizedBox(height: Responsive.h(8)),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              onChanged: (_) => setState(() {}),
              style: TextStyle(fontSize: Responsive.sp(20), fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: '0',
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                  borderSide: BorderSide(color: _primary, width: 2),
                ),
                contentPadding: Responsive.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
            SizedBox(height: Responsive.h(20)),

            // Notes
            Text(
              'NOTES / REF ID (Optional)',
              style: TextStyle(
                fontSize: Responsive.sp(11),
                fontWeight: FontWeight.w800,
                color: Colors.grey[700],
                letterSpacing: 0.5,
              ),
            ),
            SizedBox(height: Responsive.h(8)),
            TextField(
              controller: _notesController,
              style: TextStyle(fontSize: Responsive.sp(14)),
              decoration: InputDecoration(
                hintText: 'E.g. UPI Ref #123456',
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Responsive.r(12)),
                  borderSide: BorderSide(color: _primary, width: 2),
                ),
                contentPadding: Responsive.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
            SizedBox(height: Responsive.h(24)),

            // Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: Responsive.symmetric(vertical: 14),
                      side: BorderSide(color: Colors.grey[300]!),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Responsive.r(12)),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                SizedBox(width: Responsive.w(12)),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green[600],
                      foregroundColor: Colors.white,
                      padding: Responsive.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Responsive.r(12)),
                      ),
                    ),
                    child: _isSubmitting
                        ? SizedBox(
                            height: Responsive.h(20),
                            width: Responsive.w(20),
                            child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text(
                            'Confirm Payment',
                            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentModeButton(PaymentMode mode, String label, IconData icon) {
    final isSelected = _selectedMode == mode;
    return InkWell(
      onTap: () => setState(() => _selectedMode = mode),
      borderRadius: BorderRadius.circular(Responsive.r(12)),
      child: Container(
        width: Responsive.w(75),
        padding: Responsive.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: isSelected ? _primary : Colors.grey[300]!),
        ),
        child: Column(
          children: [
            Icon(icon, size: Responsive.icon(24), color: isSelected ? Colors.white : Colors.grey[600]),
            SizedBox(height: Responsive.h(4)),
            Text(
              label,
              style: TextStyle(
                fontSize: Responsive.sp(11),
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
