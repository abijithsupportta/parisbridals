import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/branch.dart';
import '../repositories/branch_repository.dart';

// Simple cache wrapper for branches
class BranchCache {
  List<Branch>? _data;
  DateTime? _timestamp;
  final Duration _ttl = const Duration(minutes: 2);

  bool get isValid => _data != null && _timestamp != null &&
      DateTime.now().difference(_timestamp!) < _ttl;

  List<Branch>? get data => _data;
  DateTime? get timestamp => _timestamp;

  void set(List<Branch> branches) {
    _data = branches;
    _timestamp = DateTime.now();
  }

  void invalidate() {
    _data = null;
    _timestamp = null;
  }
}

// Module-level cache instance
final branchCache = BranchCache();

// Repository provider
final branchRepositoryProvider = Provider<BranchRepository>((ref) {
  return BranchRepository();
});

// Branches list provider with caching
final branchesProvider = FutureProvider.autoDispose<List<Branch>>((ref) async {
  // Return cached data if valid
  if (branchCache.isValid && branchCache.data != null) {
    return branchCache.data!;
  }

  final repository = ref.watch(branchRepositoryProvider);
  final branches = await repository.getBranches();
  branchCache.set(branches);
  return branches;
});

// Invalidate branch cache (call this after mutations)
void invalidateBranchCache() {
  branchCache.invalidate();
}

// Single branch provider
final branchProvider = FutureProvider.family.autoDispose<Branch, String>((ref, id) async {
  final repository = ref.watch(branchRepositoryProvider);
  return repository.getBranchById(id);
});

/// Selected branch ID. Defaults to first active branch for admins.
class SelectedBranchNotifier extends Notifier<String?> {
  @override
  String? build() {
    // Auto-select first branch for admins on initial load
    final user = ref.watch(authUserProvider);
    if (user?.canSwitchBranches == true) {
      ref.listen(branchesProvider, (previous, next) {
        next.whenData((branches) {
          if (state == null && branches.isNotEmpty) {
            final firstActive = branches.firstWhere((b) => b.isActive, orElse: () => branches.first);
            state = firstActive.id;
          }
        });
      });
    }
    return null;
  }

  void select(String? branchId) {
    state = branchId;
  }
}

final selectedBranchIdProvider = NotifierProvider<SelectedBranchNotifier, String?>(
  SelectedBranchNotifier.new,
);

final effectiveBranchIdProvider = Provider<String?>((ref) {
  final user = ref.watch(authUserProvider);
  final selectedBranchId = ref.watch(selectedBranchIdProvider);

  if (user == null) return null;
  if (user.canSwitchBranches) return selectedBranchId;
  return user.branchId;
});

final selectedBranchProvider = Provider<AsyncValue<Branch?>>((ref) {
  final selectedBranchId = ref.watch(selectedBranchIdProvider);
  if (selectedBranchId == null) return const AsyncData<Branch?>(null);

  return ref.watch(branchesProvider).whenData((branches) {
    for (final branch in branches) {
      if (branch.id == selectedBranchId) return branch;
    }
    return null;
  });
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
