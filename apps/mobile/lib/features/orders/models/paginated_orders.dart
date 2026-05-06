/// Paginated orders response model.
///
/// Contains a page of orders along with pagination metadata (total count,
/// page number, hasNext/hasPrev). Used by the orders list provider for
/// infinite scroll pagination.
///
/// @module features/orders/models/paginated_orders
library;

import 'order.dart';

class PaginatedOrders {
  final List<Order> orders;
  final int total;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;
  final Map<String, int> counts;

  PaginatedOrders({
    required this.orders,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
    required this.counts,
  });

  factory PaginatedOrders.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as List<dynamic>;
    final meta = json['meta'] as Map<String, dynamic>;
    final counts = json['counts'] as Map<String, dynamic>? ?? {};

    return PaginatedOrders(
      orders: data.map((orderJson) => Order.fromJson(orderJson as Map<String, dynamic>)).toList(),
      total: meta['total'] as int? ?? 0,
      page: meta['page'] as int? ?? 1,
      limit: meta['limit'] as int? ?? 25,
      totalPages: meta['totalPages'] as int? ?? 1,
      hasNext: meta['hasNext'] as bool? ?? false,
      hasPrev: meta['hasPrev'] as bool? ?? false,
      counts: counts.map((key, value) => MapEntry(key, value as int)),
    );
  }
}
