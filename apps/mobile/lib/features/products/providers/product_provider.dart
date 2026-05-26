import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../models/product.dart';
import '../repositories/product_repository.dart';

// Products cache for faster loading
class ProductsCache {
  PaginatedProducts? _data;
  DateTime? _timestamp;
  String? _branchId;
  String? _search;
  final Duration _ttl = const Duration(minutes: 1);

  bool isValid(String? branchId, String? search) {
    if (_data == null || _timestamp == null) return false;
    if (DateTime.now().difference(_timestamp!) > _ttl) return false;
    if (_branchId != branchId) return false;
    if (_search != search) return false;
    return true;
  }

  void set(PaginatedProducts products, String? branchId, String? search) {
    _data = products;
    _timestamp = DateTime.now();
    _branchId = branchId;
    _search = search;
  }

  PaginatedProducts? get data => _data;

  void invalidate() {
    _data = null;
    _timestamp = null;
  }
}

final productsCache = ProductsCache();

void invalidateProductsCache() {
  productsCache.invalidate();
}

/// Singleton repository instance.
final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository();
});

/// Status filter options for the product list.
enum ProductStatusFilter { all, available, lowStock, outOfStock }

/// Current active filter — UI reads/writes this.
class ProductStatusFilterNotifier extends Notifier<ProductStatusFilter> {
  @override
  ProductStatusFilter build() => ProductStatusFilter.all;

  void set(ProductStatusFilter filter) => state = filter;
}

final productStatusFilterProvider =
    NotifierProvider<ProductStatusFilterNotifier, ProductStatusFilter>(
      ProductStatusFilterNotifier.new,
    );

/// Main products provider with pagination, search, and branch filtering.
class ProductsNotifier extends AsyncNotifier<PaginatedProducts> {
  int _currentPage = 1;
  bool _isLoadingMore = false;
  String _currentSearch = '';
  String? _currentBranchId;

  @override
  Future<PaginatedProducts> build() async {
    // Keep data alive across tab switches to avoid re-fetching
    ref.keepAlive();
    _currentPage = 1;
    _currentBranchId = ref.watch(effectiveBranchIdProvider);
    final cancelToken = CancelToken();
    ref.onDispose(cancelToken.cancel);
    final repo = ref.watch(productRepositoryProvider);
    final query = _currentSearch.isNotEmpty ? _currentSearch : null;

    if (productsCache.isValid(_currentBranchId, query) &&
        productsCache.data != null) {
      return productsCache.data!;
    }

    final data = await repo.getProducts(
      page: _currentPage,
      search: _currentSearch,
      branchId: _currentBranchId,
      cancelToken: cancelToken,
    );
    productsCache.set(data, _currentBranchId, query);
    return data;
  }

  Future<void> search(String query) async {
    _currentSearch = query;
    _currentPage = 1;
    invalidateProductsCache();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(productRepositoryProvider);
      final data = await repo.getProducts(
        page: _currentPage,
        search: _currentSearch,
        branchId: _currentBranchId,
      );
      productsCache.set(
        data,
        _currentBranchId,
        _currentSearch.isNotEmpty ? _currentSearch : null,
      );
      return data;
    });
  }

  Future<void> filterByBranch(String? branchId) async {
    _currentBranchId = branchId;
    _currentPage = 1;
    invalidateProductsCache();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(productRepositoryProvider);
      final data = await repo.getProducts(
        page: _currentPage,
        search: _currentSearch,
        branchId: _currentBranchId,
      );
      productsCache.set(
        data,
        _currentBranchId,
        _currentSearch.isNotEmpty ? _currentSearch : null,
      );
      return data;
    });
  }

  Future<void> loadMore() async {
    if (_isLoadingMore || !state.hasValue) return;

    final currentData = state.value!;
    if (currentData.page >= currentData.totalPages) return; // No more pages

    _isLoadingMore = true;
    try {
      final repo = ref.read(productRepositoryProvider);
      final nextPageData = await repo.getProducts(
        page: _currentPage + 1,
        search: _currentSearch,
        branchId: _currentBranchId,
      );

      _currentPage++;
      final merged = PaginatedProducts(
        products: [...currentData.products, ...nextPageData.products],
        total: nextPageData.total,
        page: nextPageData.page,
        totalPages: nextPageData.totalPages,
      );
      productsCache.set(
        merged,
        _currentBranchId,
        _currentSearch.isNotEmpty ? _currentSearch : null,
      );
      state = AsyncValue.data(merged);
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> addProduct(Map<String, dynamic> data) async {
    final repo = ref.read(productRepositoryProvider);
    final newProduct = await repo.createProduct(data);
    invalidateProductsCache();

    // Update local state immediately
    if (state.hasValue) {
      final currentData = state.value!;
      state = AsyncValue.data(
        PaginatedProducts(
          products: [newProduct, ...currentData.products],
          total: currentData.total + 1,
          page: currentData.page,
          totalPages: currentData.totalPages,
        ),
      );
    } else {
      ref.invalidateSelf();
    }
  }

  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    final repo = ref.read(productRepositoryProvider);
    final updatedProduct = await repo.updateProduct(id, data);
    invalidateProductsCache();

    // Update local state
    if (state.hasValue) {
      final currentData = state.value!;
      final list = currentData.products;
      final index = list.indexWhere((p) => p.id == id);
      if (index != -1) {
        final newList = [...list];
        newList[index] = updatedProduct;
        state = AsyncValue.data(
          PaginatedProducts(
            products: newList,
            total: currentData.total,
            page: currentData.page,
            totalPages: currentData.totalPages,
          ),
        );
      }
    }
  }

  Future<void> deleteProduct(String id) async {
    final repo = ref.read(productRepositoryProvider);
    await repo.deleteProduct(id);
    invalidateProductsCache();

    // Update local state
    if (state.hasValue) {
      final currentData = state.value!;
      final list = currentData.products;
      state = AsyncValue.data(
        PaginatedProducts(
          products: list.where((p) => p.id != id).toList(),
          total: currentData.total - 1,
          page: currentData.page,
          totalPages: currentData.totalPages,
        ),
      );
    }
  }
}

final productsProvider =
    AsyncNotifierProvider<ProductsNotifier, PaginatedProducts>(() {
      return ProductsNotifier();
    });

/// Fetches a single product by ID.
final productByIdProvider = FutureProvider.family<Product, String>((
  ref,
  id,
) async {
  final cancelToken = CancelToken();
  ref.onDispose(cancelToken.cancel);
  final repo = ref.read(productRepositoryProvider);
  return repo.getProductById(id, cancelToken: cancelToken);
});

/// Branch inventory for a product.
final productBranchInventoryProvider =
    FutureProvider.family<List<BranchInventory>, String>((
      ref,
      productId,
    ) async {
      final cancelToken = CancelToken();
      ref.onDispose(cancelToken.cancel);
      final repo = ref.read(productRepositoryProvider);
      return repo.getProductBranchInventory(
        productId,
        cancelToken: cancelToken,
      );
    });

/// Derived provider: products filtered by the current status filter.
/// Runs client-side on already-fetched data (no extra API call).
final filteredProductsProvider = Provider<AsyncValue<List<Product>>>((ref) {
  final filter = ref.watch(productStatusFilterProvider);
  return ref.watch(productsProvider).whenData((paginated) {
    final products = paginated.products;
    switch (filter) {
      case ProductStatusFilter.all:
        return products;
      case ProductStatusFilter.available:
        return products.where((p) => p.availableQuantity > 0).toList();
      case ProductStatusFilter.lowStock:
        return products
            .where(
              (p) =>
                  p.availableQuantity > 0 &&
                  p.availableQuantity <= p.lowStockThreshold,
            )
            .toList();
      case ProductStatusFilter.outOfStock:
        return products.where((p) => p.availableQuantity <= 0).toList();
    }
  });
});
