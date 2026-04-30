import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';

class OrderFormView extends ConsumerStatefulWidget {
  final Order? order;

  const OrderFormView({super.key, this.order});

  @override
  ConsumerState<OrderFormView> createState() => _OrderFormViewState();
}

class _OrderFormViewState extends ConsumerState<OrderFormView> {
  final _formKey = GlobalKey<FormState>();
  final _customerIdController = TextEditingController();
  final _branchIdController = TextEditingController();
  final _startDateController = TextEditingController();
  final _endDateController = TextEditingController();
  final _eventDateController = TextEditingController();
  final _notesController = TextEditingController();
  final _deliveryAddressController = TextEditingController();
  final _pickupAddressController = TextEditingController();
  final _securityDepositController = TextEditingController(text: '0');
  final _amountPaidController = TextEditingController(text: '0');
  final _discountController = TextEditingController(text: '0');
  OrderStatus? _selectedStatus = OrderStatus.pending;
  PaymentStatus? _selectedPaymentStatus = PaymentStatus.pending;
  DeliveryMethod? _selectedDeliveryMethod = DeliveryMethod.pickup;
  final List<OrderItemInput> _items = [];

  @override
  void initState() {
    super.initState();
    if (widget.order != null) {
      _customerIdController.text = widget.order!.customerId;
      _branchIdController.text = widget.order!.branchId;
      _startDateController.text = widget.order!.startDate;
      _endDateController.text = widget.order!.endDate;
      _eventDateController.text = widget.order!.eventDate;
      _notesController.text = widget.order!.notes ?? '';
      _deliveryAddressController.text = widget.order!.deliveryAddress ?? '';
      _pickupAddressController.text = widget.order!.pickupAddress ?? '';
      _securityDepositController.text = widget.order!.securityDeposit.toString();
      _amountPaidController.text = widget.order!.amountPaid.toString();
      _discountController.text = widget.order!.discount.toString();
      _selectedStatus = widget.order!.status;
      _selectedPaymentStatus = widget.order!.paymentStatus;
      _selectedDeliveryMethod = widget.order!.deliveryMethod;
      if (widget.order!.items != null) {
        _items.addAll(widget.order!.items!.map((item) => OrderItemInput(
          productId: item.productId,
          quantity: item.quantity,
          pricePerDay: item.pricePerDay,
        )));
      }
    }
  }

  @override
  void dispose() {
    _customerIdController.dispose();
    _branchIdController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    _eventDateController.dispose();
    _notesController.dispose();
    _deliveryAddressController.dispose();
    _pickupAddressController.dispose();
    _securityDepositController.dispose();
    _amountPaidController.dispose();
    _discountController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(TextEditingController controller) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null && mounted) {
      controller.text = picked.toIso8601String();
    }
  }

  void _addItem() {
    setState(() {
      _items.add(OrderItemInput());
    });
  }

  void _removeItem(int index) {
    setState(() {
      _items.removeAt(index);
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final body = {
      'customer_id': _customerIdController.text.trim(),
      'branch_id': _branchIdController.text.trim(),
      'rental_start_date': _startDateController.text,
      'rental_end_date': _endDateController.text,
      'event_date': _eventDateController.text,
      'delivery_method': _selectedDeliveryMethod?.name,
      'delivery_address': _deliveryAddressController.text.trim().isEmpty ? null : _deliveryAddressController.text.trim(),
      'pickup_address': _pickupAddressController.text.trim().isEmpty ? null : _pickupAddressController.text.trim(),
      'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      'items': _items.where((item) => item.productId.isNotEmpty).map((item) => {
        'product_id': item.productId,
        'quantity': item.quantity,
        'price_per_day': item.pricePerDay,
      }).toList(),
      'store_id': 'default-store-id', // TODO: Get from auth context
    };

    if (widget.order != null) {
      body.addAll({
        'status': _selectedStatus?.name,
        'security_deposit': double.tryParse(_securityDepositController.text) ?? 0,
        'amount_paid': double.tryParse(_amountPaidController.text) ?? 0,
        'payment_status': _selectedPaymentStatus?.name,
        'discount': double.tryParse(_discountController.text) ?? 0,
      });
    }

    try {
      if (widget.order != null) {
        await ref.read(orderOperationsProvider).updateOrder(widget.order!.id, body);
      } else {
        await ref.read(orderOperationsProvider).createOrder(body);
      }

      if (mounted) {
        ref.invalidate(ordersProvider);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.order != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Order' : 'Create Order'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _customerIdController,
                decoration: const InputDecoration(
                  labelText: 'Customer ID',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Customer ID is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _branchIdController,
                decoration: const InputDecoration(
                  labelText: 'Branch ID',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Branch ID is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _startDateController,
                decoration: const InputDecoration(
                  labelText: 'Start Date',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                readOnly: true,
                onTap: () => _selectDate(_startDateController),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Start date is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _endDateController,
                decoration: const InputDecoration(
                  labelText: 'End Date',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                readOnly: true,
                onTap: () => _selectDate(_endDateController),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'End date is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _eventDateController,
                decoration: const InputDecoration(
                  labelText: 'Event Date',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                readOnly: true,
                onTap: () => _selectDate(_eventDateController),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Event date is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<DeliveryMethod>(
                initialValue: _selectedDeliveryMethod,
                decoration: const InputDecoration(
                  labelText: 'Delivery Method',
                  border: OutlineInputBorder(),
                ),
                items: DeliveryMethod.values.map((method) {
                  return DropdownMenuItem(
                    value: method,
                    child: Text(method.name[0].toUpperCase() + method.name.substring(1)),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedDeliveryMethod = value;
                  });
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _deliveryAddressController,
                decoration: const InputDecoration(
                  labelText: 'Delivery Address',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _pickupAddressController,
                decoration: const InputDecoration(
                  labelText: 'Pickup Address',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              const Text(
                'Order Items',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ..._items.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        TextFormField(
                          initialValue: item.productId,
                          decoration: const InputDecoration(
                            labelText: 'Product ID',
                            border: OutlineInputBorder(),
                          ),
                          onChanged: (value) {
                            item.productId = value;
                          },
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: item.quantity.toString(),
                          decoration: const InputDecoration(
                            labelText: 'Quantity',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (value) {
                            item.quantity = int.tryParse(value) ?? 0;
                          },
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: item.pricePerDay.toString(),
                          decoration: const InputDecoration(
                            labelText: 'Price per Day',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (value) {
                            item.pricePerDay = double.tryParse(value) ?? 0;
                          },
                        ),
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: () => _removeItem(index),
                            icon: const Icon(Icons.delete, color: Colors.red),
                            label: const Text('Remove Item', style: TextStyle(color: Colors.red)),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              TextButton.icon(
                onPressed: _addItem,
                icon: const Icon(Icons.add),
                label: const Text('Add Item'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              if (isEditing) ...[
                const SizedBox(height: 16),
                DropdownButtonFormField<OrderStatus>(
                  initialValue: _selectedStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                  ),
                  items: OrderStatus.values.map((status) {
                    return DropdownMenuItem(
                      value: status,
                      child: Text(status.name.split('_').map((e) => e[0].toUpperCase() + e.substring(1)).join(' ')),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedStatus = value;
                    });
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<PaymentStatus>(
                  initialValue: _selectedPaymentStatus,
                  decoration: const InputDecoration(
                    labelText: 'Payment Status',
                    border: OutlineInputBorder(),
                  ),
                  items: PaymentStatus.values.map((status) {
                    return DropdownMenuItem(
                      value: status,
                      child: Text(status.name[0].toUpperCase() + status.name.substring(1)),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedPaymentStatus = value;
                    });
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _securityDepositController,
                  decoration: const InputDecoration(
                    labelText: 'Security Deposit',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _amountPaidController,
                  decoration: const InputDecoration(
                    labelText: 'Amount Paid',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _discountController,
                  decoration: const InputDecoration(
                    labelText: 'Discount',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: Text(isEditing ? 'Update Order' : 'Create Order'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OrderItemInput {
  String productId = '';
  int quantity = 1;
  double pricePerDay = 0.0;

  OrderItemInput({this.productId = '', this.quantity = 1, this.pricePerDay = 0.0});
}
