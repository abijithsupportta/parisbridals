import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/category.dart';
import '../repositories/category_repository.dart';

/// Singleton repository instance.
final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepository();
});

/// Fetches all categories via the repository layer.
final categoriesProvider = AsyncNotifierProvider<CategoriesNotifier, List<Category>>(CategoriesNotifier.new);

class CategoriesNotifier extends AsyncNotifier<List<Category>> {
  @override
  Future<List<Category>> build() async {
    ref.keepAlive();
    final cancelToken = CancelToken();
    ref.onDispose(cancelToken.cancel);
    
    final repo = ref.read(categoryRepositoryProvider);
    return repo.getCategories(cancelToken: cancelToken);
  }

  /// Refreshes the categories list.
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => build());
  }
}

/// Fetches a single category by ID.
final categoryByIdProvider = FutureProvider.family<Category, String>((ref, id) async {
  final cancelToken = CancelToken();
  ref.onDispose(cancelToken.cancel);
  final repo = ref.read(categoryRepositoryProvider);
  return repo.getCategoryById(id, cancelToken: cancelToken);
});

/// Derived provider: Main categories only (no parent).
final mainCategoriesProvider = Provider<AsyncValue<List<Category>>>((ref) {
  return ref.watch(categoriesProvider).whenData(
    (categories) => categories.where((c) => c.parentId == null).toList(),
  );
});

/// Derived provider: Sub-categories for a given parent ID.
final subCategoriesProvider = Provider.family<AsyncValue<List<Category>>, String>((ref, parentId) {
  return ref.watch(categoriesProvider).whenData(
    (categories) => categories.where((c) => c.parentId == parentId).toList(),
  );
});
