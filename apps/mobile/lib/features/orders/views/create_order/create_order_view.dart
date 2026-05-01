import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/enums.dart';
import '../../../../core/responsive.dart';
import '../../../branches/providers/branch_provider.dart';
import '../../../customers/models/customer.dart';
import '../../../products/models/product.dart';
import '../../models/order.dart';
import '../../providers/order_provider.dart';

import 'step_customer.dart';
import 'step_rental_period.dart';
import 'step_products.dart';
import 'step_payment.dart';

/// Cart item used across steps.
class CartItem {
  final Product product;
  int quantity;
  bool? isAvailable;
  int? availableQty;

  CartItem({
    required this.product,
    this.quantity = 1,
    this.isAvailable,
    this.availableQty,
  });

  double get lineTotal => product.pricePerDay * quantity;
}

/// 4-step Create Order flow.
class CreateOrderView extends ConsumerStatefulWidget {
  const CreateOrderView({super.key});

  @override
  ConsumerState<CreateOrderView> createState() => _CreateOrderViewState();
}

class _CreateOrderViewState extends ConsumerState<CreateOrderView> {
  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  final _pageController = PageController();
  int _currentStep = 0;

  // Step 1
  Customer? _selectedCustomer;

  // Step 2
  DateTime? _startDate;
  DateTime? _endDate;
  DateTime? _eventDate;
  TimeOfDay _pickupTime = const TimeOfDay(hour: 10, minute: 0);
  TimeOfDay _returnTime = const TimeOfDay(hour: 18, minute: 0);
  DeliveryMethod _deliveryMethod = DeliveryMethod.pickup;
  final _deliveryAddressController = TextEditingController();

  // Step 3
  final List<CartItem> _cart = [];

  // Step 4
  bool _collectDeposit = false;
  bool _collectAdvance = false;
  double _advanceAmount = 0;
  double _securityDeposit = 0;
  PaymentMethod _depositPaymentMethod = PaymentMethod.cash;
  PaymentMethod _advancePaymentMethod = PaymentMethod.cash;
  final _notesController = TextEditingController();

  bool _isSubmitting = false;

  String _formatTime(TimeOfDay time) {
    final hh = time.hour.toString().padLeft(2, '0');
    final mm = time.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  double get _subtotal => _cart.fold(0.0, (s, i) => s + i.lineTotal);

  bool get _canProceed {
    switch (_currentStep) {
      case 0:
        return _selectedCustomer != null;
      case 1:
        return _startDate != null &&
            _endDate != null &&
            !_endDate!.isBefore(_startDate!);
      case 2:
        return _cart.isNotEmpty;
      case 3:
        return true;
      default:
        return false;
    }
  }

  void _goNext() {
    if (_currentStep < 3 && _canProceed) {
      setState(() => _currentStep++);
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _goBack() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pop(context);
    }
  }

  void _addToCart(Product p) {
    final existing = _cart.where((i) => i.product.id == p.id);
    if (existing.isNotEmpty) {
      setState(() => existing.first.quantity++);
    } else {
      setState(() => _cart.add(CartItem(product: p)));
    }
    _checkAvailability();
  }

  void _updateQty(int index, int delta) {
    setState(() {
      _cart[index].quantity += delta;
      if (_cart[index].quantity <= 0) {
        _cart.removeAt(index);
      }
    });
    _checkAvailability();
  }

  void _removeFromCart(int index) {
    setState(() => _cart.removeAt(index));
  }

  Future<void> _checkAvailability() async {
    if (_startDate == null || _endDate == null || _cart.isEmpty) return;
    final branchId = ref.read(effectiveBranchIdProvider);
    if (branchId == null) return;

    try {
      final repo = ref.read(orderRepositoryProvider);
      final result = await repo.checkStockAvailability(
        items: _cart
            .map((c) => {'product_id': c.product.id, 'quantity': c.quantity})
            .toList(),
        startDate: DateFormat('yyyy-MM-dd').format(_startDate!),
        endDate: DateFormat('yyyy-MM-dd').format(_endDate!),
        branchId: branchId,
      );
      if (mounted) {
        final itemResults = result['items'] as List?;
        if (itemResults != null) {
          setState(() {
            for (int i = 0; i < _cart.length && i < itemResults.length; i++) {
              final r = itemResults[i] as Map<String, dynamic>;
              _cart[i].isAvailable = r['isAvailable'] == true;
              _cart[i].availableQty = r['available'] as int?;
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to check stock availability: ${e.toString().replaceFirst('Exception: ', '')}',
            ),
            backgroundColor: Colors.red[700],
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    final branchId = ref.read(effectiveBranchIdProvider);

    // Validate required fields
    if (_selectedCustomer?.id == null || branchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Missing customer or branch information'),
          backgroundColor: Colors.red,
        ),
      );
      setState(() => _isSubmitting = false);
      return;
    }

    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No items in cart'),
          backgroundColor: Colors.red,
        ),
      );
      setState(() => _isSubmitting = false);
      return;
    }

    if (_deliveryMethod == DeliveryMethod.delivery &&
        _deliveryAddressController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Delivery address is required'),
          backgroundColor: Colors.red,
        ),
      );
      setState(() => _isSubmitting = false);
      return;
    }

    final body = <String, dynamic>{
      'customer_id': _selectedCustomer!.id,
      'branch_id': branchId,
      'rental_start_date': DateFormat('yyyy-MM-dd').format(_startDate!),
      'rental_end_date': DateFormat('yyyy-MM-dd').format(_endDate!),
      if (_eventDate != null)
        'event_date': DateFormat('yyyy-MM-dd').format(_eventDate!),
      'items': _cart
          .map(
            (c) => <String, dynamic>{
              'product_id': c.product.id,
              'quantity': c.quantity,
              'price_per_day': c.product.pricePerDay,
            },
          )
          .toList(),
      'pickup_time': _formatTime(_pickupTime),
      'return_time': _formatTime(_returnTime),
      'delivery_method': _deliveryMethod.name,
      if (_deliveryMethod == DeliveryMethod.delivery)
        'delivery_address': _deliveryAddressController.text.trim(),
    };

    if (_collectDeposit && _securityDeposit > 0) {
      body['security_deposit'] = _securityDeposit;
      body['deposit_collected'] = true;
      body['deposit_payment_method'] = _depositPaymentMethod.name;
    }
    if (_notesController.text.trim().isNotEmpty) {
      body['notes'] = _notesController.text.trim();
    }
    if (_collectAdvance && _advanceAmount > 0) {
      body['advance_collected'] = true;
      body['advance_amount'] = _advanceAmount;
      body['advance_payment_method'] = _advancePaymentMethod.name;
    }

    try {
      await ref.read(ordersProvider.notifier).createOrder(body);
      if (mounted) {
        ref.invalidate(ordersProvider);
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Order created successfully!'),
            backgroundColor: Colors.green[700],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _notesController.dispose();
    _deliveryAddressController.dispose();
    super.dispose();
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _goBack,
        ),
        title: Text(
          'New Order',
          style: TextStyle(
            fontSize: Responsive.sp(16),
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(Responsive.h(56)),
          child: _buildStepIndicator(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                StepCustomer(
                  selected: _selectedCustomer,
                  onSelected: (c) => setState(() => _selectedCustomer = c),
                ),
                StepRentalPeriod(
                  startDate: _startDate,
                  endDate: _endDate,
                  eventDate: _eventDate,
                  pickupTime: _pickupTime,
                  returnTime: _returnTime,
                  deliveryMethod: _deliveryMethod,
                  deliveryAddressController: _deliveryAddressController,
                  onStartChanged: (d) {
                    setState(() {
                      _startDate = d;
                      if (_endDate != null && _endDate!.isBefore(d)) {
                        _endDate = d.add(const Duration(days: 3));
                      }
                    });
                    _checkAvailability();
                  },
                  onEndChanged: (d) {
                    setState(() => _endDate = d);
                    _checkAvailability();
                  },
                  onEventChanged: (d) => setState(() => _eventDate = d),
                  onPickupTimeChanged: (t) => setState(() => _pickupTime = t),
                  onReturnTimeChanged: (t) => setState(() => _returnTime = t),
                  onDeliveryMethodChanged: (m) =>
                      setState(() => _deliveryMethod = m),
                ),
                StepProducts(
                  branchId: branchId,
                  cart: _cart,
                  onAddProduct: _addToCart,
                  onUpdateQty: _updateQty,
                  onRemove: _removeFromCart,
                ),
                StepPayment(
                  subtotal: _subtotal,
                  collectDeposit: _collectDeposit,
                  securityDeposit: _securityDeposit,
                  depositPaymentMethod: _depositPaymentMethod,
                  collectAdvance: _collectAdvance,
                  advanceAmount: _advanceAmount,
                  advancePaymentMethod: _advancePaymentMethod,
                  notesController: _notesController,
                  cart: _cart,
                  onCollectDepositChanged: (v) => setState(() {
                    _collectDeposit = v;
                    if (!v) _securityDeposit = 0;
                  }),
                  onSecurityDepositChanged: (v) =>
                      setState(() => _securityDeposit = v),
                  onDepositPaymentMethodChanged: (m) =>
                      setState(() => _depositPaymentMethod = m),
                  onCollectAdvanceChanged: (v) => setState(() {
                    _collectAdvance = v;
                    if (!v) _advanceAmount = 0;
                  }),
                  onAdvanceChanged: (v) => setState(() => _advanceAmount = v),
                  onAdvancePaymentMethodChanged: (m) =>
                      setState(() => _advancePaymentMethod = m),
                ),
              ],
            ),
          ),
          _buildBottomBar(),
        ],
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Container(
      padding: Responsive.only(left: 16, right: 16, bottom: 12),
      child: Row(
        children: List.generate(4, (i) {
          final isActive = i == _currentStep;
          final isDone = i < _currentStep;
          return Expanded(
            child: Row(
              children: [
                if (i > 0)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: isDone ? _accent : Colors.white24,
                    ),
                  ),
                Container(
                  width: Responsive.w(28),
                  height: Responsive.w(28),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isDone
                        ? _accent
                        : (isActive ? Colors.white : Colors.white24),
                  ),
                  child: Center(
                    child: isDone
                        ? Icon(
                            Icons.check,
                            size: Responsive.icon(14),
                            color: _primary,
                          )
                        : Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontSize: Responsive.sp(11),
                              fontWeight: FontWeight.bold,
                              color: isActive ? _primary : Colors.white70,
                            ),
                          ),
                  ),
                ),
                if (i < 3) const SizedBox(),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: Responsive.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: _goBack,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _primary,
                    side: BorderSide(color: Colors.grey[300]!),
                    padding: Responsive.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Responsive.r(12)),
                    ),
                  ),
                  child: Text(
                    'Back',
                    style: TextStyle(
                      fontSize: Responsive.sp(14),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            if (_currentStep > 0) SizedBox(width: Responsive.w(12)),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: (_canProceed && !_isSubmitting)
                    ? (_currentStep == 3 ? _submit : _goNext)
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _currentStep == 3
                      ? const Color(0xFF2ECC71)
                      : _accent,
                  foregroundColor: _currentStep == 3 ? Colors.white : _primary,
                  disabledBackgroundColor: Colors.grey[300],
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Responsive.r(12)),
                  ),
                  elevation: 2,
                ),
                child: _isSubmitting
                    ? SizedBox(
                        width: Responsive.w(20),
                        height: Responsive.w(20),
                        child: const CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        _currentStep == 3 ? 'Create Order' : 'Continue',
                        style: TextStyle(
                          fontSize: Responsive.sp(15),
                          fontWeight: FontWeight.w900,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
