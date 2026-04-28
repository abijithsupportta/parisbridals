import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../models/product.dart';
import '../repositories/product_repository.dart';

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository();
});

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
    final repo = ref.watch(productRepositoryProvider);
    return repo.getProducts(page: _currentPage, search: _currentSearch, branchId: _currentBranchId);
  }

  Future<void> search(String query) async {
    _currentSearch = query;
    _currentPage = 1;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(productRepositoryProvider);
      return repo.getProducts(page: _currentPage, search: _currentSearch, branchId: _currentBranchId);
    });
  }

  Future<void> filterByBranch(String? branchId) async {
    _currentBranchId = branchId;
    _currentPage = 1;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(productRepositoryProvider);
      return repo.getProducts(page: _currentPage, search: _currentSearch, branchId: _currentBranchId);
    });
  }

  Future<void> loadMore() async {
    if (_isLoadingMore || !state.hasValue) return;
    
    final currentData = state.value!;
    if (currentData.page >= currentData.totalPages) return; // No more pages

    _isLoadingMore = true;
    try {
      final repo = ref.read(productRepositoryProvider);
      final nextPageData = await repo.getProducts(page: _currentPage + 1, search: _currentSearch, branchId: _currentBranchId);
      
      _currentPage++;
      state = AsyncValue.data(PaginatedProducts(
        products: [...currentData.products, ...nextPageData.products],
        total: nextPageData.total,
        page: nextPageData.page,
        totalPages: nextPageData.totalPages,
      ));
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> addProduct(Map<String, dynamic> data) async {
    final repo = ref.read(productRepositoryProvider);
    final newProduct = await repo.createProduct(data);
    
    // Update local state immediately
    if (state.hasValue) {
      final currentData = state.value!;
      state = AsyncValue.data(PaginatedProducts(
        products: [newProduct, ...currentData.products],
        total: currentData.total + 1,
        page: currentData.page,
        totalPages: currentData.totalPages,
      ));
    } else {
      ref.invalidateSelf();
    }
  }

  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    final repo = ref.read(productRepositoryProvider);
    final updatedProduct = await repo.updateProduct(id, data);
    
    // Update local state
    if (state.hasValue) {
      final currentData = state.value!;
      final list = currentData.products;
      final index = list.indexWhere((p) => p.id == id);
      if (index != -1) {
        final newList = [...list];
        newList[index] = updatedProduct;
        state = AsyncValue.data(PaginatedProducts(
          products: newList,
          total: currentData.total,
          page: currentData.page,
          totalPages: currentData.totalPages,
        ));
      }
    }
  }

  Future<void> deleteProduct(String id) async {
    final repo = ref.read(productRepositoryProvider);
    await repo.deleteProduct(id);
    
    // Update local state
    if (state.hasValue) {
      final currentData = state.value!;
      final list = currentData.products;
      state = AsyncValue.data(PaginatedProducts(
        products: list.where((p) => p.id != id).toList(),
        total: currentData.total - 1,
        page: currentData.page,
        totalPages: currentData.totalPages,
      ));
    }
  }
}

final productsProvider = AsyncNotifierProvider<ProductsNotifier, PaginatedProducts>(() {
  return ProductsNotifier();
});

final productByIdProvider = FutureProvider.family<Product, String>((ref, id) async {
  final repo = ref.read(productRepositoryProvider);
  return repo.getProductById(id);
});

final productBranchInventoryProvider = FutureProvider.family<List<BranchInventory>, String>((ref, productId) async {
  final repo = ref.read(productRepositoryProvider);
  return repo.getProductBranchInventory(productId);
});
