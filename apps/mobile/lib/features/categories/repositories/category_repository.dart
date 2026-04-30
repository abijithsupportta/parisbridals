import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' hide Category;
import '../../../core/api_client.dart';
import '../models/category.dart';

/// Repository layer for Categories.
class CategoryRepository {
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

  /// Fetch all categories (sorted by sort_order, then name).
  Future<List<Category>> getCategories({CancelToken? cancelToken}) async {
    try {
      final response = await _client.get('/categories', cancelToken: cancelToken);
      if (response.statusCode == 200) {
        final data = response.data;
        final list = data['data'] as List;
        return list.map((e) => Category.fromJson(e)).toList();
      }
      throw Exception('Failed to load categories');
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to load categories'));
    }
  }

  /// Fetch a single category by ID.
  Future<Category> getCategoryById(String id, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.get('/categories/$id', cancelToken: cancelToken);
      if (response.statusCode == 200) {
        final data = response.data;
        return Category.fromJson(data['data']);
      }
      throw Exception('Failed to load category');
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to load category'));
    }
  }

  /// Create a new category.
  Future<Category> createCategory(Map<String, dynamic> body, {CancelToken? cancelToken}) async {
    try {
      debugPrint('[CategoryRepo] POST /categories body: $body');
      final response = await _client.post('/categories', data: body, cancelToken: cancelToken);
      debugPrint('[CategoryRepo] Response status: ${response.statusCode}');
      debugPrint('[CategoryRepo] Response data: ${response.data}');
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        return Category.fromJson(data['data']);
      }
      throw Exception('Failed to create category');
    } catch (e) {
      debugPrint('[CategoryRepo] createCategory ERROR: $e');
      throw Exception(_extractError(e, 'Failed to create category'));
    }
  }

  /// Update an existing category (partial update).
  Future<Category> updateCategory(String id, Map<String, dynamic> body, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.patch('/categories/$id', data: body, cancelToken: cancelToken);
      if (response.statusCode == 200) {
        final data = response.data;
        return Category.fromJson(data['data']);
      }
      throw Exception('Failed to update category');
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to update category'));
    }
  }

  /// Delete a category (server enforces safety checks).
  Future<void> deleteCategory(String id, {CancelToken? cancelToken}) async {
    try {
      final response = await _client.delete('/categories/$id', cancelToken: cancelToken);
      if (response.statusCode != 200) {
        final msg = response.data?['error'] ?? 'Failed to delete category';
        throw Exception(msg);
      }
    } catch (e) {
      throw Exception(_extractError(e, 'Failed to delete category'));
    }
  }
}
