import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/customer.dart';
import '../repositories/customer_repository.dart';

// Repository provider
final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepository();
});

// Customers list provider
final customersProvider = FutureProvider.autoDispose.family<PaginatedCustomers, Map<String, dynamic>>((ref, params) async {
  final repository = ref.watch(customerRepositoryProvider);
  return repository.getCustomers(
    page: params['page'] ?? 1,
    limit: params['limit'] ?? 20,
    query: params['query'],
    phone: params['phone'],
    sortBy: params['sortBy'] ?? 'created_at',
    sortOrder: params['sortOrder'] ?? 'desc',
  );
});

// Single customer provider
final customerProvider = FutureProvider.family.autoDispose<Customer, String>((ref, id) async {
  final repository = ref.watch(customerRepositoryProvider);
  return repository.getCustomerById(id);
});

// Customer operations provider - simple function-based approach
class CustomerOperations {
  final CustomerRepository _repository;

  CustomerOperations(this._repository);

  Future<void> createCustomer(Map<String, dynamic> body) async {
    await _repository.createCustomer(body);
  }

  Future<void> updateCustomer(String id, Map<String, dynamic> body) async {
    await _repository.updateCustomer(id, body);
  }

  Future<void> deleteCustomer(String id) async {
    await _repository.deleteCustomer(id);
  }
}

final customerOperationsProvider = Provider<CustomerOperations>((ref) {
  final repository = ref.watch(customerRepositoryProvider);
  return CustomerOperations(repository);
});
