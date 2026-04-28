import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/category.dart';

/// Repository layer for Categories.
/// Mirrors the admin's API routes:
///   GET    /api/categories         → getCategories()
///   GET    /api/categories/:id     → getCategoryById()
///   POST   /api/categories         → createCategory()
///   PATCH  /api/categories/:id     → updateCategory()
///   DELETE /api/categories/:id     → deleteCategory()
class CategoryRepository {
  final Dio _client = apiClient;

  /// Fetch all categories (sorted by sort_order, then name).
  Future<List<Category>> getCategories({CancelToken? cancelToken}) async {
    final response = await _client.get('/categories', cancelToken: cancelToken);

    if (response.statusCode == 200) {
      final data = response.data;
      // The API returns { success: true, data: [...] }
      final list = data['data'] as List;
      return list.map((e) => Category.fromJson(e)).toList();
    }
    throw Exception('Failed to load categories');
  }

  /// Fetch a single category by ID.
  Future<Category> getCategoryById(String id, {CancelToken? cancelToken}) async {
    final response = await _client.get('/categories/$id', cancelToken: cancelToken);

    if (response.statusCode == 200) {
      final data = response.data;
      return Category.fromJson(data['data']);
    }
    throw Exception('Failed to load category');
  }

  /// Create a new category.
  Future<Category> createCategory(Map<String, dynamic> body, {CancelToken? cancelToken}) async {
    final response = await _client.post('/categories', data: body, cancelToken: cancelToken);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      return Category.fromJson(data['data']);
    }
    throw Exception('Failed to create category');
  }

  /// Update an existing category (partial update).
  Future<Category> updateCategory(String id, Map<String, dynamic> body, {CancelToken? cancelToken}) async {
    final response = await _client.patch('/categories/$id', data: body, cancelToken: cancelToken);

    if (response.statusCode == 200) {
      final data = response.data;
      return Category.fromJson(data['data']);
    }
    throw Exception('Failed to update category');
  }

  /// Delete a category (server enforces safety checks).
  Future<void> deleteCategory(String id, {CancelToken? cancelToken}) async {
    final response = await _client.delete('/categories/$id', cancelToken: cancelToken);

    if (response.statusCode != 200) {
      final msg = response.data?['error'] ?? 'Failed to delete category';
      throw Exception(msg);
    }
  }
}
