import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/api_client.dart';
import '../models/product.dart';

class PaginatedProducts {
  final List<Product> products;
  final int total;
  final int page;
  final int totalPages;

  PaginatedProducts({
    required this.products,
    required this.total,
    required this.page,
    required this.totalPages,
  });
}

/// Repository layer for Products.
/// All HTTP calls go through here — providers never touch Dio directly.
class ProductRepository {
  final Dio _client = apiClient;

  String _extractError(dynamic e, String defaultMsg) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['error'] != null) {
        if (data['error'] is Map && data['error']['message'] != null) {
          return data['error']['message'];
        }
        return data['error'].toString();
      }
      return e.message ?? defaultMsg;
    }
    return e.toString();
  }

  /// Fetch all products from the Next.js API with pagination.
  Future<PaginatedProducts> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    String? branchId,
    String? status,
    CancelToken? cancelToken,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {
        'page': page,
        'limit': limit,
      };
      if (search != null && search.isNotEmpty) {
        queryParams['query'] = search;
      }
      if (branchId != null && branchId.isNotEmpty) {
        queryParams['branch_id'] = branchId;
      }
      if (status != null && status.isNotEmpty) {
        queryParams['status'] = status;
      }

      final response = await _client.get(
        '/products',
        queryParameters: queryParams,
        cancelToken: cancelToken,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          final productsData = data['data']['products'] as List;
          return PaginatedProducts(
            products: productsData.map((e) => Product.fromJson(e)).toList(),
            total: data['data']['total'] ?? 0,
            page: data['data']['page'] ?? 1,
            totalPages: data['data']['total_pages'] ?? 1,
          );
        }
      }
      throw Exception('Failed to load products');
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to load products'));
    }
  }

  /// Fetch a single product by ID.
  Future<Product> getProductById(String id, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.get('/products/$id', cancelToken: cancelToken);

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        }
      }
      throw Exception('Failed to load product');
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to load product'));
    }
  }

  /// Create a new product.
  Future<Product> createProduct(Map<String, dynamic> body, {CancelToken? cancelToken}) async {
    try {
      debugPrint('[ProductRepo] POST /products body: $body');
      final response = await _client.post('/products', data: body, cancelToken: cancelToken);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        }
      }
      throw Exception('Failed to create product');
    } catch (e) {
      debugPrint('[ProductRepo] createProduct ERROR: $e');
      throw Exception(_extractError(e, 'Failed to create product'));
    }
  }

  /// Update an existing product (partial update via whitelisted fields).
  Future<Product> updateProduct(String id, Map<String, dynamic> body, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.patch('/products/$id', data: body, cancelToken: cancelToken);

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          return Product.fromJson(data['data']);
        }
      }
      throw Exception('Failed to update product');
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to update product'));
    }
  }

  /// Delete a product.
  /// Handles HTTP 409 (product has linked orders) with a descriptive error.
  Future<void> deleteProduct(String id, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.delete('/products/$id', cancelToken: cancelToken);

      if (response.statusCode != 200) {
        final msg = response.data?['error'] ?? 'Failed to delete product';
        throw Exception(msg);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        final data = e.response?.data;
        final reason = data is Map
            ? (data['error'] ?? 'This product has linked orders and cannot be deleted.')
            : 'This product has linked orders and cannot be deleted.';
        throw Exception(reason.toString());
      }
      throw Exception(_extractError(e, 'Failed to delete product'));
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to delete product'));
    }
  }

  /// Fetch branch inventory for a product.
  Future<List<BranchInventory>> getProductBranchInventory(String productId, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.get(
        '/branch-inventory',
        queryParameters: {'product_id': productId},
        cancelToken: cancelToken,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          final inventoryData = data['data'] as List;
          return inventoryData.map((e) => BranchInventory.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Pre-delete safety check.
  Future<Map<String, dynamic>> canDeleteProduct(String id, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.get('/products/$id/can-delete', cancelToken: cancelToken);
      if (response.statusCode == 200 && response.data != null) {
        return response.data as Map<String, dynamic>;
      }
      return {'canDelete': false, 'reason': 'Unable to check'};
    } catch (e) {
      return {'canDelete': false, 'reason': _extractError(e, 'Unable to check')};
    }
  }
}
