import 'package:dio/dio.dart';
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

  /// Fetch all products from the Next.js API with pagination.
  Future<PaginatedProducts> getProducts({int page = 1, int limit = 20, String? search, String? branchId}) async {
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

    final response = await _client.get('/products', queryParameters: queryParams);

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
  }

  /// Fetch a single product by ID.
  Future<Product> getProductById(String id) async {
    final response = await _client.get('/products/$id');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Product.fromJson(data['data']);
      }
    }
    throw Exception('Failed to load product');
  }

  /// Create a new product.
  Future<Product> createProduct(Map<String, dynamic> body) async {
    final response = await _client.post('/products', data: body);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Product.fromJson(data['data']);
      }
    }
    throw Exception('Failed to create product');
  }

  /// Update an existing product.
  Future<Product> updateProduct(String id, Map<String, dynamic> body) async {
    final response = await _client.patch('/products/$id', data: body);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Product.fromJson(data['data']);
      }
    }
    throw Exception('Failed to update product');
  }

  /// Delete a product.
  Future<void> deleteProduct(String id) async {
    final response = await _client.delete('/products/$id');

    if (response.statusCode != 200) {
      throw Exception('Failed to delete product');
    }
  }

  /// Fetch branch inventory for a product.
  Future<List<BranchInventory>> getProductBranchInventory(String productId) async {
    final response = await _client.get('/branch-inventory', queryParameters: {
      'product_id': productId,
    });

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        final inventoryData = data['data'] as List;
        return inventoryData.map((e) => BranchInventory.fromJson(e)).toList();
      }
    }
    return [];
  }
}
