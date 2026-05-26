import 'package:flutter/material.dart';
import '../../../core/constants.dart';
import '../../../utils/currency_formatter.dart';
import '../models/order.dart';

/// Shared constants and helper functions for order detail widgets.
///
/// Centralizes colors, status helpers, and currency formatting so that
/// extracted widgets remain consistent without duplicating logic.

/// Primary charcoal color — sourced from the canonical [AppColors.primary].
const Color kPrimary = AppColors.primary;

/// Background color — sourced from the canonical [AppColors.background].
const Color kBg = AppColors.background;

/// Format a double amount as Indian Rupees using proper locale formatting.
///
/// Delegates to [CurrencyFormatter.formatINR] for consistent comma grouping
/// across the entire app (e.g. ₹1,50,000 instead of ₹150000).
String formatCurrency(double amount) {
  return CurrencyFormatter.formatINR(amount);
}

/// Calculate the amount still due on an order.
double amountDue(Order order) {
  return (order.totalAmount - order.amountPaid)
      .clamp(0, double.infinity)
      .toDouble();
}

/// Calculate the collected (paid) amount, capped at total.
double collectedAmount(Order order) {
  return order.amountPaid.clamp(0, order.totalAmount).toDouble();
}

/// Human-readable label for payment collection status.
String paymentCollectionLabel(Order order) {
  final due = amountDue(order);
  final collected = collectedAmount(order);
  if (due <= 0) return 'Payment Collected';
  if (collected > 0) return 'Partially Collected';
  return 'Payment Pending';
}

/// Color for payment collection status indicators.
Color paymentCollectionColor(Order order) {
  final due = amountDue(order);
  final collected = collectedAmount(order);
  if (due <= 0) return const Color(0xFF2ECC71);
  if (collected > 0) return const Color(0xFFF5A623);
  return const Color(0xFFFF6B8A);
}

/// Whether the order is in a state where items can be returned.
bool isReturnable(Order order) {
  return order.status == OrderStatus.inUse ||
      order.status == OrderStatus.ongoing ||
      order.status == OrderStatus.lateReturn ||
      order.status == OrderStatus.partial;
}

/// Map an [OrderStatus] to its display color.
Color getStatusColor(OrderStatus status) {
  switch (status) {
    case OrderStatus.confirmed:
    case OrderStatus.scheduled:
      return const Color(0xFF4A90D9);
    case OrderStatus.ongoing:
    case OrderStatus.inUse:
      return const Color(0xFF2ECC71);
    case OrderStatus.lateReturn:
      return const Color(0xFFFF6B8A);
    case OrderStatus.partial:
      return const Color(0xFFF5A623);
    case OrderStatus.returned:
    case OrderStatus.completed:
      return const Color(0xFF95A5A6);
    case OrderStatus.flagged:
      return const Color(0xFF9B59B6);
    case OrderStatus.cancelled:
      return const Color(0xFF7F8C8D);
    default:
      return kPrimary;
  }
}

/// Map an [OrderStatus] to a short human label.
String getStatusLabel(OrderStatus status) {
  switch (status) {
    case OrderStatus.confirmed:
    case OrderStatus.scheduled:
      return 'Scheduled';
    case OrderStatus.ongoing:
    case OrderStatus.inUse:
      return 'Ongoing';
    case OrderStatus.lateReturn:
      return 'Late';
    case OrderStatus.partial:
      return 'Partial';
    case OrderStatus.returned:
    case OrderStatus.completed:
      return 'Returned';
    case OrderStatus.flagged:
      return 'Flagged';
    case OrderStatus.cancelled:
      return 'Cancelled';
    default:
      return status.name;
  }
}
