/// Payment domain models for Paris Bridals mobile app.
///
/// Contains Payment and CreatePaymentDTO classes with enums for payment types
/// (deposit, advance, final, refund) and payment modes (cash, UPI, card, etc.).
///
/// @module features/orders/models/payment
library;

/// Helper methods for payment type and mode conversions
class PaymentHelpers {
  static String paymentTypeToString(PaymentType type) {
    switch (type) {
      case PaymentType.deposit:
        return 'deposit';
      case PaymentType.advance:
        return 'advance';
      case PaymentType.final_:
        return 'final';
      case PaymentType.refund:
        return 'refund';
      case PaymentType.adjustment:
        return 'adjustment';
      case PaymentType.depositRefund:
        return 'deposit_refund';
    }
  }

  static String paymentModeToString(PaymentMode mode) {
    switch (mode) {
      case PaymentMode.cash:
        return 'cash';
      case PaymentMode.upi:
        return 'upi';
      case PaymentMode.card:
        return 'card';
      case PaymentMode.bankTransfer:
        return 'bank_transfer';
      case PaymentMode.cheque:
        return 'cheque';
    }
  }
}

enum PaymentType {
  deposit,
  advance,
  final_,
  refund,
  adjustment,
  depositRefund,
}

enum PaymentMode {
  cash,
  upi,
  card,
  bankTransfer,
  cheque,
}

class Payment {
  final String id;
  final String orderId;
  final PaymentType paymentType;
  final double amount;
  final PaymentMode paymentMode;
  final String? transactionId;
  final String paymentDate;
  final String? notes;
  final String? createdBy;
  final String createdAt;
  final String? updatedAt;

  Payment({
    required this.id,
    required this.orderId,
    required this.paymentType,
    required this.amount,
    required this.paymentMode,
    this.transactionId,
    required this.paymentDate,
    this.notes,
    this.createdBy,
    required this.createdAt,
    this.updatedAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'] as String? ?? '',
      orderId: json['order_id'] as String? ?? '',
      paymentType: _parsePaymentType(json['payment_type'] as String),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMode: _parsePaymentMode(json['payment_mode'] as String),
      transactionId: json['transaction_id'] as String?,
      paymentDate: json['payment_date'] as String? ?? '',
      notes: json['notes'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String?,
    );
  }

  static PaymentType _parsePaymentType(String value) {
    switch (value.toLowerCase()) {
      case 'deposit':
        return PaymentType.deposit;
      case 'advance':
        return PaymentType.advance;
      case 'final':
        return PaymentType.final_;
      case 'refund':
        return PaymentType.refund;
      case 'adjustment':
        return PaymentType.adjustment;
      case 'deposit_refund':
        return PaymentType.depositRefund;
      default:
        return PaymentType.final_;
    }
  }

  static PaymentMode _parsePaymentMode(String value) {
    switch (value.toLowerCase()) {
      case 'cash':
        return PaymentMode.cash;
      case 'upi':
        return PaymentMode.upi;
      case 'card':
        return PaymentMode.card;
      case 'bank_transfer':
        return PaymentMode.bankTransfer;
      case 'cheque':
        return PaymentMode.cheque;
      default:
        return PaymentMode.cash;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_id': orderId,
      'payment_type': PaymentHelpers.paymentTypeToString(paymentType),
      'amount': amount,
      'payment_mode': PaymentHelpers.paymentModeToString(paymentMode),
      'transaction_id': transactionId,
      'payment_date': paymentDate,
      'notes': notes,
      'created_by': createdBy,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}

class CreatePaymentDTO {
  final String orderId;
  final PaymentType paymentType;
  final double amount;
  final PaymentMode paymentMode;
  final String? transactionId;
  final String? notes;

  CreatePaymentDTO({
    required this.orderId,
    required this.paymentType,
    required this.amount,
    required this.paymentMode,
    this.transactionId,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    return {
      'order_id': orderId,
      'payment_type': PaymentHelpers.paymentTypeToString(paymentType),
      'amount': amount,
      'payment_mode': PaymentHelpers.paymentModeToString(paymentMode),
      'transaction_id': transactionId,
      'notes': notes,
    };
  }
}
