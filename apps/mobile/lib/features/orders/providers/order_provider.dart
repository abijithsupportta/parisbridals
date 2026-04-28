import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../repositories/order_repository.dart';

// Repository provider
final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepository();
});

// Orders list provider
final ordersProvider = FutureProvider.autoDispose.family<PaginatedOrders, Map<String, dynamic>>((ref, params) async {
  final repository = ref.watch(orderRepositoryProvider);
  return repository.getOrders(
    page: params['page'] ?? 1,
    limit: params['limit'] ?? 25,
    customerId: params['customerId'],
    branchId: params['branchId'],
    status: params['status'],
    query: params['query'],
    dateFilter: params['dateFilter'],
    dateFrom: params['dateFrom'],
    dateTo: params['dateTo'],
  );
});

// Single order provider
final orderProvider = FutureProvider.family.autoDispose<Order, String>((ref, id) async {
  final repository = ref.watch(orderRepositoryProvider);
  return repository.getOrderById(id);
});

// Order operations - simple function-based approach
class OrderOperations {
  final OrderRepository _repository;

  OrderOperations(this._repository);

  Future<void> createOrder(Map<String, dynamic> body) async {
    await _repository.createOrder(body);
  }

  Future<void> updateOrder(String id, Map<String, dynamic> body) async {
    await _repository.updateOrder(id, body);
  }

  Future<void> deleteOrder(String id) async {
    await _repository.deleteOrder(id);
  }
}

final orderOperationsProvider = Provider<OrderOperations>((ref) {
  final repository = ref.watch(orderRepositoryProvider);
  return OrderOperations(repository);
});
