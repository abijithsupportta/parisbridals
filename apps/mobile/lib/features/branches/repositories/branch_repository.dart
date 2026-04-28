import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/branch.dart';

/// Repository layer for Branches.
/// All HTTP calls go through here — providers never touch Dio directly.
class BranchRepository {
  final Dio _client = apiClient;

  /// Fetch all branches from the Next.js API.
  Future<List<Branch>> getBranches() async {
    final response = await _client.get('/branches');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        final branchesData = data['data'] as List;
        return branchesData.map((e) => Branch.fromJson(e)).toList();
      }
    }
    throw Exception('Failed to load branches');
  }

  /// Fetch a single branch by ID.
  Future<Branch> getBranchById(String id) async {
    final response = await _client.get('/branches/$id');

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Branch.fromJson(data['data']);
      }
    }
    throw Exception('Failed to load branch');
  }

  /// Create a new branch.
  Future<Branch> createBranch(Map<String, dynamic> body) async {
    final response = await _client.post('/branches', data: body);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Branch.fromJson(data['data']);
      }
    }
    throw Exception('Failed to create branch');
  }

  /// Update an existing branch.
  Future<Branch> updateBranch(String id, Map<String, dynamic> body) async {
    final response = await _client.patch('/branches/$id', data: body);

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Branch.fromJson(data['data']);
      }
    }
    throw Exception('Failed to update branch');
  }

  /// Delete a branch.
  Future<void> deleteBranch(String id) async {
    final response = await _client.delete('/branches/$id');

    if (response.statusCode != 200) {
      throw Exception('Failed to delete branch');
    }
  }
}
