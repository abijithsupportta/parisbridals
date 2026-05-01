import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../../branches/providers/branch_provider.dart';
import '../../customers/models/customer.dart';
import '../../products/models/product.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import 'customer_search_field.dart';
import 'product_search_field.dart';

/// Unified Create/Edit Order Form.
class OrderFormView extends ConsumerStatefulWidget {
  final Order? order;
  const OrderFormView({super.key, this.order});

  @override
  ConsumerState<OrderFormView> createState() => _OrderFormViewState();
}

class OrderItemEntry {
  String productId;
  String productName;
  int quantity;
  double pricePerDay;
  OrderItemEntry({required this.productId, required this.productName, this.quantity = 1, this.pricePerDay = 0});
}


class _OrderFormViewState extends ConsumerState<OrderFormView> {
  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  bool get _isEditing => widget.order != null;

  // Form state
  Customer? _selectedCustomer;
  final List<OrderItemEntry> _items = [];
  DateTime? _startDate;
  DateTime? _endDate;
  DateTime? _eventDate;
  DeliveryMethod _deliveryMethod = DeliveryMethod.pickup;
  final _notesController = TextEditingController();
  final _deliveryAddressController = TextEditingController();
  bool _collectAdvance = false;
  double _advanceAmount = 0;
  PaymentMethod _advancePaymentMethod = PaymentMethod.cash;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final o = widget.order!;
      // Pre-fill customer
      if (o.customer != null) {
        _selectedCustomer = Customer(
          id: o.customer!.id, storeId: '', name: o.customer!.name,
          phone: o.customer!.phone, createdAt: '', updatedAt: '',
        );
      }
      // Pre-fill items
      if (o.items != null) {
        for (final item in o.items!) {
          _items.add(OrderItemEntry(
            productId: item.productId,
            productName: 'Product #${item.productId.substring(0, 8)}',
            quantity: item.quantity,
            pricePerDay: item.pricePerDay,
          ));
        }
      }
      // Pre-fill dates
      _startDate = DateTime.tryParse(o.startDate);
      _endDate = DateTime.tryParse(o.endDate);
      _eventDate = DateTime.tryParse(o.eventDate);
      _deliveryMethod = o.deliveryMethod ?? DeliveryMethod.pickup;
      _notesController.text = o.notes ?? '';
      _deliveryAddressController.text = o.deliveryAddress ?? '';
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    _deliveryAddressController.dispose();
    super.dispose();
  }

  int get _rentalDays {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays.clamp(1, 365);
  }

  double get _subtotal => _items.fold(0.0, (sum, item) => sum + (item.pricePerDay * item.quantity * _rentalDays));
  double get _securityDeposit => _items.fold(0.0, (sum, item) => sum + (item.pricePerDay * item.quantity * 0.5));
  double get _total => _subtotal + _securityDeposit;

  Future<void> _pickDate(String label, DateTime? initial, ValueChanged<DateTime> onPicked) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: label,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(colorScheme: ColorScheme.light(primary: _primary, onPrimary: Colors.white, surface: Colors.white)),
        child: child!,
      ),
    );
    if (picked != null) onPicked(picked);
  }

  String _fmtDate(DateTime? d) => d != null ? DateFormat('dd MMM yyyy').format(d) : 'Select';

  Future<void> _submit() async {
    // Validation
    if (_selectedCustomer == null) { _showError('Please select a customer'); return; }
    if (_items.isEmpty) { _showError('Please add at least one product'); return; }
    if (_startDate == null) { _showError('Please select a start date'); return; }
    if (_endDate == null) { _showError('Please select an end date'); return; }
    if (_endDate!.isBefore(_startDate!)) { _showError('End date must be after start date'); return; }

    setState(() => _isSubmitting = true);

    final branchId = ref.read(effectiveBranchIdProvider);

    final body = <String, dynamic>{
      'customer_id': _selectedCustomer!.id,
      'branch_id': branchId,
      'rental_start_date': DateFormat('yyyy-MM-dd').format(_startDate!),
      'rental_end_date': DateFormat('yyyy-MM-dd').format(_endDate!),
      'items': _items.map((item) => {
        'product_id': item.productId,
        'quantity': item.quantity,
        'price_per_day': item.pricePerDay,
      }).toList(),
    };

    if (_eventDate != null) body['event_date'] = DateFormat('yyyy-MM-dd').format(_eventDate!);
    if (_notesController.text.trim().isNotEmpty) body['notes'] = _notesController.text.trim();
    body['delivery_method'] = _deliveryMethod == DeliveryMethod.delivery ? 'delivery' : 'pickup';
    if (_deliveryAddressController.text.trim().isNotEmpty) body['delivery_address'] = _deliveryAddressController.text.trim();
    if (_collectAdvance && _advanceAmount > 0) {
      body['advance_collected'] = true;
      body['advance_amount'] = _advanceAmount;
      body['advance_payment_method'] = _advancePaymentMethod.name;
    }

    try {
      if (_isEditing) {
        await ref.read(ordersProvider.notifier).updateOrder(widget.order!.id, body);
      } else {
        await ref.read(ordersProvider.notifier).createOrder(body);
      }
      if (mounted) {
        ref.invalidate(ordersProvider);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) _showError(e.toString());
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red[700]));
  }

  void _addProduct(Product p) {
    // Check if already added
    final existing = _items.where((i) => i.productId == p.id);
    if (existing.isNotEmpty) {
      setState(() => existing.first.quantity++);
      return;
    }
    setState(() => _items.add(OrderItemEntry(
      productId: p.id,
      productName: p.name,
      quantity: 1,
      pricePerDay: p.pricePerDay,
    )));
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final branchId = ref.watch(effectiveBranchIdProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(_isEditing ? 'Edit Order' : 'New Order', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: Responsive.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Customer
            _buildSection('Customer', child: CustomerSearchField(
              initialCustomer: _selectedCustomer,
              onSelected: (c) => setState(() => _selectedCustomer = c),
            )),

            SizedBox(height: Responsive.h(16)),

            // 2. Dates
            _buildSection('Rental Period', child: Column(
              children: [
                Row(children: [
                  Expanded(child: _buildDateTile('Start Date', _startDate, () => _pickDate('Start Date', _startDate, (d) => setState(() => _startDate = d)))),
                  SizedBox(width: Responsive.w(12)),
                  Expanded(child: _buildDateTile('End Date', _endDate, () => _pickDate('End Date', _endDate, (d) => setState(() => _endDate = d)))),
                ]),
                SizedBox(height: Responsive.h(10)),
                _buildDateTile('Event Date (optional)', _eventDate, () => _pickDate('Event Date', _eventDate, (d) => setState(() => _eventDate = d))),
                if (_rentalDays > 0) Padding(
                  padding: Responsive.only(top: 8),
                  child: Text('$_rentalDays day${_rentalDays > 1 ? 's' : ''} rental', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w700, color: _primary)),
                ),
              ],
            )),

            SizedBox(height: Responsive.h(16)),

            // 3. Products
            _buildSection('Order Items', child: Column(
              children: [
                ProductSearchField(branchId: branchId, onSelected: _addProduct),
                SizedBox(height: Responsive.h(10)),
                ..._items.asMap().entries.map((e) => _buildItemCard(e.key, e.value)),
                if (_items.isEmpty) Padding(
                  padding: Responsive.symmetric(vertical: 16),
                  child: Center(child: Text('No products added', style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]))),
                ),
              ],
            )),

            SizedBox(height: Responsive.h(16)),

            // 4. Delivery
            _buildSection('Delivery', child: Column(
              children: [
                Row(children: [
                  Expanded(child: _buildToggleButton('Pickup', DeliveryMethod.pickup, Icons.store_rounded)),
                  SizedBox(width: Responsive.w(10)),
                  Expanded(child: _buildToggleButton('Delivery', DeliveryMethod.delivery, Icons.local_shipping_rounded)),
                ]),
                if (_deliveryMethod == DeliveryMethod.delivery) ...[
                  SizedBox(height: Responsive.h(10)),
                  TextField(
                    controller: _deliveryAddressController,
                    maxLines: 2,
                    style: TextStyle(fontSize: Responsive.sp(13)),
                    decoration: InputDecoration(
                      hintText: 'Delivery address...',
                      filled: true, fillColor: Colors.grey[50],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
                      contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
              ],
            )),

            SizedBox(height: Responsive.h(16)),

            // 5. Notes
            _buildSection('Notes', child: TextField(
              controller: _notesController,
              maxLines: 3,
              style: TextStyle(fontSize: Responsive.sp(13)),
              decoration: InputDecoration(
                hintText: 'Any special instructions...',
                filled: true, fillColor: Colors.grey[50],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
                contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
              ),
            )),

            // 6. Advance Payment (create only)
            if (!_isEditing) ...[
              SizedBox(height: Responsive.h(16)),
              _buildSection('Advance Payment', child: Column(
                children: [
                  Row(children: [
                    Expanded(child: Text('Collect advance?', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600))),
                    Switch(value: _collectAdvance, onChanged: (v) => setState(() => _collectAdvance = v), activeTrackColor: _primary.withValues(alpha: 0.3), thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? _primary : Colors.grey)),
                  ]),
                  if (_collectAdvance) ...[
                    SizedBox(height: Responsive.h(10)),
                    TextField(
                      keyboardType: TextInputType.number,
                      onChanged: (v) => setState(() => _advanceAmount = double.tryParse(v) ?? 0),
                      style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        hintText: '0',
                        labelText: 'Amount (₹)',
                        filled: true, fillColor: Colors.grey[50],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
                        contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    SizedBox(height: Responsive.h(10)),
                    Wrap(spacing: Responsive.w(8), runSpacing: Responsive.h(8), children: [
                      _buildPaymentChip(PaymentMethod.cash, 'Cash', Icons.money),
                      _buildPaymentChip(PaymentMethod.upi, 'UPI', Icons.smartphone),
                      _buildPaymentChip(PaymentMethod.card, 'Card', Icons.credit_card),
                      _buildPaymentChip(PaymentMethod.bankTransfer, 'Bank', Icons.account_balance),
                    ]),
                  ],
                ],
              )),
            ],

            SizedBox(height: Responsive.h(16)),

            // 7. Price Summary
            if (_items.isNotEmpty && _rentalDays > 0) _buildPriceSummary(),

            SizedBox(height: Responsive.h(16)),

            // 8. Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _accent,
                  foregroundColor: _primary,
                  padding: Responsive.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(14))),
                  elevation: 2,
                ),
                child: _isSubmitting
                    ? SizedBox(width: Responsive.w(20), height: Responsive.h(20), child: const CircularProgressIndicator(strokeWidth: 2))
                    : Text(_isEditing ? 'Update Order' : 'Create Order', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w900)),
              ),
            ),
            SizedBox(height: Responsive.h(40)),
          ],
        ),
      ),
    );
  }

  // ── Helpers ──

  Widget _buildSection(String title, {required Widget child}) {
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
          Text(title.toUpperCase(), style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w900, color: _primary, letterSpacing: 1)),
          SizedBox(height: Responsive.h(12)),
          child,
        ],
      ),
    );
  }

  Widget _buildDateTile(String label, DateTime? date, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(Responsive.r(12)),
      child: Container(
        padding: Responsive.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: date != null ? const Color(0xFFF0F7FF) : Colors.grey[50],
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: date != null ? const Color(0xFF4A90D9) : Colors.grey[300]!),
        ),
        child: Row(children: [
          Icon(Icons.calendar_today_rounded, size: Responsive.icon(18), color: date != null ? const Color(0xFF4A90D9) : Colors.grey),
          SizedBox(width: Responsive.w(8)),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.w700, color: Colors.grey[600])),
              SizedBox(height: Responsive.h(2)),
              Text(_fmtDate(date), style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: date != null ? _primary : Colors.grey[400])),
            ],
          )),
        ]),
      ),
    );
  }

  Widget _buildItemCard(int index, OrderItemEntry item) {
    return Container(
      margin: Responsive.only(bottom: 8),
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(children: [
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.productName, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: _primary), maxLines: 1, overflow: TextOverflow.ellipsis),
            SizedBox(height: Responsive.h(4)),
            Text('₹${item.pricePerDay.toStringAsFixed(0)}/day', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
          ],
        )),
        // Quantity controls
        Container(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(10)), border: Border.all(color: Colors.grey[300]!)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            InkWell(
              onTap: () => setState(() { if (item.quantity > 1) item.quantity--; }),
              child: Padding(padding: Responsive.all(6), child: Icon(Icons.remove, size: Responsive.icon(16))),
            ),
            Padding(
              padding: Responsive.symmetric(horizontal: 8),
              child: Text('${item.quantity}', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)),
            ),
            InkWell(
              onTap: () => setState(() => item.quantity++),
              child: Padding(padding: Responsive.all(6), child: Icon(Icons.add, size: Responsive.icon(16))),
            ),
          ]),
        ),
        SizedBox(width: Responsive.w(8)),
        InkWell(
          onTap: () => setState(() => _items.removeAt(index)),
          child: Icon(Icons.delete_outline, size: Responsive.icon(20), color: Colors.red[400]),
        ),
      ]),
    );
  }

  Widget _buildToggleButton(String label, DeliveryMethod method, IconData icon) {
    final isActive = _deliveryMethod == method;
    return InkWell(
      onTap: () => setState(() => _deliveryMethod = method),
      borderRadius: BorderRadius.circular(Responsive.r(12)),
      child: Container(
        padding: Responsive.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isActive ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: isActive ? _primary : Colors.grey[300]!),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: Responsive.icon(20), color: isActive ? Colors.white : Colors.grey[600]),
          SizedBox(width: Responsive.w(6)),
          Text(label, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold, color: isActive ? Colors.white : Colors.grey[700])),
        ]),
      ),
    );
  }

  Widget _buildPaymentChip(PaymentMethod method, String label, IconData icon) {
    final isActive = _advancePaymentMethod == method;
    return InkWell(
      onTap: () => setState(() => _advancePaymentMethod = method),
      borderRadius: BorderRadius.circular(Responsive.r(10)),
      child: Container(
        padding: Responsive.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(10)),
          border: Border.all(color: isActive ? _primary : Colors.grey[300]!),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: Responsive.icon(16), color: isActive ? Colors.white : Colors.grey[600]),
          SizedBox(width: Responsive.w(4)),
          Text(label, style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.bold, color: isActive ? Colors.white : Colors.grey[700])),
        ]),
      ),
    );
  }

  Widget _buildPriceSummary() {
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
          Text('PRICE SUMMARY', style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w900, color: _primary, letterSpacing: 1)),
          SizedBox(height: Responsive.h(12)),
          _summaryRow('Subtotal ($_rentalDays days)', '₹${_subtotal.toStringAsFixed(0)}'),
          SizedBox(height: Responsive.h(6)),
          _summaryRow('Security Deposit', '₹${_securityDeposit.toStringAsFixed(0)}'),
          Divider(height: Responsive.h(20), thickness: 2),
          _summaryRow('Estimated Total', '₹${_total.toStringAsFixed(0)}', isBold: true),
          if (_collectAdvance && _advanceAmount > 0) ...[
            SizedBox(height: Responsive.h(6)),
            _summaryRow('Advance', '- ₹${_advanceAmount.toStringAsFixed(0)}', color: Colors.green[700]),
          ],
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool isBold = false, Color? color}) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: Responsive.sp(isBold ? 14 : 13), fontWeight: isBold ? FontWeight.w900 : FontWeight.w600, color: color ?? Colors.grey[700])),
      Text(value, style: TextStyle(fontSize: Responsive.sp(isBold ? 14 : 13), fontWeight: isBold ? FontWeight.w900 : FontWeight.w600, color: color ?? _primary)),
    ]);
  }
}
