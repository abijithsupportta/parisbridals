/// Unified payment-related enums for Paris Bridals mobile app.
///
/// This file consolidates payment enums to avoid duplication across models.
library;

/// Payment method/mode used for transactions.
enum PaymentType {
  cash,
  upi,
  card,
  bankTransfer,
  cheque,
  other;

  String get displayName {
    switch (this) {
      case PaymentType.cash:
        return 'Cash';
      case PaymentType.upi:
        return 'UPI';
      case PaymentType.card:
        return 'Card';
      case PaymentType.bankTransfer:
        return 'Bank Transfer';
      case PaymentType.cheque:
        return 'Cheque';
      case PaymentType.other:
        return 'Other';
    }
  }

  static PaymentType fromString(String value) {
    switch (value.toLowerCase()) {
      case 'cash':
        return PaymentType.cash;
      case 'upi':
        return PaymentType.upi;
      case 'card':
        return PaymentType.card;
      case 'bank_transfer':
      case 'banktransfer':
        return PaymentType.bankTransfer;
      case 'cheque':
        return PaymentType.cheque;
      case 'other':
      default:
        return PaymentType.other;
    }
  }

  String toApiString() {
    switch (this) {
      case PaymentType.cash:
        return 'cash';
      case PaymentType.upi:
        return 'upi';
      case PaymentType.card:
        return 'card';
      case PaymentType.bankTransfer:
        return 'bank_transfer';
      case PaymentType.cheque:
        return 'cheque';
      case PaymentType.other:
        return 'other';
    }
  }
}
