enum OrderStatus {
  pending,
  confirmed,
  scheduled,
  delivered,
  inUse,
  ongoing,
  partial,
  returned,
  completed,
  cancelled,
  flagged,
  lateReturn,
}

enum PaymentStatus {
  pending,
  partial,
  paid,
}

enum PaymentMethod {
  cash,
  upi,
  bankTransfer,
  card,
  other,
}

enum ConditionRating {
  excellent,
  good,
  fair,
  damaged,
}

enum DeliveryMethod {
  pickup,
  delivery,
}

class OrderItem {
  final String id;
  final String orderId;
  final String productId;
  final int quantity;
  final double pricePerDay;
  final double totalPrice;
  final double subtotal;
  final ConditionRating? conditionRating;
  final String? damageDescription;
  final double? damageCharges;
  final bool? isReturned;
  final String? returnedAt;
  final int? returnedQuantity;
  final String createdAt;

  OrderItem({
    required this.id,
    required this.orderId,
    required this.productId,
    required this.quantity,
    required this.pricePerDay,
    required this.totalPrice,
    required this.subtotal,
    this.conditionRating,
    this.damageDescription,
    this.damageCharges,
    this.isReturned,
    this.returnedAt,
    this.returnedQuantity,
    required this.createdAt,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      productId: json['product_id'] as String,
      quantity: json['quantity'] as int,
      pricePerDay: (json['price_per_day'] as num?)?.toDouble() ?? 0.0,
      totalPrice: (json['total_price'] as num?)?.toDouble() ?? 0.0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      conditionRating: json['condition_rating'] != null
          ? _parseConditionRating(json['condition_rating'] as String)
          : null,
      damageDescription: json['damage_description'] as String?,
      damageCharges: (json['damage_charges'] as num?)?.toDouble(),
      isReturned: json['is_returned'] as bool?,
      returnedAt: json['returned_at'] as String?,
      returnedQuantity: json['returned_quantity'] as int?,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  static ConditionRating _parseConditionRating(String value) {
    switch (value.toLowerCase()) {
      case 'excellent':
        return ConditionRating.excellent;
      case 'good':
        return ConditionRating.good;
      case 'fair':
        return ConditionRating.fair;
      case 'damaged':
        return ConditionRating.damaged;
      default:
        return ConditionRating.good;
    }
  }

  String _conditionRatingToString() {
    switch (conditionRating) {
      case ConditionRating.excellent:
        return 'excellent';
      case ConditionRating.good:
        return 'good';
      case ConditionRating.fair:
        return 'fair';
      case ConditionRating.damaged:
        return 'damaged';
      case null:
        return '';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_id': orderId,
      'product_id': productId,
      'quantity': quantity,
      'price_per_day': pricePerDay,
      'total_price': totalPrice,
      'subtotal': subtotal,
      'condition_rating': _conditionRatingToString(),
      'damage_description': damageDescription,
      'damage_charges': damageCharges,
      'is_returned': isReturned,
      'returned_at': returnedAt,
      'returned_quantity': returnedQuantity,
      'created_at': createdAt,
    };
  }
}

class Order {
  final String id;
  final String storeId;
  final String customerId;
  final String branchId;
  final OrderStatus status;
  final String startDate;
  final String endDate;
  final String eventDate;
  final double totalAmount;
  final double subtotal;
  final double gstAmount;
  final double securityDeposit;
  final double amountPaid;
  final PaymentStatus paymentStatus;
  final String? notes;
  final bool? depositCollected;
  final String? depositCollectedAt;
  final PaymentMethod? depositPaymentMethod;
  final bool depositReturned;
  final String? depositReturnedAt;
  final DeliveryMethod? deliveryMethod;
  final String? deliveryAddress;
  final String? pickupAddress;
  final double lateFee;
  final double discount;
  final double damageChargesTotal;
  final String createdAt;
  final String? updatedAt;
  final CustomerInfo? customer;
  final List<OrderItem>? items;
  final BranchInfo? branch;

  Order({
    required this.id,
    required this.storeId,
    required this.customerId,
    required this.branchId,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.eventDate,
    required this.totalAmount,
    required this.subtotal,
    required this.gstAmount,
    required this.securityDeposit,
    required this.amountPaid,
    required this.paymentStatus,
    this.notes,
    this.depositCollected,
    this.depositCollectedAt,
    this.depositPaymentMethod,
    required this.depositReturned,
    this.depositReturnedAt,
    this.deliveryMethod,
    this.deliveryAddress,
    this.pickupAddress,
    required this.lateFee,
    required this.discount,
    required this.damageChargesTotal,
    required this.createdAt,
    this.updatedAt,
    this.customer,
    this.items,
    this.branch,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      storeId: json['store_id'] as String,
      customerId: json['customer_id'] as String,
      branchId: json['branch_id'] as String,
      status: _parseOrderStatus(json['status'] as String),
      startDate: json['start_date'] as String,
      endDate: json['end_date'] as String,
      eventDate: json['event_date'] as String,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      gstAmount: (json['gst_amount'] as num?)?.toDouble() ?? 0.0,
      securityDeposit: (json['security_deposit'] as num?)?.toDouble() ?? 0.0,
      amountPaid: (json['amount_paid'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: _parsePaymentStatus(json['payment_status'] as String),
      notes: json['notes'] as String?,
      depositCollected: json['deposit_collected'] as bool?,
      depositCollectedAt: json['deposit_collected_at'] as String?,
      depositPaymentMethod: json['deposit_payment_method'] != null
          ? _parsePaymentMethod(json['deposit_payment_method'] as String)
          : null,
      depositReturned: json['deposit_returned'] as bool? ?? false,
      depositReturnedAt: json['deposit_returned_at'] as String?,
      deliveryMethod: json['delivery_method'] != null
          ? _parseDeliveryMethod(json['delivery_method'] as String)
          : null,
      deliveryAddress: json['delivery_address'] as String?,
      pickupAddress: json['pickup_address'] as String?,
      lateFee: (json['late_fee'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
      damageChargesTotal: (json['damage_charges_total'] as num?)?.toDouble() ?? 0.0,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String?,
      customer: json['customer'] != null ? CustomerInfo.fromJson(json['customer']) : null,
      items: (json['items'] as List<dynamic>?)
          ?.map((e) => OrderItem.fromJson(e))
          .toList(),
      branch: json['branch'] != null ? BranchInfo.fromJson(json['branch']) : null,
    );
  }

  static OrderStatus _parseOrderStatus(String value) {
    switch (value.toLowerCase()) {
      case 'pending':
        return OrderStatus.pending;
      case 'confirmed':
        return OrderStatus.confirmed;
      case 'scheduled':
        return OrderStatus.scheduled;
      case 'delivered':
        return OrderStatus.delivered;
      case 'in_use':
        return OrderStatus.inUse;
      case 'ongoing':
        return OrderStatus.ongoing;
      case 'partial':
        return OrderStatus.partial;
      case 'returned':
        return OrderStatus.returned;
      case 'completed':
        return OrderStatus.completed;
      case 'cancelled':
        return OrderStatus.cancelled;
      case 'flagged':
        return OrderStatus.flagged;
      case 'late_return':
        return OrderStatus.lateReturn;
      default:
        return OrderStatus.pending;
    }
  }

  static PaymentStatus _parsePaymentStatus(String value) {
    switch (value.toLowerCase()) {
      case 'pending':
        return PaymentStatus.pending;
      case 'partial':
        return PaymentStatus.partial;
      case 'paid':
        return PaymentStatus.paid;
      default:
        return PaymentStatus.pending;
    }
  }

  static PaymentMethod _parsePaymentMethod(String value) {
    switch (value.toLowerCase()) {
      case 'cash':
        return PaymentMethod.cash;
      case 'upi':
        return PaymentMethod.upi;
      case 'bank_transfer':
        return PaymentMethod.bankTransfer;
      case 'card':
        return PaymentMethod.card;
      case 'other':
        return PaymentMethod.other;
      default:
        return PaymentMethod.other;
    }
  }

  static DeliveryMethod _parseDeliveryMethod(String value) {
    switch (value.toLowerCase()) {
      case 'pickup':
        return DeliveryMethod.pickup;
      case 'delivery':
        return DeliveryMethod.delivery;
      default:
        return DeliveryMethod.pickup;
    }
  }

  String _orderStatusToString() {
    switch (status) {
      case OrderStatus.pending:
        return 'pending';
      case OrderStatus.confirmed:
        return 'confirmed';
      case OrderStatus.scheduled:
        return 'scheduled';
      case OrderStatus.delivered:
        return 'delivered';
      case OrderStatus.inUse:
        return 'in_use';
      case OrderStatus.ongoing:
        return 'ongoing';
      case OrderStatus.partial:
        return 'partial';
      case OrderStatus.returned:
        return 'returned';
      case OrderStatus.completed:
        return 'completed';
      case OrderStatus.cancelled:
        return 'cancelled';
      case OrderStatus.flagged:
        return 'flagged';
      case OrderStatus.lateReturn:
        return 'late_return';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'store_id': storeId,
      'customer_id': customerId,
      'branch_id': branchId,
      'status': _orderStatusToString(),
      'start_date': startDate,
      'end_date': endDate,
      'event_date': eventDate,
      'total_amount': totalAmount,
      'subtotal': subtotal,
      'gst_amount': gstAmount,
      'security_deposit': securityDeposit,
      'amount_paid': amountPaid,
      'payment_status': paymentStatus.name,
      'notes': notes,
      'deposit_collected': depositCollected,
      'deposit_collected_at': depositCollectedAt,
      'deposit_payment_method': depositPaymentMethod?.name,
      'deposit_returned': depositReturned,
      'deposit_returned_at': depositReturnedAt,
      'delivery_method': deliveryMethod?.name,
      'delivery_address': deliveryAddress,
      'pickup_address': pickupAddress,
      'late_fee': lateFee,
      'discount': discount,
      'damage_charges_total': damageChargesTotal,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'customer': customer?.toJson(),
      'items': items?.map((e) => e.toJson()).toList(),
      'branch': branch?.toJson(),
    };
  }
}

class CustomerInfo {
  final String id;
  final String name;
  final String phone;
  final String? email;

  CustomerInfo({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
  });

  factory CustomerInfo.fromJson(Map<String, dynamic> json) {
    return CustomerInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
    };
  }
}

class BranchInfo {
  final String id;
  final String name;

  BranchInfo({
    required this.id,
    required this.name,
  });

  factory BranchInfo.fromJson(Map<String, dynamic> json) {
    return BranchInfo(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
    };
  }
}
