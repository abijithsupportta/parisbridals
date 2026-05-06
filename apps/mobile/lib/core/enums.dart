/// Unified payment-related enums for Paris Bridals mobile app.
///
/// This file consolidates payment enums to avoid duplication across models.
library;

/// Payment method/mode used for transactions (cash, UPI, card, etc.)
enum PaymentMethod {
  cash,
  upi,
  card,
  bankTransfer,
  cheque,
  other;

  String get displayName {
    switch (this) {
      case PaymentMethod.cash:
        return 'Cash';
      case PaymentMethod.upi:
        return 'UPI';
      case PaymentMethod.card:
        return 'Card';
      case PaymentMethod.bankTransfer:
        return 'Bank Transfer';
      case PaymentMethod.cheque:
        return 'Cheque';
      case PaymentMethod.other:
        return 'Other';
    }
  }

  static PaymentMethod fromString(String value) {
    switch (value.toLowerCase()) {
      case 'cash':
        return PaymentMethod.cash;
      case 'upi':
        return PaymentMethod.upi;
      case 'card':
        return PaymentMethod.card;
      case 'bank_transfer':
      case 'banktransfer':
        return PaymentMethod.bankTransfer;
      case 'cheque':
        return PaymentMethod.cheque;
      case 'other':
      default:
        return PaymentMethod.other;
    }
  }

  String toApiString() {
    switch (this) {
      case PaymentMethod.cash:
        return 'cash';
      case PaymentMethod.upi:
        return 'upi';
      case PaymentMethod.card:
        return 'card';
      case PaymentMethod.bankTransfer:
        return 'bank_transfer';
      case PaymentMethod.cheque:
        return 'cheque';
      case PaymentMethod.other:
        return 'other';
    }
  }
}

/// Payment type/kind (deposit, advance, final, refund, adjustment)
enum PaymentKind {
  deposit,
  advance,
  final_,
  refund,
  adjustment;

  String get displayName {
    switch (this) {
      case PaymentKind.deposit:
        return 'Deposit';
      case PaymentKind.advance:
        return 'Advance';
      case PaymentKind.final_:
        return 'Final Payment';
      case PaymentKind.refund:
        return 'Refund';
      case PaymentKind.adjustment:
        return 'Adjustment';
    }
  }

  static PaymentKind fromString(String value) {
    switch (value.toLowerCase()) {
      case 'deposit':
        return PaymentKind.deposit;
      case 'advance':
        return PaymentKind.advance;
      case 'final':
        return PaymentKind.final_;
      case 'refund':
        return PaymentKind.refund;
      case 'adjustment':
        return PaymentKind.adjustment;
      default:
        return PaymentKind.final_;
    }
  }

  String toApiString() {
    switch (this) {
      case PaymentKind.deposit:
        return 'deposit';
      case PaymentKind.advance:
        return 'advance';
      case PaymentKind.final_:
        return 'final';
      case PaymentKind.refund:
        return 'refund';
      case PaymentKind.adjustment:
        return 'adjustment';
    }
  }
}
