import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/branch.dart';
import '../repositories/branch_repository.dart';

// Repository provider
final branchRepositoryProvider = Provider<BranchRepository>((ref) {
  return BranchRepository();
});

// Branches list provider
final branchesProvider = FutureProvider.autoDispose<List<Branch>>((ref) async {
  final repository = ref.watch(branchRepositoryProvider);
  return repository.getBranches();
});

// Single branch provider
final branchProvider = FutureProvider.family.autoDispose<Branch, String>((ref, id) async {
  final repository = ref.watch(branchRepositoryProvider);
  return repository.getBranchById(id);
});

// Branch operations - simple function-based approach
class BranchOperations {
  final BranchRepository _repository;

  BranchOperations(this._repository);

  Future<void> createBranch(Map<String, dynamic> body) async {
    await _repository.createBranch(body);
  }

  Future<void> updateBranch(String id, Map<String, dynamic> body) async {
    await _repository.updateBranch(id, body);
  }

  Future<void> deleteBranch(String id) async {
    await _repository.deleteBranch(id);
  }
}

final branchOperationsProvider = Provider<BranchOperations>((ref) {
  final repository = ref.watch(branchRepositoryProvider);
  return BranchOperations(repository);
});
