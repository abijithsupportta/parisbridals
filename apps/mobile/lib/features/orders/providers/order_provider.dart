/// Order providers — state management for order lists and single-order views.
///
/// Uses Riverpod's built-in caching via `ref.keepAlive()` and
/// `ref.invalidateSelf()` for cache control. No manual cache layer.
///
/// @module features/orders/providers/order_provider
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../models/order.dart';
import '../models/paginated_orders.dart';
import '../repositories/order_repository.dart';

// Repository provider
final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepository();
});

/// Main orders provider with pagination, search, status filter, and branch.
///
/// Riverpod's `ref.keepAlive()` handles caching. When data must be refreshed
/// (e.g. after create/update/delete), `ref.invalidateSelf()` clears the cache
/// and triggers a fresh build. No manual `OrdersCache` needed.
class OrdersNotifier extends AsyncNotifier<PaginatedOrders> {
  int _currentPage = 1;
  bool _isLoadingMore = false;
  String _currentSearch = '';
  String? _currentStatus;
  String? _currentBranchId;

  // Get counts from the current state
  Map<String, int> get counts {
    if (state.hasValue) {
      return state.value!.counts;
    }
    return {};
  }

  @override
  Future<PaginatedOrders> build() async {
    ref.keepAlive();
    _currentPage = 1;
    _currentBranchId = ref.watch(effectiveBranchIdProvider);
    final repo = ref.watch(orderRepositoryProvider);
    final query = _currentSearch.isNotEmpty ? _currentSearch : null;

    final data = await repo.getOrders(
      page: _currentPage,
      limit: 50,
      query: query,
      status: _currentStatus,
      branchId: _currentBranchId,
    );
    return data;
  }

  Future<void> search(String query) async {
    _currentSearch = query;
    _currentPage = 1;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(orderRepositoryProvider);
      final normalizedQuery = _currentSearch.isNotEmpty ? _currentSearch : null;
      final data = await repo.getOrders(
        page: _currentPage,
        limit: 50,
        query: normalizedQuery,
        status: _currentStatus,
        branchId: _currentBranchId,
      );
      return data;
    });
  }

  Future<void> filterByStatus(String? status) async {
    _currentStatus = status;
    _currentPage = 1;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(orderRepositoryProvider);
      final query = _currentSearch.isNotEmpty ? _currentSearch : null;
      final data = await repo.getOrders(
        page: _currentPage,
        limit: 50,
        query: query,
        status: _currentStatus,
        branchId: _currentBranchId,
      );
      return data;
    });
  }

  Future<void> loadMore() async {
    if (_isLoadingMore || !state.hasValue) return;
    final current = state.value!;
    if (current.page >= current.totalPages) return;

    _isLoadingMore = true;
    try {
      final repo = ref.read(orderRepositoryProvider);
      final query = _currentSearch.isNotEmpty ? _currentSearch : null;
      final next = await repo.getOrders(
        page: _currentPage + 1,
        limit: 50,
        query: query,
        status: _currentStatus,
        branchId: _currentBranchId,
      );
      _currentPage++;
      final merged = PaginatedOrders(
        orders: [...current.orders, ...next.orders],
        total: next.total,
        page: next.page,
        limit: next.limit,
        totalPages: next.totalPages,
        hasNext: next.hasNext,
        hasPrev: next.hasPrev,
        counts: next.counts,
      );
      state = AsyncValue.data(merged);
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> createOrder(Map<String, dynamic> body) async {
    final repo = ref.read(orderRepositoryProvider);
    await repo.createOrder(body);
    ref.invalidateSelf();
  }

  Future<void> updateOrder(String id, Map<String, dynamic> body) async {
    final repo = ref.read(orderRepositoryProvider);
    await repo.updateOrder(id, body);
    ref.invalidateSelf();
  }

  Future<void> deleteOrder(String id) async {
    final repo = ref.read(orderRepositoryProvider);
    await repo.deleteOrder(id);
    if (state.hasValue) {
      final current = state.value!;
      state = AsyncValue.data(
        PaginatedOrders(
          orders: current.orders.where((o) => o.id != id).toList(),
          total: current.total - 1,
          page: current.page,
          limit: current.limit,
          totalPages: current.totalPages,
          hasNext: current.hasNext,
          hasPrev: current.hasPrev,
          counts: current.counts,
        ),
      );
    }
  }
}

final ordersProvider = AsyncNotifierProvider<OrdersNotifier, PaginatedOrders>(
  () {
    return OrdersNotifier();
  },
);

// Single order provider
final orderByIdProvider = FutureProvider.family<Order, String>((ref, id) async {
  final repository = ref.watch(orderRepositoryProvider);
  return repository.getOrderById(id);
});

final orderHistoryProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, id) async {
      final repository = ref.watch(orderRepositoryProvider);
      return repository.getOrderHistory(id);
    });
