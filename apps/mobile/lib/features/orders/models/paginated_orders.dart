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

  PaginatedOrders({
    required this.orders,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });
}
