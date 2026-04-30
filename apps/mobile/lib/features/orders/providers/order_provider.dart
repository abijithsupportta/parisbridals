import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../models/order.dart';
import '../repositories/order_repository.dart';

// Repository provider
final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepository();
});

/// Main orders provider with pagination, search, status filter, and branch.
class OrdersNotifier extends AsyncNotifier<PaginatedOrders> {
  int _currentPage = 1;
  bool _isLoadingMore = false;
  String _currentSearch = '';
  String? _currentStatus;
  String? _currentBranchId;

  @override
  Future<PaginatedOrders> build() async {
    ref.keepAlive();
    _currentPage = 1;
    _currentBranchId = ref.watch(effectiveBranchIdProvider);
    final repo = ref.watch(orderRepositoryProvider);
    return repo.getOrders(
      page: _currentPage,
      limit: 50,
      query: _currentSearch.isNotEmpty ? _currentSearch : null,
      status: _currentStatus,
      branchId: _currentBranchId,
    );
  }

  Future<void> search(String query) async {
    _currentSearch = query;
    _currentPage = 1;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(orderRepositoryProvider);
      return repo.getOrders(
        page: _currentPage,
        limit: 50,
        query: _currentSearch.isNotEmpty ? _currentSearch : null,
        status: _currentStatus,
        branchId: _currentBranchId,
      );
    });
  }

  Future<void> filterByStatus(String? status) async {
    _currentStatus = status;
    _currentPage = 1;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(orderRepositoryProvider);
      return repo.getOrders(
        page: _currentPage,
        limit: 50,
        query: _currentSearch.isNotEmpty ? _currentSearch : null,
        status: _currentStatus,
        branchId: _currentBranchId,
      );
    });
  }

  Future<void> loadMore() async {
    if (_isLoadingMore || !state.hasValue) return;
    final current = state.value!;
    if (current.page >= current.totalPages) return;

    _isLoadingMore = true;
    try {
      final repo = ref.read(orderRepositoryProvider);
      final next = await repo.getOrders(
        page: _currentPage + 1,
        limit: 50,
        query: _currentSearch.isNotEmpty ? _currentSearch : null,
        status: _currentStatus,
        branchId: _currentBranchId,
      );
      _currentPage++;
      state = AsyncValue.data(PaginatedOrders(
        orders: [...current.orders, ...next.orders],
        total: next.total,
        page: next.page,
        limit: next.limit,
        totalPages: next.totalPages,
        hasNext: next.hasNext,
        hasPrev: next.hasPrev,
      ));
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
      state = AsyncValue.data(PaginatedOrders(
        orders: current.orders.where((o) => o.id != id).toList(),
        total: current.total - 1,
        page: current.page,
        limit: current.limit,
        totalPages: current.totalPages,
        hasNext: current.hasNext,
        hasPrev: current.hasPrev,
      ));
    }
  }
}

final ordersProvider =
    AsyncNotifierProvider<OrdersNotifier, PaginatedOrders>(() {
  return OrdersNotifier();
});

// Single order provider
final orderByIdProvider =
    FutureProvider.family<Order, String>((ref, id) async {
  final repository = ref.watch(orderRepositoryProvider);
  return repository.getOrderById(id);
});
