import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../models/order.dart';
import '../repositories/order_repository.dart';

// Orders cache for faster loading
class OrdersCache {
  PaginatedOrders? _data;
  DateTime? _timestamp;
  String? _branchId;
  String? _search;
  String? _status;
  final Duration _ttl = const Duration(minutes: 1);

  bool isValid(String? branchId, String? search, String? status) {
    if (_data == null || _timestamp == null) return false;
    if (DateTime.now().difference(_timestamp!) > _ttl) return false;
    if (_branchId != branchId) return false;
    if (_search != search) return false;
    if (_status != status) return false;
    return true;
  }

  void set(
    PaginatedOrders orders,
    String? branchId,
    String? search,
    String? status,
  ) {
    _data = orders;
    _timestamp = DateTime.now();
    _branchId = branchId;
    _search = search;
    _status = status;
  }

  PaginatedOrders? get data => _data;

  void invalidate() {
    _data = null;
    _timestamp = null;
  }
}

final ordersCache = OrdersCache();

void invalidateOrdersCache() {
  ordersCache.invalidate();
}

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
    final query = _currentSearch.isNotEmpty ? _currentSearch : null;

    if (ordersCache.isValid(_currentBranchId, query, _currentStatus) &&
        ordersCache.data != null) {
      return ordersCache.data!;
    }

    final data = await repo.getOrders(
      page: _currentPage,
      limit: 50,
      query: query,
      status: _currentStatus,
      branchId: _currentBranchId,
    );
    ordersCache.set(data, _currentBranchId, query, _currentStatus);
    return data;
  }

  Future<void> search(String query) async {
    _currentSearch = query;
    _currentPage = 1;
    invalidateOrdersCache();
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
      ordersCache.set(data, _currentBranchId, normalizedQuery, _currentStatus);
      return data;
    });
  }

  Future<void> filterByStatus(String? status) async {
    _currentStatus = status;
    _currentPage = 1;
    invalidateOrdersCache();
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
      ordersCache.set(data, _currentBranchId, query, _currentStatus);
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
      );
      ordersCache.set(merged, _currentBranchId, query, _currentStatus);
      state = AsyncValue.data(merged);
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> createOrder(Map<String, dynamic> body) async {
    final repo = ref.read(orderRepositoryProvider);
    await repo.createOrder(body);
    invalidateOrdersCache();
    ref.invalidateSelf();
  }

  Future<void> updateOrder(String id, Map<String, dynamic> body) async {
    final repo = ref.read(orderRepositoryProvider);
    await repo.updateOrder(id, body);
    invalidateOrdersCache();
    ref.invalidateSelf();
  }

  Future<void> deleteOrder(String id) async {
    final repo = ref.read(orderRepositoryProvider);
    await repo.deleteOrder(id);
    invalidateOrdersCache();
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
