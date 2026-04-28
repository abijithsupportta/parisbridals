import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/order.dart';

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

/// Repository layer for Orders.
/// All HTTP calls go through here — providers never touch Dio directly.
class OrderRepository {
  final Dio _client = apiClient;

  /// Fetch all orders from the Next.js API with pagination.
  Future<PaginatedOrders> getOrders({
    int page = 1,
    int limit = 25,
    String? customerId,
    String? branchId,
    String? status,
    String? query,
    String? dateFilter,
    String? dateFrom,
    String? dateTo,
  }) async {
    final Map<String, dynamic> queryParams = {
      'page': page,
      'limit': limit,
    };
    if (customerId != null && customerId.isNotEmpty) {
      queryParams['customer_id'] = customerId;
    }
    if (branchId != null && branchId.isNotEmpty) {
      queryParams['branch_id'] = branchId;
    }
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }
    if (query != null && query.isNotEmpty) {
      queryParams['query'] = query;
    }
    if (dateFilter != null && dateFilter.isNotEmpty) {
      queryParams['date_filter'] = dateFilter;
    }
    if (dateFrom != null && dateFrom.isNotEmpty) {
      queryParams['date_from'] = dateFrom;
    }
    if (dateTo != null && dateTo.isNotEmpty) {
      queryParams['date_to'] = dateTo;
    }

    final response = await _client.get('/orders', queryParameters: queryParams);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        final ordersData = data['data'] as List;
        final meta = data['meta'] as Map<String, dynamic>?;
        return PaginatedOrders(
          orders: ordersData.map((e) => Order.fromJson(e)).toList(),
          total: meta?['total'] ?? 0,
          page: meta?['page'] ?? 1,
          limit: meta?['limit'] ?? 25,
          totalPages: meta?['totalPages'] ?? 1,
          hasNext: meta?['hasNext'] ?? false,
          hasPrev: meta?['hasPrev'] ?? false,
        );
      }
    }
    throw Exception('Failed to load orders');
  }

  /// Fetch a single order by ID.
  Future<Order> getOrderById(String id) async {
    final response = await _client.get('/orders/$id');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Order.fromJson(data['data']);
      }
    }
    throw Exception('Failed to load order');
  }

  /// Create a new order.
  Future<Order> createOrder(Map<String, dynamic> body) async {
    final response = await _client.post('/orders', data: body);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Order.fromJson(data['data']);
      }
    }
    throw Exception('Failed to create order');
  }

  /// Update an existing order.
  Future<Order> updateOrder(String id, Map<String, dynamic> body) async {
    final response = await _client.patch('/orders/$id', data: body);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Order.fromJson(data['data']);
      }
    }
    throw Exception('Failed to update order');
  }

  /// Delete an order.
  Future<void> deleteOrder(String id) async {
    final response = await _client.delete('/orders/$id');

    if (response.statusCode != 200) {
      throw Exception('Failed to delete order');
    }
  }
}
