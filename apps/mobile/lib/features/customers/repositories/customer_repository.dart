import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/customer.dart';

class PaginatedCustomers {
  final List<Customer> customers;
  final int total;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  PaginatedCustomers({
    required this.customers,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });
}

/// Repository layer for Customers.
/// All HTTP calls go through here — providers never touch Dio directly.
class CustomerRepository {
  final Dio _client = apiClient;

  /// Fetch all customers from the Next.js API with pagination.
  Future<PaginatedCustomers> getCustomers({
    int page = 1,
    int limit = 20,
    String? query,
    String? phone,
    String sortBy = 'created_at',
    String sortOrder = 'desc',
  }) async {
    final Map<String, dynamic> queryParams = {
      'page': page,
      'limit': limit,
      'sort_by': sortBy,
      'sort_order': sortOrder,
    };
    if (query != null && query.isNotEmpty) {
      queryParams['query'] = query;
    }
    if (phone != null && phone.isNotEmpty) {
      queryParams['phone'] = phone;
    }

    final response = await _client.get('/customers', queryParameters: queryParams);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        final customersData = data['data']['customers'] as List;
        return PaginatedCustomers(
          customers: customersData.map((e) => Customer.fromJson(e)).toList(),
          total: data['data']['total'] ?? 0,
          page: data['data']['page'] ?? 1,
          limit: data['data']['limit'] ?? 20,
          totalPages: data['data']['total_pages'] ?? 1,
          hasNext: data['data']['has_next'] ?? false,
          hasPrev: data['data']['has_prev'] ?? false,
        );
      }
    }
    throw Exception('Failed to load customers');
  }

  /// Fetch a single customer by ID.
  Future<Customer> getCustomerById(String id) async {
    final response = await _client.get('/customers/$id');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Customer.fromJson(data['data']);
      }
    }
    throw Exception('Failed to load customer');
  }

  /// Create a new customer.
  Future<Customer> createCustomer(Map<String, dynamic> body) async {
    final response = await _client.post('/customers', data: body);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Customer.fromJson(data['data']);
      }
    }
    throw Exception('Failed to create customer');
  }

  /// Update an existing customer.
  Future<Customer> updateCustomer(String id, Map<String, dynamic> body) async {
    final response = await _client.patch('/customers/$id', data: body);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Customer.fromJson(data['data']);
      }
    }
    throw Exception('Failed to update customer');
  }

  /// Delete a customer.
  Future<void> deleteCustomer(String id) async {
    final response = await _client.delete('/customers/$id');

    if (response.statusCode != 200) {
      throw Exception('Failed to delete customer');
    }
  }
}
