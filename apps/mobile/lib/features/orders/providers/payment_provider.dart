import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/payment.dart';
import '../repositories/payment_repository.dart';

final paymentRepositoryProvider = Provider<PaymentRepository>((ref) {
  return PaymentRepository();
});

final orderPaymentsProvider = FutureProvider.family<List<Payment>, String>((ref, orderId) async {
  final repository = ref.watch(paymentRepositoryProvider);
  return repository.getPaymentsByOrder(orderId);
});
