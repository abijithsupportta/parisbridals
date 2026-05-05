import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/order.dart';
import '../models/paginated_orders.dart';

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
    try {
      final response = await _client.post('/orders', data: body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          return Order.fromJson(data['data']);
        } else {
          throw Exception(data['message'] ?? 'Failed to create order: Invalid response');
        }
      } else {
        // Handle HTTP errors with detailed response
        final responseData = response.data;
        String errorMessage = 'Failed to create order: HTTP ${response.statusCode}';
        
        if (responseData != null) {
          if (responseData['message'] != null) {
            errorMessage += ' - ${responseData['message']}';
          }
          if (responseData['errors'] != null) {
            errorMessage += ' - Errors: ${responseData['errors']}';
          }
        }
        
        throw Exception(errorMessage);
      }
    } on DioException catch (e) {
      // Handle Dio-specific errors
      String errorMessage = 'Failed to create order: ';
      
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
          errorMessage += 'Connection timeout';
          break;
        case DioExceptionType.sendTimeout:
          errorMessage += 'Send timeout';
          break;
        case DioExceptionType.receiveTimeout:
          errorMessage += 'Receive timeout';
          break;
        case DioExceptionType.badResponse:
          errorMessage += 'HTTP ${e.response?.statusCode}';
          if (e.response?.data != null) {
            final data = e.response!.data;
            if (data['message'] != null) {
              errorMessage += ' - ${data['message']}';
            }
            if (data['errors'] != null) {
              errorMessage += ' - ${data['errors']}';
            }
          }
          break;
        case DioExceptionType.cancel:
          errorMessage += 'Request cancelled';
          break;
        case DioExceptionType.unknown:
          errorMessage += 'Network error: ${e.error}';
          break;
        default:
          errorMessage += 'Unknown error: ${e.message}';
      }
      
      throw Exception(errorMessage);
    } catch (e) {
      throw Exception('Failed to create order: ${e.toString()}');
    }
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

  /// Start rental (update status to ongoing)
  Future<Order> startRental(String id) async {
    return updateOrder(id, {
      'status': 'ongoing',
      'start_date': DateTime.now().toIso8601String().split('T')[0],
    });
  }

  /// Cancel order
  Future<Order> cancelOrder(String id) async {
    return updateOrder(id, {'status': 'cancelled'});
  }

  /// Batch check stock availability for order items.
  /// Returns { allAvailable: bool, items: [...] }
  Future<Map<String, dynamic>> checkStockAvailability({
    required List<Map<String, dynamic>> items,
    required String startDate,
    required String endDate,
    required String branchId,
    String? excludeOrderId,
  }) async {
    final body = <String, dynamic>{
      'items': items,
      'start_date': startDate,
      'end_date': endDate,
      'branch_id': branchId,
    };
    if (excludeOrderId != null) {
      body['exclude_order_id'] = excludeOrderId;
    }

    final response = await _client.post('/orders/check-availability', data: body);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return data['data'] as Map<String, dynamic>;
      }
    }
    throw Exception('Failed to check stock availability');
  }

  /// Process order return via the dedicated return endpoint.
  /// Expects ReturnOrderDTO: { order_id, items: [...], notes?, late_fee?, discount? }
  Future<Order> processReturn(String orderId, Map<String, dynamic> returnData) async {
    final response = await _client.patch('/orders/$orderId/return', data: returnData);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Order.fromJson(data['data']);
      }
    }
    throw Exception('Failed to process return');
  }

  /// Mark deposit as returned.
  Future<Order> markDepositReturned(String id) async {
    final response = await _client.patch('/orders/$id/deposit');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Order.fromJson(data['data']);
      }
    }
    throw Exception('Failed to mark deposit as returned');
  }

  /// Fetch order status history.
  Future<List<Map<String, dynamic>>> getOrderHistory(String id) async {
    final response = await _client.get('/orders/$id/history');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return (data['data'] as List).cast<Map<String, dynamic>>();
      }
    }
    throw Exception('Failed to load order history');
  }
}
